import { chromium } from 'playwright';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const COOKIES_DIR = join(process.cwd(), 'cookies');

function getCookiesPath(source) {
  if (!existsSync(COOKIES_DIR)) mkdirSync(COOKIES_DIR, { recursive: true });
  return join(COOKIES_DIR, `${source}.json`);
}

export function hasCookies(source) {
  return existsSync(getCookiesPath(source));
}

export async function launchBrowser(source, headless = true) {
  const hasSaved = hasCookies(source);
  const actualHeadless = hasSaved ? headless : false;

  const browser = await chromium.launch({
    headless: actualHeadless,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const context = await browser.newContext();

  const cookiesPath = getCookiesPath(source);
  if (existsSync(cookiesPath)) {
    try {
      const cookies = JSON.parse(readFileSync(cookiesPath, 'utf8'));
      await context.addCookies(cookies);
      console.log(`[${source}] Loaded saved cookies`);
    } catch (e) {
      console.log(`[${source}] Failed to load cookies: ${e.message}`);
    }
  }

  context._browser = browser;
  return context;
}

export async function saveCookies(context, source) {
  try {
    const cookies = await context.cookies();
    writeFileSync(getCookiesPath(source), JSON.stringify(cookies, null, 2));
    console.log(`[${source}] Cookies saved`);
  } catch (e) {
    console.log(`[${source}] Failed to save cookies: ${e.message}`);
  }
}

export async function closeBrowser(context, source) {
  if (source) {
    await saveCookies(context, source);
  }
  await context.close();
  if (context._browser) await context._browser.close();
}

export async function isLoggedIn(page, source) {
  const url = page.url();
  if (source === 'raneen') {
    if (url.includes('login') || url.includes('signin')) return false;
    const has = await page.$('table, .sidebar, nav, .menu, .shipment, [class*="order"], [class*="dashboard"]');
    return !!has;
  }
  if (source === 'chichomz') {
    if (url.includes('login')) return false;
    const has = await page.$('table, .sidebar, nav, .menu, [class*="order"], [class*="item"]');
    return !!has;
  }
  if (source === 'mostwda3' || source === 'saraydecore') {
    if (url.includes('wp-login')) return false;
    const has = await page.$('#adminmenu, .wp-admin, #wpadminbar');
    return !!has;
  }
  return true;
}
