import { launchBrowser, closeBrowser, isLoggedIn, hasCookies } from './browser.js';
import { upsertOrder } from '../services/database.js';

const ORDERS_URL = 'https://new.vendorschichomz.com/items';
const LOGIN_URL = 'https://new.vendorschichomz.com/login';

export async function scrapeChichomz() {
  const hasSavedCookies = hasCookies('chichomz');
  console.log(`[Chichomz] Starting scrape (${hasSavedCookies ? 'saved session' : 'first run - login needed'})...`);

  const context = await launchBrowser('chichomz', hasSavedCookies);
  const page = await context.newPage();

  try {
    await page.goto(ORDERS_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    if (!(await isLoggedIn(page, 'chichomz'))) {
      console.log('[Chichomz] Not logged in. Opening browser for login...');
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });
      for (let i = 0; i < 120; i++) {
        await page.waitForTimeout(3000);
        if (await isLoggedIn(page, 'chichomz')) { console.log('[Chichomz] Login detected!'); break; }
      }
      await page.goto(ORDERS_URL, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);
    }

    await scrapeOrders(page);
    console.log('[Chichomz] Scrape complete');
  } catch (error) {
    console.error('[Chichomz] Scrape failed:', error.message);
    throw error;
  } finally {
    await closeBrowser(context, 'chichomz');
  }
}

async function scrapeOrders(page) {
  console.log('[Chichomz] Scraping orders...');
  await page.waitForSelector('table', { timeout: 15000 });
  await page.waitForTimeout(1000);

  let pageNum = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`[Chichomz] Scraping page ${pageNum}...`);

    const orders = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 10) return;

        const get = (idx) => cells[idx]?.textContent?.trim() || '';
        const getNum = (idx) => {
          const t = get(idx);
          const n = parseFloat(t.replace(/[^0-9.-]/g, ''));
          return isNaN(n) ? 0 : n;
        };

        const itemId = get(1);
        const orderIdRaw = get(3);
        const orderIdMatch = orderIdRaw.match(/#?(\d+)/);
        const orderId = orderIdMatch ? orderIdMatch[1] : orderIdRaw;

        const title = get(4);
        const price = getNum(5);
        const cost = getNum(6);
        const quantity = parseInt(get(7)) || 1;
        const shipping = getNum(8);
        const cod = getNum(9);
        const assignedDate = get(10);
        const expectedDelivery = get(11);
        const status = get(12);

        const sizeMatch = title.match(/(\d+)\s*[xX×]\s*(\d+)/);
        const typeMatch = title.match(/(مرايا|mirror|ليد|LED|سبت|سامبا|touch|تاتش|مفرغة)/i);

        results.push({
          itemId,
          orderId,
          title,
          price,
          cost,
          quantity,
          shipping,
          cod,
          assignedDate,
          expectedDelivery,
          status,
          mirrorType: typeMatch?.[1] || '',
          mirrorDimensions: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}` : '',
          mirrorSize: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}cm` : '',
        });
      });
      return results;
    });

    for (const order of orders) {
      if (!order.itemId) continue;

      const isDelayed = order.status?.toLowerCase().includes('delay') ||
        order.expectedDelivery?.toLowerCase().includes('remaining');

      upsertOrder({
        source: 'chichomz',
        source_order_id: order.itemId,
        customer_name: order.title || '',
        product_name: order.title || '',
        product_sku: order.itemId || '',
        quantity: order.quantity,
        unit_price: order.price,
        total_price: order.price * order.quantity,
        cost: order.cost * order.quantity,
        shipping_cost: order.shipping,
        cod_amount: order.cod,
        status: order.status || '',
        order_date: order.assignedDate,
        expected_delivery_date: order.expectedDelivery,
        is_delayed: isDelayed ? 1 : 0,
        mirror_type: order.mirrorType,
        mirror_dimensions: order.mirrorDimensions,
        mirror_size: order.mirrorSize,
        channel: 'chichomz',
        raw_data: JSON.stringify(order),
      });
    }

    console.log(`[Chichomz] Found ${orders.length} orders on page ${pageNum}`);

    let clicked = false;
    try {
      const nextBtn = await page.$('button:has-text("Next"):visible, a:has-text("Next"):visible, [aria-label="Next"]:visible, button:has-text("التالي"):visible, a:has-text("التالي"):visible, .pagination .next:not(.disabled):visible, li.next a:visible');
      if (nextBtn) {
        await nextBtn.click({ timeout: 5000 });
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');
        pageNum++;
        clicked = true;
      }
    } catch (_) {}
    if (!clicked) hasMore = false;
  }
  console.log(`[Chichomz] Total pages scraped: ${pageNum}`);
}

function parseMirrorInfo(title) {
  if (!title) return {};
  const sizeMatch = title.match(/(\d+)\s*[xX×]\s*(\d+)/);
  const typeMatch = title.match(/(مرايا|mirror|ليد|LED|سبت|سامبا|touch|تاتش|مفرغة)/i);
  return {
    type: typeMatch?.[1] || '',
    dimensions: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}` : '',
    size: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}cm` : '',
  };
}
