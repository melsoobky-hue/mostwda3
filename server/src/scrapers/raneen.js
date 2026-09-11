/**
 * Raneen scraper — raneen.com seller marketplace
 *
 * Strategy (fastest → slowest, tries in order):
 *  1. Saved cookies still valid  → headless, no login needed
 *  2. Saved credentials in DB    → headless auto-login, save cookies, scrape
 *  3. No credentials at all      → throw (user must configure first)
 *
 * Speed optimisations:
 *  - Block images, fonts, analytics at network level
 *  - domcontentloaded instead of networkidle
 *  - Single $$eval batch extraction per page
 *  - JS-click pagination (300ms settle)
 */
import { chromium } from 'playwright';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getSetting, upsertOrder } from '../services/database.js';

const SHIPMENTS_URL = 'https://www.raneen.com/ar/marketplace/seller/shipments/';
const LOGIN_URL     = 'https://www.raneen.com/ar/customer/account/login/';
const COOKIES_DIR   = join(process.cwd(), 'cookies');

const BLOCKED_TYPES = new Set(['image', 'media', 'font', 'other']);
const BLOCKED_HOSTS = ['google-analytics', 'googletagmanager', 'facebook', 'hotjar', 'clarity', 'gtm.js'];

// Arabic → English status map
const STATUS_MAP = {
  'قيد الانتظار':    'Pending',
  'قيد التنفيذ':     'Processing',
  'تم شحنه':         'Shipped',
  'تم التوصيل':      'Delivered',
  'فشل التوصيل':     'Failed',
  'لم يتم الاستلام': 'Not Received',
  'تحت التحقيق':     'Under Investigation',
  'تم الالغاء':      'Cancelled',
  'مرتجع':           'Returned',
  'جاري المراجعة':   'Under Review',
};

// ── Cookie helpers ─────────────────────────────────────────────────────────

function cookiePath(source) {
  if (!existsSync(COOKIES_DIR)) mkdirSync(COOKIES_DIR, { recursive: true });
  return join(COOKIES_DIR, `${source}.json`);
}

function loadCookies(source) {
  try {
    const p = cookiePath(source);
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  } catch (_) {}
  return null;
}

function saveCookies(cookies, source) {
  try { writeFileSync(cookiePath(source), JSON.stringify(cookies, null, 2)); } catch (_) {}
}

// ── Browser helpers ────────────────────────────────────────────────────────

async function buildContext(headless = true) {
  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ar-EG',
  });
  ctx._browser = browser;

  // Block heavy resources
  await ctx.route('**/*', (route) => {
    const req  = route.request();
    const type = req.resourceType();
    const url  = req.url();
    if (BLOCKED_TYPES.has(type)) return route.abort();
    if (BLOCKED_HOSTS.some(h => url.includes(h))) return route.abort();
    route.continue();
  });

  return ctx;
}

async function destroyContext(ctx) {
  try { await ctx.close(); } catch (_) {}
  try { if (ctx._browser) await ctx._browser.close(); } catch (_) {}
}

/** Returns true if the current page is an authenticated seller dashboard */
async function checkLoggedIn(page) {
  const url = page.url();
  if (url.includes('login') || url.includes('signin')) return false;
  // Look for seller-specific elements
  const el = await page.$(
    '.seller-nav, .vendor-dashboard, table tbody tr, ' +
    '[class*="shipment"], [class*="order"], [class*="seller"]'
  );
  return !!el;
}

/** Headless auto-login using stored email + password */
async function autoLogin(page, log) {
  const email    = getSetting('raneen_email');
  const password = getSetting('raneen_password');
  if (!email || !password) return false;

  log('Attempting auto-login with stored credentials…');

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(400);

    // Email / username field
    const emailSel = [
      'input[name="login[username]"]',
      'input[id="email"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="بريد" i]',
    ].join(', ');
    await page.waitForSelector(emailSel, { timeout: 8000 });
    await page.fill(emailSel, email);

    // Password field
    const passSel = 'input[type="password"], input[name="login[password]"], input[name="password"]';
    await page.fill(passSel, password);

    // Submit button
    const submitSel = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("تسجيل الدخول")',
      'button:has-text("دخول")',
      'button:has-text("Login")',
      '.action.login',
    ].join(', ');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
      page.click(submitSel),
    ]);

    await page.waitForTimeout(500);

    // Navigate to shipments to verify
    await page.goto(SHIPMENTS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(400);

    const ok = await checkLoggedIn(page);
    if (ok) log('Auto-login successful ✓');
    else    log('Auto-login: page loaded but could not verify seller session');
    return ok;
  } catch (e) {
    log(`Auto-login failed: ${e.message}`);
    return false;
  }
}

// ── Core scraping ──────────────────────────────────────────────────────────

