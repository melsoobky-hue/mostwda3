import { launchBrowser, closeBrowser } from './browser.js';
import { upsertOrder, upsertProduct } from '../services/database.js';

const LOGIN_URL = 'https://decorecentre.com/wp-admin/';
const ORDERS_URL = 'https://decorecentre.com/wp-admin/edit.php?post_type=shop_order';
const PRODUCTS_URL = 'https://decorecentre.com/wp-admin/edit.php?post_type=product';

export async function scrapeMostwda3(credentials) {
  const { username, password } = credentials;
  console.log('[Mostwda3] Starting scrape...');

  const context = await launchBrowser('mostwda3', true);
  const page = await context.newPage();

  try {
    await login(page, username, password);
    await scrapeOrders(page);
    await scrapeProducts(page);
    console.log('[Mostwda3] Scrape complete');
  } catch (error) {
    console.error('[Mostwda3] Scrape failed:', error.message);
    throw error;
  } finally {
    await closeBrowser(context);
  }
}

async function login(page, username, password) {
  console.log('[Mostwda3] Logging in...');
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#user_login', username);
  await page.fill('#user_pass', password);
  await page.click('#wp-submit');
  await page.waitForURL('**/wp-admin/**', { timeout: 30000 });
  console.log('[Mostwda3] Login successful');
}

async function scrapeOrders(page) {
  console.log('[Mostwda3] Scraping orders...');
  await page.goto(ORDERS_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.wp-list-table', { timeout: 30000 });

  let pageNum = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`[Mostwda3] Scraping orders page ${pageNum}...`);
    const orders = await page.evaluate(() => {
      const rows = document.querySelectorAll('.wp-list-table tbody tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        const orderId = row.querySelector('.order_o a, .column-id strong')?.textContent?.trim() ||
                        row.querySelector('td:first-child')?.textContent?.trim()?.replace('#', '') || '';
        const customerName = row.querySelector('.column-shipping_address .wc-order-address strong')?.textContent?.trim() ||
                            cells[2]?.textContent?.trim() || '';
        const date = row.querySelector('.column-date order-date')?.textContent?.trim() ||
                    cells[1]?.textContent?.trim() || '';
        const total = row.querySelector('.column-order_total .amount')?.textContent?.trim() ||
                     cells[3]?.textContent?.trim() || '';
        const status = row.querySelector('.order-status .status-tip, .column-status .wc-order-status')?.textContent?.trim() ||
                      cells[4]?.textContent?.trim() || '';
        const items = row.querySelector('.column-items .wc-order-item-name')?.textContent?.trim() || '';
        const phone = row.querySelector('.column-shipping_address .phone')?.textContent?.trim() || '';
        const email = row.querySelector('.column-billing_address .email')?.textContent?.trim() || '';
        const address = row.querySelector('.column-shipping_address')?.textContent?.trim() || '';
        const paymentMethod = row.querySelector('.column-payment_method')?.textContent?.trim() || '';
        return { orderId, customerName, date, total, status, items, phone, email, address, paymentMethod };
      }).filter(o => o.orderId);
    });

    for (const order of orders) {
      const totalNum = parseFloat(order.total.replace(/[^0-9.]/g, '')) || 0;
      const mirrorInfo = parseMirrorInfo(order.items);
      upsertOrder({
        source: 'mostwda3', source_order_id: order.orderId, customer_name: order.customerName,
        customer_phone: order.phone, customer_email: order.email, customer_address: order.address,
        product_name: order.items, product_sku: mirrorInfo.sku || order.items,
        quantity: 1, unit_price: totalNum, total_price: totalNum,
        status: order.status, order_date: order.date, payment_method: order.paymentMethod,
        channel: 'mostwda3', mirror_type: mirrorInfo.type,
        mirror_dimensions: mirrorInfo.dimensions, mirror_size: mirrorInfo.size, raw_data: order
      });
    }

    console.log(`[Mostwda3] Found ${orders.length} orders on page ${pageNum}`);
    const nextBtn = await page.$('.tablenav-pages .next:not(.disabled), a.next.page-numbers');
    if (nextBtn) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
      pageNum++;
    } else {
      hasMore = false;
    }
  }
  console.log(`[Mostwda3] Total orders pages scraped: ${pageNum}`);
}

async function scrapeProducts(page) {
  console.log('[Mostwda3] Scraping products...');
  await page.goto(PRODUCTS_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.wp-list-table', { timeout: 30000 });

  let pageNum = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`[Mostwda3] Scraping products page ${pageNum}...`);
    const products = await page.evaluate(() => {
      const rows = document.querySelectorAll('.wp-list-table tbody tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        const name = row.querySelector('.column-name .row-title, td.name a')?.textContent?.trim() ||
                    cells[1]?.textContent?.trim() || '';
        const sku = row.querySelector('.column-sku, td.sku')?.textContent?.trim() || '';
        const price = row.querySelector('.column-price .amount, td.price')?.textContent?.trim() || '';
        const stock = row.querySelector('.column-stock_status, td.stock_status')?.textContent?.trim() || '';
        const img = row.querySelector('td.column-thumb img')?.src || '';
        const categories = row.querySelector('.column-product_cat')?.textContent?.trim() || '';
        const tags = row.querySelector('.column-tags')?.textContent?.trim() || '';
        return { name, sku, price, stock, img, categories, tags };
      }).filter(p => p.name);
    });

    for (const product of products) {
      const priceNum = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;
      const skuClean = product.sku || product.name.replace(/\s+/g, '-').toLowerCase();
      const mirrorInfo = parseMirrorInfo(product.name);
      upsertProduct({
        name: product.name, sku: skuClean, category: product.categories, tags: product.tags,
        mirror_type: mirrorInfo.type, mirror_shape: mirrorInfo.shape, dimensions: mirrorInfo.dimensions,
        price: priceNum, image_url: product.img,
        stock_quantity: product.stock === 'In stock' ? 999 : 0, stock_status: product.stock,
        source: 'mostwda3', source_url: `https://decorecentre.com/product/${skuClean}`
      });
    }

    console.log(`[Mostwda3] Found ${products.length} products on page ${pageNum}`);
    const nextBtn = await page.$('.tablenav-pages .next:not(.disabled), a.next.page-numbers');
    if (nextBtn) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
      pageNum++;
    } else {
      hasMore = false;
    }
  }
  console.log(`[Mostwda3] Total products pages scraped: ${pageNum}`);
}

function parseMirrorInfo(text) {
  if (!text) return {};
  const sizeMatch = text.match(/(\d+)\s*[xX×]\s*(\d+)/);
  const skuMatch = text.match(/\b(M[A-Z0-9]+)\b/);
  let type = '';
  if (text.includes('ليد') || text.toLowerCase().includes('led')) type = 'LED';
  if (text.includes('تاتش') || text.toLowerCase().includes('touch')) type = 'Touch LED';
  if (text.includes('سبت') || text.toLowerCase().includes('saba')) type = 'Saba';
  if (text.includes('مفرغة')) type = 'Hollow';
  let shape = '';
  if (text.includes('بيضاوية') || text.toLowerCase().includes('oval')) shape = 'Oval';
  if (text.includes('دائري') || text.toLowerCase().includes('round')) shape = 'Round';
  if (text.includes('مستطيل') || text.toLowerCase().includes('rectangular')) shape = 'Rectangular';
  return { type, shape, dimensions: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}` : '', size: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}cm` : '', sku: skuMatch?.[1] || '' };
}
