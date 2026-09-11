/**
 * Chichomz scraper — vendorschichomz.com
 *
 * Strategy (fastest → slowest, tries in order):
 *  1. Saved cookies still valid  → headless, no login needed
 *  2. Saved credentials in DB    → headless auto-login, save cookies, scrape
 *  3. No credentials at all      → skip (user must configure credentials first)
 *
 * Speed optimisations:
 *  - Block images, fonts, analytics, ads at the network level
 *  - domcontentloaded instead of networkidle
 *  - Single $$eval call per page (no per-row async)
 *  - 500ms settle instead of 2-3s
 */
import { chromium } from 'playwright';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getSetting, setSetting, upsertOrder } from '../services/database.js';

const ORDERS_URL = 'https://new.vendorschichomz.com/items';
const LOGIN_URL  = 'https://new.vendorschichomz.com/login';
const COOKIES_DIR = join(process.cwd(), 'cookies');

// ── Resource blocking — dramatically speeds up page loads ──────────────────
const BLOCKED_TYPES = new Set(['image', 'media', 'font', 'other']);
const BLOCKED_HOSTS = ['google-analytics', 'googletagmanager', 'facebook', 'hotjar', 'clarity'];

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
  try {
    writeFileSync(cookiePath(source), JSON.stringify(cookies, null, 2));
  } catch (_) {}
}

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
    viewport: { width: 1280, height: 800 },
  });
  ctx._browser = browser;

  // Block heavy resources to speed up loads
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

async function destroyContext(ctx, saveCookiesFor) {
  try {
    if (saveCookiesFor) {
      const cookies = await ctx.cookies();
      saveCookies(cookies, saveCookiesFor);
    }
    await ctx.close();
    if (ctx._browser) await ctx._browser.close();
  } catch (_) {}
}

/** Check whether the current page looks like a logged-in dashboard */
async function checkLoggedIn(page) {
  const url = page.url();
  if (url.includes('/login')) return false;
  // Presence of the items table or nav sidebar
  const el = await page.$('table tbody tr, nav .menu-item, [class*="sidebar"]');
  return !!el;
}

/** Attempt headless login with stored credentials. Returns true on success. */
async function autoLogin(page, onProgress) {
  const email    = getSetting('chichomz_email');
  const password = getSetting('chichomz_password');
  if (!email || !password) return false;

  onProgress?.('Attempting auto-login with stored credentials…');

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(400);

  try {
    // Fill email
    const emailSel = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
    await page.waitForSelector(emailSel, { timeout: 8000 });
    await page.fill(emailSel, email);

    // Fill password
    const passSel = 'input[type="password"], input[name="password"]';
    await page.fill(passSel, password);

    // Submit
    const submitSel = 'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("تسجيل")';
    await page.click(submitSel);

    // Wait for redirect away from login
    await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(500);

    const ok = await checkLoggedIn(page);
    if (ok) onProgress?.('Auto-login successful ✓');
    else    onProgress?.('Auto-login: redirected but could not verify session');
    return ok;
  } catch (e) {
    onProgress?.(`Auto-login failed: ${e.message}`);
    return false;
  }
}