async function scrapeAllShipments(page, log) {
  log('Navigating to shipments…');
  await page.goto(SHIPMENTS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for table or shipment list
  try {
    await page.waitForSelector('table tbody tr, .shipment-row, [class*="shipment-item"]', { timeout: 15000 });
  } catch {
    log('Warning: expected table not found, trying to proceed anyway…');
  }

  let total   = 0;
  let pageNum = 1;

  while (true) {
    log(`Scraping page ${pageNum}…`);

    const shipments = await page.$$eval(
      'table tbody tr, .shipment-row',
      (rows, statusMap) => {
        return rows
          .map(row => {
            const cells = Array.from(row.querySelectorAll('td, .cell'));
            if (cells.length < 3) return null;

            const text    = (i) => cells[i]?.innerText?.trim() ?? '';
            const numFrom = (s) => { const n = parseFloat(String(s).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

            // Try to find shipment / order ID anywhere in the row
            const rowText = row.innerText || '';
            const idMatch = rowText.match(/\b(\d{6,})\b/);
            if (!idMatch) return null;

            const shipmentId   = idMatch[1];
            const date         = text(1) || text(0);
            const customerName = text(2);
            const productCode  = text(3);
            const qty          = parseInt(text(4)) || 1;
            const statusAr     = text(5) || text(cells.length - 1);
            const governorate  = text(6);
            const deliveryZone = text(7);
            const value        = numFrom(text(8));
            const cod          = numFrom(text(9));
            const phone        = rowText.match(/\b01\d{9}\b/)?.[0] || '';
            const isDelayed    = rowText.includes('تأخير') || rowText.includes('Delay') || statusAr.includes('متأخر');

            return {
              shipmentId, date, customerName, productCode, qty,
              statusAr, governorate, deliveryZone, value, cod, phone, isDelayed,
            };
          })
          .filter(Boolean);
      },
      STATUS_MAP
    );

    for (const s of shipments) {
      upsertOrder({
        source:               'raneen',
        source_order_id:      s.shipmentId,
        customer_name:        s.customerName,
        customer_phone:       s.phone,
        customer_governorate: s.governorate,
        customer_delivery_zone: s.deliveryZone,
        product_name:         s.productCode,
        product_sku:          s.productCode,
        quantity:             s.qty,
        unit_price:           s.value,
        total_price:          s.value,
        cod_amount:           s.cod,
        status:               STATUS_MAP[s.statusAr] || s.statusAr,
        status_ar:            s.statusAr,
        order_date:           s.date,
        is_delayed:           s.isDelayed ? 1 : 0,
        channel:              'raneen',
        raw_data:             JSON.stringify(s),
      });
      total++;
    }

    log(`Page ${pageNum}: ${shipments.length} shipments (total ${total})`);

    // ── Pagination via JS click ──────────────────────────────────────────
    const nextClicked = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll('a, button, li, span')].filter(el => {
        const t    = el.innerText?.trim();
        const aria = el.getAttribute('aria-label') || '';
        const cls  = el.className || '';
        return (
          t === 'التالي' || t === 'Next' || t === '›' || t === '>' ||
          aria.includes('next') || aria.includes('التالي') ||
          (cls.includes('next') && !cls.includes('disabled'))
        );
      });
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && !el.closest('[class*="disabled"]') && !el.hasAttribute('disabled')) {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (!nextClicked) break;

    // Settle — faster than networkidle
    await page.waitForTimeout(700);
    await page.waitForFunction(
      () => document.querySelectorAll('table tbody tr, .shipment-row').length > 0,
      { timeout: 10000 }
    ).catch(() => {});

    pageNum++;
    if (pageNum > 50) { log('Reached 50-page safety limit'); break; }
  }

  return { orders: total };
}

// ── Public entry point ─────────────────────────────────────────────────────

export async function scrapeRaneen(onProgress) {
  const log = (msg) => { console.log(`[Raneen] ${msg}`); onProgress?.(msg); };

  const savedCookies = loadCookies('raneen');
  const hasCreds     = !!(getSetting('raneen_email') && getSetting('raneen_password'));

  if (!savedCookies && !hasCreds) {
    throw new Error('No credentials or saved session. Enter email/password in Sync → Credentials.');
  }

  log('Starting scrape…');
  const ctx  = await buildContext(true);
  const page = await ctx.newPage();

  try {
    // ── Try saved cookies first ──────────────────────────────────────────
    if (savedCookies) {
      log('Restoring saved session…');
      await ctx.addCookies(savedCookies);
      await page.goto(SHIPMENTS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(400);

      if (await checkLoggedIn(page)) {
        log('Session valid — skipping login');
        const result = await scrapeAllShipments(page, log);
        saveCookies(await ctx.cookies(), 'raneen');
        log(`Done — ${result.orders} shipments synced`);
        return result;
      }
      log('Session expired — attempting re-login…');
    }

    // ── Auto-login ───────────────────────────────────────────────────────
    const loggedIn = await autoLogin(page, log);
    if (!loggedIn) {
      throw new Error('Login failed. Check credentials in Sync → Credentials, or use "Login via Browser".');
    }
    saveCookies(await ctx.cookies(), 'raneen');

    const result = await scrapeAllShipments(page, log);
    log(`Done — ${result.orders} shipments synced`);
    return result;
  } finally {
    await destroyContext(ctx);
  }
}

/**
 * Open a VISIBLE browser for interactive login (MFA / captcha fallback).
 * Saves cookies on success.
 */
export async function loginRaneenInteractive(onProgress) {
  const log = (msg) => { console.log(`[Raneen:interactive] ${msg}`); onProgress?.(msg); };
  log('Opening browser for interactive login…');

  const ctx  = await buildContext(false); // visible
  const page = await ctx.newPage();

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Pre-fill if credentials stored
    const email    = getSetting('raneen_email');
    const password = getSetting('raneen_password');
    if (email && password) {
      try {
        await page.fill('input[type="email"], input[name="login[username]"]', email);
        await page.fill('input[type="password"]',  password);
        log('Credentials pre-filled — submit the form to continue');
      } catch (_) {}
    } else {
      log('No credentials stored — fill in the form manually');
    }

    log('Waiting for you to complete login… (120s timeout)');
    await page.waitForURL(
      url => !url.includes('login') && !url.includes('signin'),
      { timeout: 120_000 }
    );
    await page.waitForTimeout(800);

    // Navigate to shipments to confirm seller access
    await page.goto(SHIPMENTS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(500);

    if (await checkLoggedIn(page)) {
      saveCookies(await ctx.cookies(), 'raneen');
      log('Login successful! Session saved ✓');
      return { success: true };
    }
    throw new Error('Logged in but seller dashboard not accessible — check account permissions');
  } finally {
    await destroyContext(ctx);
  }
}
