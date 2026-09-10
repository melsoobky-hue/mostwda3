import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'database.sqlite');

let db = null;

export async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  initSchema();
  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('[DB] saveDb failed:', e.message);
  }
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_order_id TEXT NOT NULL,
      customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      customer_email TEXT DEFAULT '',
      customer_address TEXT DEFAULT '',
      customer_governorate TEXT DEFAULT '',
      customer_delivery_zone TEXT DEFAULT '',
      customer_notes TEXT DEFAULT '',
      product_name TEXT DEFAULT '',
      product_sku TEXT DEFAULT '',
      product_image_url TEXT DEFAULT '',
      product_url TEXT DEFAULT '',
      mirror_type TEXT DEFAULT '',
      mirror_dimensions TEXT DEFAULT '',
      mirror_size TEXT DEFAULT '',
      mirror_color TEXT DEFAULT '',
      quantity INTEGER DEFAULT 1,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      profit_margin REAL DEFAULT 0,
      shipping_cost REAL DEFAULT 0,
      cod_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT '',
      payment_status TEXT DEFAULT '',
      status TEXT DEFAULT '',
      status_ar TEXT DEFAULT '',
      order_date TEXT DEFAULT '',
      order_timestamp TEXT DEFAULT '',
      expected_delivery_date TEXT DEFAULT '',
      actual_delivery_date TEXT DEFAULT '',
      shipped_date TEXT DEFAULT '',
      delivered_date TEXT DEFAULT '',
      is_delayed INTEGER DEFAULT 0,
      delay_days INTEGER DEFAULT 0,
      delivery_attempts INTEGER DEFAULT 0,
      return_reason TEXT DEFAULT '',
      channel TEXT DEFAULT '',
      referral_source TEXT DEFAULT '',
      origin_url TEXT DEFAULT '',
      raw_data TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source, source_order_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '',
      name_ar TEXT DEFAULT '',
      sku TEXT UNIQUE,
      barcode TEXT DEFAULT '',
      category TEXT DEFAULT '',
      category_ar TEXT DEFAULT '',
      subcategory TEXT DEFAULT '',
      mirror_type TEXT DEFAULT '',
      mirror_shape TEXT DEFAULT '',
      dimensions TEXT DEFAULT '',
      width REAL DEFAULT 0,
      height REAL DEFAULT 0,
      depth REAL DEFAULT 0,
      weight REAL DEFAULT 0,
      color TEXT DEFAULT '',
      material TEXT DEFAULT '',
      frame_type TEXT DEFAULT '',
      lighting_type TEXT DEFAULT '',
      has_touch INTEGER DEFAULT 0,
      has_led INTEGER DEFAULT 0,
      has_bluetooth INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      description_ar TEXT DEFAULT '',
      price REAL DEFAULT 0,
      price_usd REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      profit_margin REAL DEFAULT 0,
      compare_at_price REAL DEFAULT 0,
      image_url TEXT DEFAULT '',
      gallery_images TEXT DEFAULT '',
      stock_quantity INTEGER DEFAULT 0,
      stock_status TEXT DEFAULT '',
      low_stock_threshold INTEGER DEFAULT 5,
      weight_kg REAL DEFAULT 0,
      source TEXT DEFAULT '',
      source_url TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      tags TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT,
      status TEXT,
      records_synced INTEGER DEFAULT 0,
      orders_synced INTEGER DEFAULT 0,
      products_synced INTEGER DEFAULT 0,
      error_message TEXT DEFAULT '',
      duration_ms INTEGER DEFAULT 0,
      started_at TEXT DEFAULT '',
      completed_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Create indexes for query performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date)',
    'CREATE INDEX IF NOT EXISTS idx_orders_source_id ON orders(source, source_order_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_governorate ON orders(customer_governorate)',
    'CREATE INDEX IF NOT EXISTS idx_orders_mirror_type ON orders(mirror_type)',
    'CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel)',
    'CREATE INDEX IF NOT EXISTS idx_orders_delayed ON orders(is_delayed)',
    'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
    'CREATE INDEX IF NOT EXISTS idx_products_source ON products(source)',
    'CREATE INDEX IF NOT EXISTS idx_products_mirror_type ON products(mirror_type)',
    'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
  ];
  for (const idx of indexes) {
    try { db.run(idx); } catch (_) {}
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function queryAll(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  } catch (e) {
    console.error('[DB] queryAll error:', e.message, '\nSQL:', sql);
    return [];
  }
}

