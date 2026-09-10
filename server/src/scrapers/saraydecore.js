import { launchBrowser, closeBrowser, isLoggedIn } from './browser.js';
import { upsertOrder, upsertProduct } from '../services/database.js';

const ORDERS_URL   = 'https://www.saraydecore.com/wp-admin/admin.php?page=wc-orders';
const ORDERS_URL_LEGACY = 'https://www.saraydecore.com/wp-admin/edit.php?post_type=shop_order';
const PRODUCTS_URL = 'https://www.saraydecore.com/wp-admin/edit.php?post_type=product';

const STATUS_MAP = {
  'Processing':              'Processing',
  'On hold':                 'On Hold',
  'Pending payment':         'Pending',
  'Cancelled':               'Cancelled',
  'Canceled by Customer':    'Cancelled',
  'Failed':                  'Failed',
  'Delivered to Customer':   'Delivered',
  'Rejected by Customer':    'Rejected',
  'No Customer Response':    'No Response',
  'Refunded':                'Refunded',
  'Shipped':                 'Shipped',
  'In Transit':              'Shipped',
};

async function withRetry(fn, attempts = 3, delayMs = 3000) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === attempts - 1) throw err;
      console.warn(`[SarayDecore] Retry ${i + 1} after: ${err.message}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

export async function scrapeSarayDecore() {
  console.log('[SarayDecore] Starting scrape (using your Chrome profile)...');
  const context = await launchBrowser('saraydecore', false);
  const page    = context.pages()[0] || await context.newPage();

  let ordersSynced   = 0;
  let productsSynced = 0;

  try {
    await page.goto(ORDERS_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    if (!(await isLoggedIn(page, 'saraydecore'))) {
      console.log('[SarayDecore] Not logged in — waiting for manual login (up to 3 min)...');
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(3000);
        if (await isLoggedIn(page, 'saraydecore')) break;
      }
    }

    ordersSynced   = await withRetry(() => scrapeOrders(page));
    productsSynced = await withRetry(() => scrapeProducts(page));

    console.log(`[SarayDecore] Scrape complete — ${ordersSynced} orders, ${productsSynced} products`);
    return { ordersSynced, productsSynced };
  } catch (error) {
    console.error('[SarayDecore] Scrape failed:', error.message);
    throw error;
  } finally {
    await closeBrowser(context);
  }
}

async function scrapeOrders(page) {
  console.log('[SarayDecore] Scraping orders...');

  await page.goto(ORDERS_URL, { waitUntil: 'networkidle', timeout: 60000 });
  try {
    await page.waitForSelector('.wp-list-table, #the-order-list', { timeout: 10000 });
  } catch (_) {
    console.log('[SarayDecore] Falling back to classic orders URL...');
    await page.goto(ORDERS_URL_LEGACY, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.wp-list-table', { timeout: 20000 });
  }

  let pageNum = 1;
  let total   = 0;

  while (true) {
    console.log(`[SarayDecore] Orders page ${pageNum}...`);

    const orders = await page.evaluate(() => {
      const rows = document.querySelectorAll('.wp-list-table tbody tr, #the-order-list tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        if (!cells.length) return null;

        const orderId =
          row.querySelector('.column-id mark, .column-id strong, .order_number a, td.id')
            ?.textContent?.trim()?.replace(/[^0-9]/g, '') ||
          row.querySelector('td:first-child')
            ?.textContent?.trim()?.replace(/[^0-9]/g, '') || '';

        const customerName =
          row.querySelector('.column-customer_name .wc-order-customer-info, .column-shipping_address strong, td._customer_name')
            ?.textContent?.trim() ||
          cells[2]?.textContent?.trim() || '';

        const date =
          row.querySelector('.column-date .timestamp, .column-order_date time, td.order_date')
            ?.textContent?.trim() ||
          row.querySelector('.column-date')?.textContent?.trim() ||
          cells[1]?.textContent?.trim() || '';

        const statusRaw =
          row.querySelector('.column-status .wc-order-status, .column-status mark, td.order_status mark')
            ?.textContent?.trim() || cells[3]?.textContent?.trim() || '';

        const total =
          row.querySelector('.column-total .woocommerce-Price-amount, .column-order_total .amount')
            ?.textContent?.trim() || cells[4]?.textContent?.trim() || '';

        const phone =
          row.querySelector('.column-billing_address .phone, .column-shipping_address .phone')
            ?.textContent?.trim() || '';

        const email =
          row.querySelector('.column-billing_address .email')?.textContent?.trim() || '';

        const address =
          row.querySelector('.column-shipping_address address, .column-billing_address address, .column-shipping_address')
            ?.textContent?.trim() || '';

        const paymentMethod =
          row.querySelector('.column-payment_method, td.payment_method')
            ?.textContent?.trim() || '';

        // Custom WooCommerce fee tracking referral source
        const origin =
          row.querySelector('.column-fee, td:nth-child(7)')
            ?.textContent?.trim() || '';

        return { orderId, customerName, date, statusRaw, total, phone, email, address, paymentMethod, origin };
      }).filter(o => o && o.orderId);
    });

    for (const order of orders) {
      const totalNum   = parseFloat(order.total.replace(/[^0-9.]/g, '')) || 0;
      const originInfo = parseOrigin(order.origin);
      const isDelayed  = order.statusRaw?.toLowerCase().includes('hold') ||
                         order.statusRaw?.includes('معلق') ||
                         order.statusRaw?.includes('قيد التنفيذ');
      const mappedStatus = STATUS_MAP[order.statusRaw] || order.statusRaw;

      const result = upsertOrder({
        source: 'saraydecore', source_order_id: order.orderId,
        customer_name: order.customerName, customer_phone: order.phone,
        customer_email: order.email, customer_address: order.address,
        product_name: 'Mirror - Saray Decore',
        unit_price: totalNum, total_price: totalNum,
        status: mappedStatus, status_ar: '',
        order_date: order.date, payment_method: order.paymentMethod,
        channel: 'saraydecore',
        referral_source: originInfo.referral,
        origin_url: originInfo.url,
        is_delayed: isDelayed ? 1 : 0,
        raw_data: order,
      });
      if (result === 'inserted') total++;
    }

    console.log(`[SarayDecore] Page ${pageNum}: ${orders.length} rows`);

    const nextBtn = await page.$('.tablenav-pages .next-page:not([disabled]), .tablenav-pages a.next');
    if (nextBtn) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
      pageNum++;
    } else {
      break;
    }
  }

  console.log(`[SarayDecore] Orders done — ${total} new`);
  return total;
}

async function scrapeProducts(page) {
  console.log('[SarayDecore] Scraping products...');
  await page.goto(PRODUCTS_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.wp-list-table', { timeout: 30000 });

  let pageNum = 1;
  let total   = 0;

  while (true) {
    console.log(`[SarayDecore] Products page ${pageNum}...`);

    const products = await page.evaluate(() => {
      const rows = document.querySelectorAll('.wp-list-table tbody tr.type-product');
      return Array.from(rows).map(row => {
        const name  = row.querySelector('.column-name .row-title, .column-product_name .row-title')?.textContent?.trim() || '';
        const sku   = row.querySelector('.column-sku')?.textContent?.trim() || '';
        const price = row.querySelector('.column-price .amount')?.textContent?.trim() || '';
        const stock = row.querySelector('.column-is_in_stock, .column-stock_status')?.textContent?.trim() || '';
        const img   = row.querySelector('td.column-thumb img, .column-product_image img')?.src || '';
        const cats  = row.querySelector('.column-product_cat')?.textContent?.trim() || '';
        const link  = row.querySelector('.column-name .row-title')?.href || '';
        const stockQty = row.querySelector('.column-stock')?.textContent?.trim() || '';
        return { name, sku, price, stock, img, cats, link, stockQty };
      }).filter(p => p.name);
    });

    for (const p of products) {
      const priceNum = parseFloat(p.price.replace(/[^0-9.]/g, '')) || 0;
      const skuClean = p.sku || `saray-${p.name.slice(0, 40).replace(/\s+/g, '-').toLowerCase()}`;
      const info     = parseMirrorInfo(p.name);
      const stockNum = parseInt(p.stockQty) || (p.stock?.toLowerCase().includes('in stock') ? 1 : 0);

      const result = upsertProduct({
        name: p.name, sku: skuClean, category: p.cats,
        mirror_type: info.type, mirror_shape: info.shape,
        dimensions: info.dimensions, price: priceNum,
        image_url: p.img, stock_quantity: stockNum, stock_status: p.stock,
        has_led: info.type === 'LED' || info.type === 'Touch LED' ? 1 : 0,
        has_touch: info.type === 'Touch LED' ? 1 : 0,
        source: 'saraydecore',
        source_url: p.link || `https://www.saraydecore.com/product/${skuClean}`,
      });
      if (result === 'inserted') total++;
    }

    console.log(`[SarayDecore] Page ${pageNum}: ${products.length} products`);

    const nextBtn = await page.$('.tablenav-pages .next-page:not([disabled]), .tablenav-pages a.next');
    if (nextBtn) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
      pageNum++;
    } else {
      break;
    }
  }

  console.log(`[SarayDecore] Products done — ${total} new`);
  return total;
}