/** Full scrape — called after we're confirmed logged in */
async function scrapeAllOrders(page, onProgress) {
  onProgress?.('Navigating to orders…');
  await page.goto(ORDERS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the table
  try {
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
  } catch {
    // Maybe a different layout
    onProgress?.('Warning: table not found, trying fallback selector…');
    await page.waitForSelector('table, [class*="item"], [class*="order"]', { timeout: 10000 });
  }

  let totalInserted = 0;
  let pageNum = 1;

  while (true) {
    onProgress?.(`Scraping page ${pageNum}…`);

    const orders = await page.$$eval('table tbody tr', (rows) => {
      return rows
        .map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 10) return null;

          const text   = (idx) => cells[idx]?.innerText?.trim() ?? '';
          const num    = (idx) => { const n = parseFloat(text(idx).replace(/[^0-9.-]/g, '')); return isNaN(n) ? 0 : n; };
          const int    = (idx) => parseInt(text(idx)) || 0;

          const itemId     = text(1) || text(0);
          const orderRaw   = text(3);
          const orderId    = orderRaw.match(/#?(\d+)/)?.[1] || orderRaw;
          const title      = text(4);
          const price      = num(5);
          const cost       = num(6);
          const qty        = int(7) || 1;
          const shipping   = num(8);
          const cod        = num(9);
          const assignedAt = text(10);
          const expectedAt = text(11);
          const status     = text(12) || text(cells.length - 1);

          if (!itemId) return null;

          // Parse mirror info from title
          const sizeMatch = title.match(/(\d{2,3})\s*[xX×*]\s*(\d{2,3})/);
          const typeMatch = title.match(/(مرايا|mirror|ليد|led|سبت|سامبا|touch|تاتش|مفرغة|دائري|مربع)/i);

          return {
            itemId, orderId, title, price, cost, qty,
            shipping, cod, assignedAt, expectedAt, status,
            mirrorType: typeMatch?.[1] || '',
            mirrorDimensions: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}` : '',
            mirrorSize: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}cm` : '',
          };
        })
        .filter(Boolean);
    });

    for (const o of orders) {
      const isDelayed = /delay|متأخر|تأخير/i.test(o.status + ' ' + o.expectedAt);
      upsertOrder({
        source:            'chichomz',
        source_order_id:   o.itemId,
        customer_name:     o.title || '',
        product_name:      o.title || '',
        product_sku:       o.itemId,
        quantity:          o.qty,
        unit_price:        o.price,
        total_price:       o.price * o.qty,
        cost:              o.cost * o.qty,
        shipping_cost:     o.shipping,
        cod_amount:        o.cod,
        status:            o.status || '',
        order_date:        o.assignedAt,
        expected_delivery_date: o.expectedAt,
        is_delayed:        isDelayed ? 1 : 0,
        mirror_type:       o.mirrorType,
        mirror_dimensions: o.mirrorDimensions,
        mirror_size:       o.mirrorSize,
        channel:           'chichomz',
        raw_data:          JSON.stringify(o),
      });
      totalInserted++;
    }

    onProgress?.(`Page ${pageNum}: ${orders.length} orders (total ${totalInserted})`);

    // ── Pagination ──────────────────────────────────────────────────────────
    // Try multiple next-button patterns
    const nextClicked = await page.evaluate(() => {
      const candidates = [
        ...document.querySelectorAll('button, a, li'),
      ].filter(el => {
        const t = el.innerText?.trim().toLowerCase();
        const aria = el.getAttribute('aria-label')?.toLowerCase() || '';
        const cls  = el.className?.toLowerCase() || '';
        return (
          t === 'next' || t === 'التالي' || t === '>' || t === '›' ||
          aria.includes('next') || aria.includes('التالي') ||
          (cls.includes('next') && !cls.includes('disabled') && !el.disabled)
        );
      });

      // Pick the first visible, enabled candidate
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && !el.disabled && !el.closest('.disabled')) {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (!nextClicked) break;

    // Wait for new rows to load — faster than networkidle
    await page.waitForTimeout(600);
    await page.waitForFunction(
      (prev) => {
        const rows = document.querySelectorAll('table tbody tr');
        return rows.length > 0;
      },
      orders.length,
      { timeout: 10000 }
    ).catch(() => {});

    pageNum++;
    if (pageNum > 50) { onProgress?.('Reached 50-page safety limit'); break; } // safety cap
  }

  return { orders: totalInserted };
}

// ── Public entry point ──────────────────────────────────────────────────────

export async function scrapeChichomz(onProgress) {
  const log = (msg) => { console.log(`[Chichomz] ${msg}`); onProgress?.(msg); };

  const savedCookies = loadCookies('chichomz');
  const hasCreds     = !!(getSetting('chichomz_email') && getSetting('chichomz_password'));

  if (!savedCookies && !hasCreds) {
    throw new Error('No credentials or saved session. Enter email/password in the Sync settings.');
  }

  log('Starting scrape…');
  const ctx  = await buildContext(true); // always headless
  const page = await ctx.newPage();

  try {
    // ── Try saved cookies first ────────────────────────────────────────────
    if (savedCookies) {
      log('Restoring saved session…');
      await ctx.addCookies(savedCookies);
      await page.goto(ORDERS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(400);

      if (await checkLoggedIn(page)) {
        log('Session valid — skipping login');
        const result = await scrapeAllOrders(page, log);
        // Refresh cookies (they may have a new expiry)
        saveCookies(await ctx.cookies(), 'chichomz');
        log(`Done — ${result.orders} orders synced`);
        return result;
      }
      log('Session expired — attempting re-login…');
    }

    // ── Auto-login with credentials ────────────────────────────────────────
    const loggedIn = await autoLogin(page, log);
    if (!loggedIn) {
      throw new Error('Login failed. Check credentials in Sync → Credentials, or use "Login via Browser".');
    }
    saveCookies(await ctx.cookies(), 'chichomz');

    const result = await scrapeAllOrders(page, log);
    log(`Done — ${result.orders} orders synced`);
    return result;
  } finally {
    await destroyContext(ctx, null); // cookies already saved above
  }
}

/**
 * Open a VISIBLE browser for interactive login (for MFA / captcha cases).
 * Saves cookies on success. Used by the UI "Login via Browser" button.
 */
export async function loginChichomzInteractive(onProgress) {
  const log = (msg) => { console.log(`[Chichomz:interactive] ${msg}`); onProgress?.(msg); };
  log('Opening browser for interactive login…');

  const ctx  = await buildContext(false); // visible!
  const page = await ctx.newPage();

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Pre-fill credentials if available
    const email    = getSetting('chichomz_email');
    const password = getSetting('chichomz_password');
    if (email && password) {
      try {
        await page.fill('input[type="email"], input[name="email"]', email);
        await page.fill('input[type="password"]', password);
        log('Credentials pre-filled — submit the form to continue');
      } catch (_) {}
    }

    log('Waiting for you to log in… (120s timeout)');

    // Wait until we leave the login page
    await page.waitForURL(url => !url.includes('/login'), { timeout: 120_000 });
    await page.waitForTimeout(1000);

    if (await checkLoggedIn(page)) {
      saveCookies(await ctx.cookies(), 'chichomz');
      log('Login successful! Session saved ✓');
      return { success: true };
    }
    throw new Error('Could not verify login after redirect');
  } finally {
    await destroyContext(ctx, null);
  }
}