function queryOne(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    let result = null;
    if (stmt.step()) result = stmt.getAsObject();
    stmt.free();
    return result;
  } catch (e) {
    console.error('[DB] queryOne error:', e.message);
    return null;
  }
}

function execCount(sql, params = []) {
  try {
    const r = db.exec(sql, params);
    return (r.length > 0 && r[0].values.length > 0) ? r[0].values[0][0] : 0;
  } catch (_) { return 0; }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function upsertOrder(order) {
  const price  = parseFloat(order.total_price) || 0;
  const cost   = parseFloat(order.cost)        || 0;
  const profit = price - cost;
  const margin = price > 0 ? parseFloat(((profit / price) * 100).toFixed(1)) : 0;

  const existing = execCount(
    'SELECT COUNT(*) FROM orders WHERE source = ? AND source_order_id = ?',
    [order.source, order.source_order_id]
  );

  const vals = [
    order.customer_name      || '', order.customer_phone     || '',
    order.customer_email     || '', order.customer_address   || '',
    order.customer_governorate|| '',order.customer_delivery_zone||'',
    order.customer_notes     || '', order.product_name       || '',
    order.product_sku        || '', order.product_image_url  || '',
    order.product_url        || '', order.mirror_type        || '',
    order.mirror_dimensions  || '', order.mirror_size        || '',
    order.mirror_color       || '', order.quantity           || 1,
    order.unit_price         || 0,  price, cost, profit, margin,
    order.shipping_cost      || 0,  order.cod_amount         || 0,
    order.discount_amount    || 0,  order.payment_method     || '',
    order.payment_status     || '', order.status             || '',
    order.status_ar          || '', order.order_date         || '',
    order.order_timestamp    || '', order.expected_delivery_date || '',
    order.actual_delivery_date||'', order.shipped_date       || '',
    order.delivered_date     || '', order.is_delayed         || 0,
    order.delay_days         || 0,  order.delivery_attempts  || 0,
    order.return_reason      || '', order.channel            || '',
    order.referral_source    || '', order.origin_url         || '',
    order.raw_data ? JSON.stringify(order.raw_data) : '',
  ];

  if (existing > 0) {
    db.run(`
      UPDATE orders SET
        customer_name=?,customer_phone=?,customer_email=?,customer_address=?,
        customer_governorate=?,customer_delivery_zone=?,customer_notes=?,
        product_name=?,product_sku=?,product_image_url=?,product_url=?,
        mirror_type=?,mirror_dimensions=?,mirror_size=?,mirror_color=?,
        quantity=?,unit_price=?,total_price=?,cost=?,profit=?,profit_margin=?,
        shipping_cost=?,cod_amount=?,discount_amount=?,payment_method=?,payment_status=?,
        status=?,status_ar=?,order_date=?,order_timestamp=?,
        expected_delivery_date=?,actual_delivery_date=?,shipped_date=?,delivered_date=?,
        is_delayed=?,delay_days=?,delivery_attempts=?,return_reason=?,
        channel=?,referral_source=?,origin_url=?,raw_data=?,updated_at=datetime('now')
      WHERE source=? AND source_order_id=?
    `, [...vals, order.source, order.source_order_id]);
    saveDb();
    return 'updated';
  } else {
    db.run(`
      INSERT INTO orders (
        customer_name,customer_phone,customer_email,customer_address,
        customer_governorate,customer_delivery_zone,customer_notes,
        product_name,product_sku,product_image_url,product_url,
        mirror_type,mirror_dimensions,mirror_size,mirror_color,
        quantity,unit_price,total_price,cost,profit,profit_margin,
        shipping_cost,cod_amount,discount_amount,payment_method,payment_status,
        status,status_ar,order_date,order_timestamp,
        expected_delivery_date,actual_delivery_date,shipped_date,delivered_date,
        is_delayed,delay_days,delivery_attempts,return_reason,
        channel,referral_source,origin_url,raw_data,source,source_order_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [...vals, order.source, order.source_order_id]);
    saveDb();
    return 'inserted';
  }
}

export function getAllOrders(filters = {}) {
  const conditions = ['1=1'];
  const params     = [];

  if (filters.source)      { conditions.push('source = ?');                params.push(filters.source); }
  if (filters.status)      { conditions.push('status = ?');                params.push(filters.status); }
  if (filters.governorate) { conditions.push('customer_governorate = ?');  params.push(filters.governorate); }
  if (filters.mirror_type) { conditions.push('mirror_type = ?');           params.push(filters.mirror_type); }
  if (filters.dateFrom)    { conditions.push('order_date >= ?');           params.push(filters.dateFrom); }
  if (filters.dateTo)      { conditions.push('order_date <= ?');           params.push(filters.dateTo); }
  if (filters.minPrice)    { conditions.push('total_price >= ?');          params.push(parseFloat(filters.minPrice)); }
  if (filters.maxPrice)    { conditions.push('total_price <= ?');          params.push(parseFloat(filters.maxPrice)); }
  if (filters.isDelayed === '1' || filters.isDelayed === true)
                           { conditions.push('is_delayed = 1'); }
  if (filters.search) {
    conditions.push('(customer_name LIKE ? OR source_order_id LIKE ? OR product_name LIKE ? OR customer_phone LIKE ? OR product_sku LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s, s, s);
  }

  const where = conditions.join(' AND ');

  const allowedSort = ['order_date', 'total_price', 'profit', 'profit_margin',
    'customer_name', 'status', 'source_order_id', 'created_at', 'cost'];
  const sortBy  = allowedSort.includes(filters.sortBy) ? filters.sortBy : 'created_at';
  const sortDir = filters.sortDir === 'asc' ? 'ASC' : 'DESC';

  const page   = Math.max(1, parseInt(filters.page)  || 1);
  const limit  = Math.min(500, parseInt(filters.limit) || 50);
  const offset = (page - 1) * limit;

  const total  = execCount(`SELECT COUNT(*) FROM orders WHERE ${where}`, params);
  const orders = queryAll(
    `SELECT * FROM orders WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { orders, total, page, limit };
}

export function getOrderById(id) {
  return queryOne('SELECT * FROM orders WHERE id = ?', [parseInt(id)]);
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function upsertProduct(product) {
  const price  = parseFloat(product.price)  || 0;
  const cost   = parseFloat(product.cost)   || 0;
  const margin = price > 0 ? parseFloat((((price - cost) / price) * 100).toFixed(1)) : 0;

  const existing = execCount('SELECT COUNT(*) FROM products WHERE sku = ?', [product.sku]);

  const vals = [
    product.name||'', product.name_ar||'', product.barcode||'',
    product.category||'', product.category_ar||'', product.subcategory||'',
    product.mirror_type||'', product.mirror_shape||'', product.dimensions||'',
    product.width||0, product.height||0, product.depth||0, product.weight||0,
    product.color||'', product.material||'', product.frame_type||'',
    product.lighting_type||'', product.has_touch||0, product.has_led||0,
    product.has_bluetooth||0, product.description||'', product.description_ar||'',
    price, product.price_usd||0, cost, margin, product.compare_at_price||0,
    product.image_url||'', product.gallery_images||'',
    product.stock_quantity||0, product.stock_status||'',
    product.low_stock_threshold||5, product.weight_kg||0,
    product.source||'', product.source_url||'',
    product.is_active != null ? product.is_active : 1,
    product.tags||'',
  ];

  if (existing > 0) {
    db.run(`
      UPDATE products SET
        name=?,name_ar=?,barcode=?,category=?,category_ar=?,subcategory=?,
        mirror_type=?,mirror_shape=?,dimensions=?,width=?,height=?,depth=?,weight=?,
        color=?,material=?,frame_type=?,lighting_type=?,
        has_touch=?,has_led=?,has_bluetooth=?,description=?,description_ar=?,
        price=?,price_usd=?,cost=?,profit_margin=?,compare_at_price=?,
        image_url=?,gallery_images=?,stock_quantity=?,stock_status=?,
        low_stock_threshold=?,weight_kg=?,source=?,source_url=?,
        is_active=?,tags=?,updated_at=datetime('now')
      WHERE sku=?
    `, [...vals, product.sku]);
    saveDb();
    return 'updated';
  } else {
    db.run(`
      INSERT INTO products (
        name,name_ar,sku,barcode,category,category_ar,subcategory,
        mirror_type,mirror_shape,dimensions,width,height,depth,weight,
        color,material,frame_type,lighting_type,
        has_touch,has_led,has_bluetooth,description,description_ar,
        price,price_usd,cost,profit_margin,compare_at_price,
        image_url,gallery_images,stock_quantity,stock_status,
        low_stock_threshold,weight_kg,source,source_url,is_active,tags
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [vals[0], vals[1], product.sku, ...vals.slice(2)]);
    saveDb();
    return 'inserted';
  }
}

export function getAllProducts(filters = {}) {
  const conditions = ['1=1'];
  const params     = [];

  if (filters.source)      { conditions.push('source = ?');       params.push(filters.source); }
  if (filters.mirror_type) { conditions.push('mirror_type = ?');  params.push(filters.mirror_type); }
  if (filters.category)    { conditions.push('category = ?');     params.push(filters.category); }
  if (filters.search) {
    conditions.push('(name LIKE ? OR sku LIKE ? OR dimensions LIKE ? OR description LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }
  if (filters.inStock)     { conditions.push('stock_quantity > 0'); }

  const where = conditions.join(' AND ');

  const allowedSort = ['name', 'price', 'profit_margin', 'stock_quantity', 'created_at', 'updated_at'];
  const sortBy  = allowedSort.includes(filters.sortBy) ? filters.sortBy : 'name';
  const sortDir = filters.sortDir === 'desc' ? 'DESC' : 'ASC';

  const page   = Math.max(1, parseInt(filters.page)  || 1);
  const limit  = Math.min(500, parseInt(filters.limit) || 200);
  const offset = (page - 1) * limit;

  const total    = execCount(`SELECT COUNT(*) FROM products WHERE ${where}`, params);
  const products = queryAll(
    `SELECT * FROM products WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { products, total, page, limit };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function getAnalytics(dateFrom, dateTo) {
  const cond   = [];
  const params = [];
  if (dateFrom) { cond.push('order_date >= ?'); params.push(dateFrom); }
  if (dateTo)   { cond.push('order_date <= ?'); params.push(dateTo); }

  const where = cond.length ? ` AND ${cond.join(' AND ')}` : '';

  // ── Summary ────────────────────────────────────────────────────────────────
  const summaryResult = db.exec(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(total_price),0)    as total_revenue,
      COALESCE(SUM(cost),0)           as total_costs,
      COALESCE(SUM(profit),0)         as total_profit,
      COALESCE(SUM(cod_amount),0)     as cod_collected,
      COALESCE(SUM(shipping_cost),0)  as total_shipping,
      COALESCE(SUM(discount_amount),0) as total_discounts,
      COALESCE(AVG(total_price),0)    as avg_order_value,
      COUNT(DISTINCT customer_phone)  as total_customers,
      SUM(CASE WHEN is_delayed=1 THEN 1 ELSE 0 END)                         as delayed_orders,
      SUM(CASE WHEN status IN ('Delivered','Fulfilled') THEN 1 ELSE 0 END) as delivered_orders,
      SUM(CASE WHEN status IN ('Cancelled','Failed','Rejected') THEN 1 ELSE 0 END) as cancelled_orders
    FROM orders WHERE 1=1 ${where}
  `, params);

  let summary = {};
  if (summaryResult.length > 0 && summaryResult[0].values.length > 0) {
    const cols = summaryResult[0].columns;
    const vals = summaryResult[0].values[0];
    cols.forEach((c, i) => { summary[c] = vals[i] ?? 0; });
  }

  // Pull product count separately
  summary.total_products = execCount('SELECT COUNT(*) FROM products');

  // ── By source ──────────────────────────────────────────────────────────────
  const bySource = queryAll(`
    SELECT source, COUNT(*) as count,
      COALESCE(SUM(total_price),0) as revenue,
      COALESCE(AVG(total_price),0) as avg_order
    FROM orders WHERE 1=1 ${where} GROUP BY source
  `, params);

  // ── By status ──────────────────────────────────────────────────────────────
  const byStatus = queryAll(`
    SELECT COALESCE(status,'Unknown') as status, COUNT(*) as count
    FROM orders WHERE 1=1 ${where}
    GROUP BY status ORDER BY count DESC
  `, params);

  // ── By channel ─────────────────────────────────────────────────────────────
  const byChannel = queryAll(`
    SELECT COALESCE(channel,source,'Unknown') as channel, COUNT(*) as count,
      COALESCE(SUM(total_price),0) as revenue
    FROM orders WHERE 1=1 ${where}
    GROUP BY channel ORDER BY count DESC
  `, params);

  // ── By governorate ─────────────────────────────────────────────────────────
  const byGovernorate = queryAll(`
    SELECT customer_governorate as governorate, COUNT(*) as count,
      COALESCE(SUM(total_price),0) as revenue
    FROM orders WHERE 1=1 ${where}
      AND customer_governorate IS NOT NULL AND customer_governorate != ''
    GROUP BY customer_governorate ORDER BY count DESC
  `, params);

  // ── By mirror type ─────────────────────────────────────────────────────────
  const byMirrorType = queryAll(`
    SELECT mirror_type, COUNT(*) as count,
      COALESCE(SUM(total_price),0) as revenue
    FROM orders WHERE 1=1 ${where}
      AND mirror_type IS NOT NULL AND mirror_type != ''
    GROUP BY mirror_type ORDER BY count DESC
  `, params);

  // ── Top mirror types (by revenue, for ranked list) ────────────────────────
  const topMirrorTypes = queryAll(`
    SELECT mirror_type, COUNT(*) as count,
      COALESCE(SUM(total_price),0) as revenue
    FROM orders WHERE 1=1 ${where}
      AND mirror_type IS NOT NULL AND mirror_type != ''
    GROUP BY mirror_type ORDER BY revenue DESC LIMIT 10
  `, params);

  // ── By size ────────────────────────────────────────────────────────────────
  const bySize = queryAll(`
    SELECT COALESCE(mirror_size, mirror_dimensions,'') as size, COUNT(*) as count
    FROM orders WHERE 1=1 ${where}
      AND (mirror_size != '' OR mirror_dimensions != '')
    GROUP BY size ORDER BY count DESC LIMIT 20
  `, params);

  // ── Daily revenue ──────────────────────────────────────────────────────────
  const dailyRevenue = queryAll(`
    SELECT DATE(order_date) as date, COUNT(*) as orders,
      COALESCE(SUM(total_price),0) as revenue,
      COALESCE(SUM(profit),0)      as profit
    FROM orders WHERE 1=1 ${where}
    GROUP BY DATE(order_date) ORDER BY date ASC
  `, params);

  // ── Top products ───────────────────────────────────────────────────────────
  const topProducts = queryAll(`
    SELECT product_name, product_sku, COUNT(*) as count,
      COALESCE(SUM(total_price),0) as revenue,
      COALESCE(AVG(total_price),0) as avg_price
    FROM orders WHERE 1=1 ${where}
      AND product_name IS NOT NULL AND product_name != ''
    GROUP BY product_name ORDER BY count DESC LIMIT 10
  `, params);

  // ── Hourly orders ──────────────────────────────────────────────────────────
  const hourlyOrders = queryAll(`
    SELECT CAST(strftime('%H', order_timestamp) AS INTEGER) as hour, COUNT(*) as count
    FROM orders WHERE 1=1 ${where}
      AND order_timestamp IS NOT NULL AND order_timestamp != ''
    GROUP BY hour ORDER BY hour ASC
  `, params);

  return {
    summary, bySource, byStatus, byGovernorate, byChannel,
    byMirrorType, topMirrorTypes, bySize,
    dailyRevenue, topProducts, hourlyOrders
  };
}

// ─── Sync Logs ────────────────────────────────────────────────────────────────

/**
 * @param {string} source
 * @param {'success'|'failed'} status
 * @param {number} recordsSynced  - total records touched
 * @param {string|null} errorMessage
 * @param {string} startedAt      - ISO timestamp
 * @param {{ ordersSynced?: number, productsSynced?: number, durationMs?: number }} extra
 */
export function logSync(source, status, recordsSynced, errorMessage, startedAt, extra = {}) {
  db.run(`
    INSERT INTO sync_logs
      (source, status, records_synced, orders_synced, products_synced,
       error_message, duration_ms, started_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `, [
    source,
    status,
    recordsSynced      || 0,
    extra.ordersSynced   || 0,
    extra.productsSynced || 0,
    errorMessage       || '',
    extra.durationMs     || 0,
    startedAt          || '',
  ]);
  saveDb();
}

export function getSyncLogs() {
  return queryAll('SELECT * FROM sync_logs ORDER BY id DESC LIMIT 100');
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSetting(key) {
  const r = db.exec('SELECT value FROM settings WHERE key = ?', [key]);
  return (r.length > 0 && r[0].values.length > 0) ? r[0].values[0][0] : null;
}

export function setSetting(key, value) {
  const exists = execCount('SELECT COUNT(*) FROM settings WHERE key = ?', [key]);
  if (exists > 0) {
    db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
  } else {
    db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
  saveDb();
}
