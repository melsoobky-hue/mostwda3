import { launchBrowser, closeBrowser, isLoggedIn, hasCookies } from './browser.js';
import { upsertOrder } from '../services/database.js';

const SHIPMENTS_URL = 'https://www.raneen.com/ar/marketplace/seller/shipments/';
const LOGIN_URL = 'https://www.raneen.com/ar/login';

export async function scrapeRaneen() {
  const hasSavedCookies = hasCookies('raneen');
  console.log(`[Raneen] Starting scrape (${hasSavedCookies ? 'saved session' : 'first run - login needed'})...`);

  const context = await launchBrowser('raneen', hasSavedCookies);
  const page = await context.newPage();

  try {
    await page.goto(SHIPMENTS_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    if (!(await isLoggedIn(page, 'raneen'))) {
      console.log('[Raneen] Not logged in. Opening browser for login...');
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });
      for (let i = 0; i < 120; i++) {
        await page.waitForTimeout(3000);
        if (await isLoggedIn(page, 'raneen')) { console.log('[Raneen] Login detected!'); break; }
      }
    }

    await scrapeShipments(page);
    console.log('[Raneen] Scrape complete');
  } catch (error) {
    console.error('[Raneen] Scrape failed:', error.message);
    throw error;
  } finally {
    await closeBrowser(context, 'raneen');
  }
}

async function scrapeShipments(page) {
  console.log('[Raneen] Scraping shipments...');
  await page.waitForSelector('table, .table, [role="table"], .shipment-item', { timeout: 15000 });

  let pageNum = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`[Raneen] Scraping page ${pageNum}...`);

    const shipments = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr, .table tbody tr, [role="row"]');

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;
        const text = row.innerText;
        const idMatch = text.match(/(\d{8,})/);
        if (idMatch) {
          results.push({
            shipmentId: idMatch[1], date: cells[1]?.textContent?.trim() || '',
            customerName: cells[2]?.textContent?.trim() || '',
            productCode: cells[3]?.textContent?.trim() || '',
            quantity: cells[4]?.textContent?.trim() || '1',
            status: cells[5]?.textContent?.trim() || cells[cells.length - 1]?.textContent?.trim() || '',
            governorate: cells[6]?.textContent?.trim() || '',
            deliveryZone: cells[7]?.textContent?.trim() || '',
            shipmentValue: cells[8]?.textContent?.trim() || '',
            codAmount: cells[9]?.textContent?.trim() || '',
            isDelayed: text.includes('تأخير') || text.includes('Delaying'),
            phone: text.match(/(\d{11})/)?.[1] || '', rawText: text.substring(0, 500)
          });
        }
      });
      return results;
    });

    for (const s of shipments) {
      const valueNum = parseFloat(s.shipmentValue.replace(/[^0-9.]/g, '')) || 0;
      const codNum = parseFloat(s.codAmount.replace(/[^0-9.]/g, '')) || 0;
      const qty = parseInt(s.quantity) || 1;
      const isDelayed = s.isDelayed || s.status?.includes('متأخر') || s.status?.includes('تأخير');

      const statusMap = {
        'قيد الانتظار': 'Pending', 'قيد التنفيذ': 'Processing', 'تم شحنه': 'Shipped',
        'تم التوصيل': 'Delivered', 'فشل التوصيل': 'Failed', 'لم يتم الاستلام': 'Not Received',
        'تحت التحقيق': 'Under Investigation', 'تم الالغاء': 'Cancelled'
      };

      upsertOrder({
        source: 'raneen', source_order_id: s.shipmentId, customer_name: s.customerName,
        customer_phone: s.phone, customer_governorate: s.governorate,
        customer_delivery_zone: s.deliveryZone, product_name: s.productCode,
        product_sku: s.productCode, quantity: qty, unit_price: valueNum,
        total_price: valueNum, cod_amount: codNum,
        status: statusMap[s.status] || s.status, status_ar: s.status,
        order_date: s.date, is_delayed: isDelayed ? 1 : 0,
        channel: 'raneen', raw_data: s
      });
    }

    console.log(`[Raneen] Found ${shipments.length} shipments on page ${pageNum}`);
    const nextBtn = await page.$('button:has-text("التالي"), button:has-text("Next"), a:has-text("التالي"), a:has-text("Next"), .pagination .next:not(.disabled), li.next a');
    const isDisabled = await page.$('button:has-text("التالي")[disabled], button:has-text("Next")[disabled]');
    if (nextBtn && !isDisabled) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
      pageNum++;
    } else {
      hasMore = false;
    }
  }
  console.log(`[Raneen] Total pages scraped: ${pageNum}`);
}
