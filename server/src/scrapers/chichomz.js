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
  await page.waitForSelector('table, .table, [role="table"], .order-item, .item-row', { timeout: 15000 });

  let pageNum = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`[Chichomz] Scraping page ${pageNum}...`);

    const orders = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr, .table tbody tr, [role="row"], .item-row, tr[data-id], div[class*="order"], div[class*="item"]');

      if (rows.length === 0) {
        const cards = document.querySelectorAll('[class*="card"], [class*="order"], [class*="item"]');
        cards.forEach(card => {
          const text = card.innerText;
          if (!text || text.length < 10) return;
          const idMatch = text.match(/#?(\d{5,})/);
          const priceMatch = text.match(/EGP\s*([\d,]+\.?\d*)/g);
          const dateMatch = text.match(/\w{3}\s+\d{1,2},?\s+\d{4}/);
          const qtyMatch = text.match(/(?:Quantity|Qty|الكمية)[:\s]*(\d+)/i);
          if (idMatch) {
            results.push({
              orderId: idMatch[1], title: card.querySelector('h3, h4, .title')?.textContent?.trim() || '',
              price: priceMatch?.[0] || '', cost: priceMatch?.[1] || '', quantity: qtyMatch?.[1] || '1',
              shipping: '', cod: '', assignedDate: dateMatch?.[0] || '', expectedDelivery: '',
              status: card.querySelector('[class*="status"], .badge')?.textContent?.trim() || '',
              rawText: text.substring(0, 500)
            });
          }
        });
        return results;
      }

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;
        const text = row.innerText;
        const idMatch = text.match(/#?(\d{5,})/);
        if (idMatch) {
          results.push({
            orderId: idMatch[1], title: cells[1]?.textContent?.trim() || cells[2]?.textContent?.trim() || '',
            price: cells[2]?.textContent?.trim() || '', cost: cells[3]?.textContent?.trim() || '',
            quantity: cells[4]?.textContent?.trim() || '1', shipping: cells[5]?.textContent?.trim() || '',
            cod: cells[6]?.textContent?.trim() || '', assignedDate: cells[7]?.textContent?.trim() || '',
            expectedDelivery: cells[8]?.textContent?.trim() || '',
            status: cells[9]?.textContent?.trim() || cells[cells.length - 1]?.textContent?.trim() || '',
            rawText: text.substring(0, 500)
          });
        }
      });
      return results;
    });

    for (const order of orders) {
      const priceNum = parseFloat(order.price.replace(/[^0-9.]/g, '')) || 0;
      const costNum = parseFloat(order.cost.replace(/[^0-9.]/g, '')) || 0;
      const shippingNum = parseFloat(order.shipping.replace(/[^0-9.]/g, '')) || 0;
      const codNum = parseFloat(order.cod.replace(/[^0-9.]/g, '')) || 0;
      const qty = parseInt(order.quantity) || 1;
      const isDelayed = order.status?.toLowerCase().includes('delay') || order.rawText?.toLowerCase().includes('delaying');
      const mirrorInfo = parseMirrorInfo(order.title);

      upsertOrder({
        source: 'chichomz', source_order_id: order.orderId, customer_name: order.title,
        product_name: order.title, product_sku: order.title,
        quantity: qty, unit_price: priceNum, total_price: priceNum * qty,
        cost: costNum * qty, shipping_cost: shippingNum, cod_amount: codNum,
        status: order.status, order_date: order.assignedDate,
        expected_delivery_date: order.expectedDelivery, is_delayed: isDelayed ? 1 : 0,
        mirror_type: mirrorInfo.type, mirror_dimensions: mirrorInfo.dimensions,
        mirror_size: mirrorInfo.size, channel: 'chichomz', raw_data: order
      });
    }

    console.log(`[Chichomz] Found ${orders.length} orders on page ${pageNum}`);
    const nextBtn = await page.$('button:has-text("Next"), a:has-text("Next"), [aria-label="Next"], button:has-text("التالي"), a:has-text("التالي"), .pagination .next:not(.disabled), li.next a');
    const isDisabled = await page.$('button:has-text("Next")[disabled], button:has-text("التالي")[disabled]');
    if (nextBtn && !isDisabled) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
      pageNum++;
    } else {
      hasMore = false;
    }
  }
  console.log(`[Chichomz] Total pages scraped: ${pageNum}`);
}

function parseMirrorInfo(title) {
  if (!title) return {};
  const sizeMatch = title.match(/(\d+)\s*[xX×]\s*(\d+)/);
  const typeMatch = title.match(/(مرايا|mirror|ليد|LED|سبت|سامبا|_touch|تاتش|مفرغة)/i);
  return { type: typeMatch?.[1] || '', dimensions: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}` : '', size: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}cm` : '' };
}
