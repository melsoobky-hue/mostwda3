import { WooCommerceAPI } from './woocommerce.js';
import { upsertOrder, upsertProduct } from './database.js';

const MOSTWDA3_KEY = 'ck_bc656bef7f6b21235ccea2e9a383d6c37c82ae32';
const MOSTWDA3_SECRET = 'cs_6a7eedadf557fd9bbe804af2652f1bd64959b1c7';

export async function syncMostwda3API() {
  console.log('[Mostwda3] Starting API sync...');
  const wc = new WooCommerceAPI('https://decorecentre.com/wp-json/wc/v3', MOSTWDA3_KEY, MOSTWDA3_SECRET);

  try {
    const orders = await wc.getAllOrders({ orderby: 'date', order: 'desc' });
    console.log(`[Mostwda3] Fetched ${orders.length} orders from API`);

    for (const order of orders) {
      const totalNum = parseFloat(order.total) || 0;
      const items = order.line_items || [];
      const firstItem = items[0] || {};
      const productName = firstItem.name || 'Mirror';
      const sku = firstItem.sku || '';

      const mirrorInfo = parseMirrorInfo(productName + ' ' + sku);
      const isDelayed = order.status === 'on-hold' || order.status === 'processing';

      const address = order.shipping || {};
      const fullAddress = [address.address_1, address.address_2, address.city, address.state, address.postcode]
        .filter(Boolean).join(', ');

      upsertOrder({
        source: 'mostwda3',
        source_order_id: String(order.id),
        customer_name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
        customer_phone: order.billing.phone || order.shipping.phone || '',
        customer_email: order.billing.email || '',
        customer_address: fullAddress,
        customer_governorate: address.state || '',
        product_name: productName,
        product_sku: sku,
        quantity: firstItem.quantity || 1,
        unit_price: parseFloat(firstItem.price) || 0,
        total_price: totalNum,
        shipping_cost: parseFloat(order.shipping_total) || 0,
        discount_amount: parseFloat(order.discount_total) || 0,
        status: mapStatus(order.status),
        status_ar: order.status,
        payment_method: order.payment_method_title || order.payment_method || '',
        order_date: order.date_created || '',
        order_timestamp: order.date_created || '',
        is_delayed: isDelayed ? 1 : 0,
        channel: 'mostwda3',
        mirror_type: mirrorInfo.type,
        mirror_dimensions: mirrorInfo.dimensions,
        mirror_size: mirrorInfo.size,
        mirror_shape: mirrorInfo.shape,
        raw_data: { id: order.id, status: order.status, total: order.total, items: items.length }
      });
    }

    console.log(`[Mostwda3] Synced ${orders.length} orders`);

    const products = await wc.getAllProducts({ orderby: 'date', order: 'desc' });
    console.log(`[Mostwda3] Fetched ${products.length} products from API`);

    for (const product of products) {
      const price = parseFloat(product.price) || 0;
      const img = product.images?.[0]?.src || '';
      const cats = (product.categories || []).map(c => c.name).join(', ');
      const mirrorInfo = parseMirrorInfo(product.name + ' ' + (product.sku || ''));

      upsertProduct({
        name: product.name,
        sku: product.sku || product.name.replace(/\s+/g, '-').toLowerCase(),
        category: cats,
        mirror_type: mirrorInfo.type,
        mirror_shape: mirrorInfo.shape,
        dimensions: mirrorInfo.dimensions,
        price,
        image_url: img,
        stock_quantity: product.stock_quantity || 0,
        stock_status: product.stock_status || (product.stock_quantity > 0 ? 'In stock' : 'Out of stock'),
        source: 'mostwda3',
        source_url: product.permalink || '',
        tags: (product.tags || []).map(t => t.name).join(', ')
      });
    }

    console.log(`[Mostwda3] Synced ${products.length} products`);
    console.log('[Mostwda3] API sync complete');
    return { orders: orders.length, products: products.length };
  } catch (error) {
    console.error('[Mostwda3] API sync failed:', error.message);
    throw error;
  }
}

function mapStatus(wcStatus) {
  const map = {
    'pending': 'Pending', 'processing': 'Processing', 'on-hold': 'On Hold',
    'completed': 'Delivered', 'cancelled': 'Cancelled', 'refunded': 'Refunded',
    'failed': 'Failed', 'trash': 'Cancelled'
  };
  return map[wcStatus] || wcStatus;
}

function parseMirrorInfo(text) {
  if (!text) return {};
  const sizeMatch = text.match(/(\d+)\s*[xX×]\s*(\d+)/);
  let type = '';
  if (text.includes('ليد') || text.toLowerCase().includes('led')) type = 'LED';
  if (text.includes('تاتش') || text.toLowerCase().includes('touch')) type = 'Touch LED';
  if (text.includes('سبت') || text.toLowerCase().includes('saba')) type = 'Saba';
  if (text.includes('مفرغة')) type = 'Hollow';
  let shape = '';
  if (text.includes('بيضاوية') || text.toLowerCase().includes('oval')) shape = 'Oval';
  if (text.includes('دائري') || text.toLowerCase().includes('round')) shape = 'Round';
  if (text.includes('مستطيل') || text.toLowerCase().includes('rectangular')) shape = 'Rectangular';
  return {
    type, shape,
    dimensions: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}` : '',
    size: sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}cm` : ''
  };
}