function parseMirrorInfo(text) {
  if (!text) return {};
  const t = text.toLowerCase();

  const sizeMatch = text.match(/(\d+)\s*[xX×]\s*(\d+)/);

  let type = '';
  if (t.includes('touch') || text.includes('تاتش'))      type = 'Touch LED';
  else if (t.includes('led') || text.includes('ليد'))    type = 'LED';
  else if (t.includes('saba') || text.includes('سبت') || text.includes('سامبا')) type = 'Saba';
  else if (text.includes('مفرغة') || t.includes('hollow')) type = 'Hollow';

  let shape = '';
  if (t.includes('oval') || text.includes('بيضاوية'))           shape = 'Oval';
  else if (t.includes('round') || text.includes('دائري'))       shape = 'Round';
  else if (t.includes('rect') || text.includes('مستطيل'))       shape = 'Rectangular';
  else if (t.includes('square') || text.includes('مربع'))       shape = 'Square';

  return {
    type, shape,
    dimensions: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}` : '',
    size: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}cm` : '',
  };
}

function parseOrigin(origin) {
  if (!origin) return { referral: '', url: '' };
  const o = origin.toLowerCase();
  const url = o.includes('facebook') ? 'Facebook'
    : o.includes('instagram') ? 'Instagram'
    : o.includes('google')    ? 'Google'
    : o.includes('tiktok')    ? 'TikTok'
    : origin;
  const referralMatch = origin.match(/Referral:\s*(.+)/i) || origin.match(/Source:\s*(.+)/i);
  return { referral: referralMatch?.[1]?.trim() || origin, url };
}
