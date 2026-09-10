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

function runSql(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  stmt.step();
  stmt.free();
}

function initSchema() {
  runSql(`
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

  runSql(`
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

  runSql(`
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

  runSql(`
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
    'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku)',
    'CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_rules_type ON rules(type)',
  ];
  for (const idx of indexes) {
    try { runSql(idx); } catch (_) {}
  }

  // ── New tables for v2 features ──────────────────────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE,
      name TEXT DEFAULT '',
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      reorder_point INTEGER DEFAULT 10,
      reorder_quantity INTEGER DEFAULT 20,
      cost REAL DEFAULT 0,
      last_restocked TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pin TEXT NOT NULL,
      name TEXT DEFAULT 'Admin',
      role TEXT DEFAULT 'admin',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      source TEXT DEFAULT '',
      source_order_id TEXT DEFAULT '',
      shipping_company TEXT DEFAULT '',
      tracking_number TEXT DEFAULT '',
      status TEXT DEFAULT '',
      status_ar TEXT DEFAULT '',
      pickup_date TEXT DEFAULT '',
      delivery_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      raw_data TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '',
      type TEXT DEFAULT '',
      condition_json TEXT DEFAULT '{}',
      action_json TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      last_triggered TEXT DEFAULT '',
      trigger_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      source TEXT DEFAULT '',
      source_order_id TEXT DEFAULT '',
      old_status TEXT DEFAULT '',
      new_status TEXT DEFAULT '',
      changed_by TEXT DEFAULT 'system',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Insert default admin PIN if none exists
  const authCount = execCount('SELECT COUNT(*) FROM auth');
  if (authCount === 0) {
    runSql("INSERT INTO auth (pin, name, role) VALUES ('1234', 'Admin', 'admin')");
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
    runSql(`
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
    runSql(`
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
    runSql(`
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
    runSql(`
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
  runSql(`
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
    runSql('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
  } else {
    runSql('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
  saveDb();
}

// ─── Expenses ───────────────────────────────────────────────────────────────

export function addExpense(expense) {
  runSql(
    'INSERT INTO expenses (category, description, amount, date, notes) VALUES (?,?,?,?,?)',
    [expense.category, expense.description || '', expense.amount || 0, expense.date || '', expense.notes || '']
  );
  saveDb();
  return 'inserted';
}

export function getExpenses(filters = {}) {
  const conditions = ['1=1'];
  const params = [];
  if (filters.category) { conditions.push('category = ?'); params.push(filters.category); }
  if (filters.dateFrom) { conditions.push('date >= ?'); params.push(filters.dateFrom); }
  if (filters.dateTo) { conditions.push('date <= ?'); params.push(filters.dateTo); }
  const where = conditions.join(' AND ');
  return queryAll(`SELECT * FROM expenses WHERE ${where} ORDER BY date DESC, id DESC`, params);
}

export function deleteExpense(id) {
  runSql('DELETE FROM expenses WHERE id = ?', [parseInt(id)]);
  saveDb();
}

export function getExpensesSummary(dateFrom, dateTo) {
  const cond = [];
  const params = [];
  if (dateFrom) { cond.push('date >= ?'); params.push(dateFrom); }
  if (dateTo) { cond.push('date <= ?'); params.push(dateTo); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  const totalResult = db.exec(`SELECT COALESCE(SUM(amount),0) FROM expenses ${where}`, params);
  const totalExpenses = (totalResult.length > 0 && totalResult[0].values.length > 0) ? totalResult[0].values[0][0] : 0;

  const byCategory = queryAll(
    `SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses ${where} GROUP BY category ORDER BY total DESC`,
    params
  );

  return { totalExpenses, byCategory };
}

// ─── Inventory ──────────────────────────────────────────────────────────────

export function syncInventoryFromProducts() {
  const products = queryAll('SELECT sku, name, stock_quantity, stock_status, cost, low_stock_threshold FROM products WHERE sku IS NOT NULL AND sku != ""');
  let synced = 0;
  for (const p of products) {
    const existing = execCount('SELECT COUNT(*) FROM inventory WHERE sku = ?', [p.sku]);
    if (existing === 0) {
      runSql(
        `INSERT INTO inventory (sku, name, stock_quantity, low_stock_threshold, reorder_point, reorder_quantity, cost) VALUES (?,?,?,?,?,?,?)`,
        [p.sku, p.name || '', p.stock_quantity || 0, p.low_stock_threshold || 5, Math.max(5, Math.floor((p.stock_quantity || 0) * 0.3)), Math.max(10, Math.floor((p.stock_quantity || 0) * 0.5)), p.cost || 0]
      );
      synced++;
    } else {
      // Update stock from synced products
      runSql(
        `UPDATE inventory SET stock_quantity = ?, cost = CASE WHEN ? > 0 THEN ? ELSE cost END, updated_at = datetime('now') WHERE sku = ?`,
        [p.stock_quantity || 0, p.cost || 0, p.cost || 0, p.sku]
      );
    }
  }
  saveDb();
  return { total: products.length, synced };
}

export function upsertInventory(item) {
  const existing = execCount('SELECT COUNT(*) FROM inventory WHERE sku = ?', [item.sku]);
  if (existing > 0) {
    runSql(
      `UPDATE inventory SET name=?, stock_quantity=?, low_stock_threshold=?, reorder_point=?, reorder_quantity=?, cost=?, notes=?, updated_at=datetime('now') WHERE sku=?`,
      [item.name || '', item.stock_quantity || 0, item.low_stock_threshold || 5, item.reorder_point || 10, item.reorder_quantity || 20, item.cost || 0, item.notes || '', item.sku]
    );
  } else {
    runSql(
      `INSERT INTO inventory (sku, name, stock_quantity, low_stock_threshold, reorder_point, reorder_quantity, cost, last_restocked, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
      [item.sku, item.name || '', item.stock_quantity || 0, item.low_stock_threshold || 5, item.reorder_point || 10, item.reorder_quantity || 20, item.cost || 0, item.last_restocked || '', item.notes || '']
    );
  }
  saveDb();
  return 'upserted';
}

export function getInventory(filters = {}) {
  const conditions = ['1=1'];
  const params = [];
  if (filters.lowStock) { conditions.push('stock_quantity <= low_stock_threshold'); }
  if (filters.search) {
    conditions.push('(name LIKE ? OR sku LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s);
  }
  const where = conditions.join(' AND ');
  return queryAll(`SELECT * FROM inventory WHERE ${where} ORDER BY name ASC`, params);
}

export function updateStock(sku, quantity, notes) {
  runSql(
    `UPDATE inventory SET stock_quantity = ?, last_restocked = datetime('now'), notes = ?, updated_at = datetime('now') WHERE sku = ?`,
    [quantity, notes || '', sku]
  );
  saveDb();
}

export function getLowStockItems() {
  return queryAll('SELECT * FROM inventory WHERE stock_quantity <= low_stock_threshold ORDER BY stock_quantity ASC');
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export function verifyPin(pin) {
  const user = queryOne('SELECT * FROM auth WHERE pin = ? AND is_active = 1', [pin]);
  return user || null;
}

export function changePin(oldPin, newPin, name) {
  const user = verifyPin(oldPin);
  if (!user) return null;
  runSql('UPDATE auth SET pin = ?, name = COALESCE(?, name) WHERE id = ?', [newPin, name || null, user.id]);
  saveDb();
  return 'updated';
}

export function getAuthUsers() {
  return queryAll('SELECT id, name, role, is_active, created_at FROM auth');
}

// ─── Shipments ──────────────────────────────────────────────────────────────

export function addShipment(shipment) {
  runSql(
    `INSERT INTO shipments (order_id, source, source_order_id, shipping_company, tracking_number, status, status_ar, pickup_date, delivery_date, notes, raw_data) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [shipment.order_id || null, shipment.source || '', shipment.source_order_id || '', shipment.shipping_company || '', shipment.tracking_number || '', shipment.status || '', shipment.status_ar || '', shipment.pickup_date || '', shipment.delivery_date || '', shipment.notes || '', shipment.raw_data ? JSON.stringify(shipment.raw_data) : '']
  );
  saveDb();
  return 'inserted';
}

export function getShipments(filters = {}) {
  const conditions = ['1=1'];
  const params = [];
  if (filters.order_id) { conditions.push('order_id = ?'); params.push(parseInt(filters.order_id)); }
  if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
  if (filters.company) { conditions.push('shipping_company = ?'); params.push(filters.company); }
  const where = conditions.join(' AND ');
  return queryAll(`SELECT * FROM shipments WHERE ${where} ORDER BY id DESC`, params);
}

export function updateShipment(id, updates) {
  const fields = [];
  const params = [];
  for (const [key, val] of Object.entries(updates)) {
    if (['status', 'status_ar', 'tracking_number', 'delivery_date', 'notes'].includes(key)) {
      fields.push(`${key} = ?`);
      params.push(val);
    }
  }
  if (fields.length === 0) return 'no changes';
  fields.push("updated_at = datetime('now')");
  params.push(parseInt(id));
  runSql(`UPDATE shipments SET ${fields.join(', ')} WHERE id = ?`, params);
  saveDb();
  return 'updated';
}

// ─── Order Status History ───────────────────────────────────────────────────

export function updateOrderStatus(source, sourceOrderId, newStatus, changedBy, notes) {
  const order = queryOne('SELECT id, status FROM orders WHERE source = ? AND source_order_id = ?', [source, sourceOrderId]);
  if (!order) return null;

  const oldStatus = order.status || '';
  runSql('UPDATE orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [newStatus, order.id]);
  runSql(
    'INSERT INTO order_status_history (order_id, source, source_order_id, old_status, new_status, changed_by, notes) VALUES (?,?,?,?,?,?,?)',
    [order.id, source, sourceOrderId, oldStatus, newStatus, changedBy || 'user', notes || '']
  );

  // Update shipment status if exists
  if (newStatus === 'Shipped') {
    runSql("UPDATE shipments SET status = 'In Transit', status_ar = 'في الطريق' WHERE order_id = ?", [order.id]);
  } else if (newStatus === 'Delivered') {
    runSql("UPDATE shipments SET status = 'Delivered', status_ar = 'تم التوصيل', delivery_date = datetime('now') WHERE order_id = ?", [order.id]);
  }

  saveDb();
  return { oldStatus, newStatus, orderId: order.id };
}

export function getOrderStatusHistory(orderId) {
  return queryAll('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id DESC', [parseInt(orderId)]);
}

// ─── Rules ──────────────────────────────────────────────────────────────────

export function addRule(rule) {
  runSql(
    `INSERT INTO rules (name, type, condition_json, action_json, is_active) VALUES (?,?,?,?,?)`,
    [rule.name || '', rule.type || '', JSON.stringify(rule.condition || {}), JSON.stringify(rule.action || {}), rule.is_active != null ? rule.is_active : 1]
  );
  saveDb();
  return 'inserted';
}

export function getRules() {
  return queryAll('SELECT * FROM rules ORDER BY id DESC');
}

export function updateRule(id, updates) {
  const fields = [];
  const params = [];
  if (updates.name != null) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.is_active != null) { fields.push('is_active = ?'); params.push(updates.is_active ? 1 : 0); }
  if (updates.condition_json != null) { fields.push('condition_json = ?'); params.push(updates.condition_json); }
  if (updates.action_json != null) { fields.push('action_json = ?'); params.push(updates.action_json); }
  if (fields.length === 0) return 'no changes';
  params.push(parseInt(id));
  runSql(`UPDATE rules SET ${fields.join(', ')} WHERE id = ?`, params);
  saveDb();
  return 'updated';
}

export function deleteRule(id) {
  runSql('DELETE FROM rules WHERE id = ?', [parseInt(id)]);
  saveDb();
}

export function getActiveRules() {
  return queryAll("SELECT * FROM rules WHERE is_active = 1").map(r => ({
    ...r,
    condition: JSON.parse(r.condition_json || '{}'),
    action: JSON.parse(r.action_json || '{}'),
  }));
}

// ─── P&L Report ────────────────────────────────────────────────────────────

export function getProfitLoss(dateFrom, dateTo) {
  const orderCond = [];
  const params = [];
  if (dateFrom) { orderCond.push('order_date >= ?'); params.push(dateFrom); }
  if (dateTo) { orderCond.push('order_date <= ?'); params.push(dateTo); }
  const orderWhere = orderCond.length ? `AND ${orderCond.join(' AND ')}` : '';

  // Order revenue
  const orderResult = db.exec(`
    SELECT
      COALESCE(SUM(total_price),0) as revenue,
      COALESCE(SUM(cost),0) as cogs,
      COALESCE(SUM(profit),0) as gross_profit,
      COALESCE(SUM(shipping_cost),0) as shipping_cost,
      COALESCE(SUM(discount_amount),0) as discounts,
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
    FROM orders WHERE 1=1 ${orderWhere}
  `, params);

  let orders = {};
  if (orderResult.length > 0 && orderResult[0].values.length > 0) {
    const cols = orderResult[0].columns;
    const vals = orderResult[0].values[0];
    cols.forEach((c, i) => { orders[c] = vals[i] ?? 0; });
  }

  // Expenses
  const expCond = [];
  const expParams = [];
  if (dateFrom) { expCond.push('date >= ?'); expParams.push(dateFrom); }
  if (dateTo) { expCond.push('date <= ?'); expParams.push(dateTo); }
  const expWhere = expCond.length ? `WHERE ${expCond.join(' AND ')}` : '';

  const totalExpResult = db.exec(`SELECT COALESCE(SUM(amount),0) FROM expenses ${expWhere}`, expParams);
  const totalExpenses = (totalExpResult.length > 0 && totalExpResult[0].values.length > 0) ? totalExpResult[0].values[0][0] : 0;

  const expensesByCategory = queryAll(
    `SELECT category, SUM(amount) as total FROM expenses ${expWhere} GROUP BY category ORDER BY total DESC`,
    expParams
  );

  // Monthly breakdown
  const monthly = queryAll(`
    SELECT strftime('%Y-%m', order_date) as month,
      COALESCE(SUM(total_price),0) as revenue,
      COALESCE(SUM(cost),0) as cogs,
      COALESCE(SUM(profit),0) as profit,
      COUNT(*) as orders
    FROM orders WHERE 1=1 ${orderWhere}
    GROUP BY month ORDER BY month ASC
  `, params);

  const revenue = orders.revenue || 0;
  const cogs = orders.cogs || 0;
  const grossProfit = orders.gross_profit || 0;
  const netProfit = grossProfit - totalExpenses;
  const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;

  return {
    summary: {
      revenue,
      cogs,
      grossProfit,
      totalExpenses,
      netProfit,
      netMargin: parseFloat(netMargin),
      shippingCost: orders.shipping_cost || 0,
      discounts: orders.discounts || 0,
      totalOrders: orders.total_orders || 0,
      delivered: orders.delivered || 0,
      cancelled: orders.cancelled || 0,
    },
    expensesByCategory,
    monthly,
  };
}

// ─── Customers ─────────────────────────────────────────────────────────────

export function getCustomers(filters = {}) {
  const conditions = ['customer_phone IS NOT NULL', "customer_phone != ''"];
  const params = [];

  if (filters.search) {
    conditions.push('(customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  const where = conditions.join(' AND ');
  const allowedSort = ['customer_name', 'total_orders', 'total_spent', 'last_order_date'];
  const sortBy = allowedSort.includes(filters.sortBy) ? filters.sortBy : 'total_spent';
  const sortDir = filters.sortDir === 'asc' ? 'ASC' : 'DESC';

  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(500, parseInt(filters.limit) || 50);
  const offset = (page - 1) * limit;

  const total = execCount(`SELECT COUNT(DISTINCT customer_phone) FROM orders WHERE ${where}`, params);

  const customers = queryAll(`
    SELECT
      customer_phone as phone,
      customer_name as name,
      customer_email as email,
      customer_governorate as governorate,
      customer_address as address,
      COUNT(*) as total_orders,
      COALESCE(SUM(total_price), 0) as total_spent,
      COALESCE(SUM(profit), 0) as total_profit,
      COALESCE(AVG(total_price), 0) as avg_order_value,
      MIN(order_date) as first_order_date,
      MAX(order_date) as last_order_date,
      GROUP_CONCAT(DISTINCT channel) as channels,
      SUM(CASE WHEN status IN ('Delivered','Fulfilled') THEN 1 ELSE 0 END) as delivered_count,
      SUM(CASE WHEN status IN ('Cancelled','Failed','Rejected') THEN 1 ELSE 0 END) as cancelled_count
    FROM orders
    WHERE ${where}
    GROUP BY customer_phone
    ORDER BY ${sortBy} ${sortDir}
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  return { customers, total, page, limit };
}

export function getCustomerByPhone(phone) {
  const customers = queryAll(`
    SELECT
      customer_phone as phone,
      customer_name as name,
      customer_email as email,
      customer_governorate as governorate,
      customer_address as address,
      COUNT(*) as total_orders,
      COALESCE(SUM(total_price), 0) as total_spent,
      COALESCE(SUM(profit), 0) as total_profit,
      COALESCE(AVG(total_price), 0) as avg_order_value,
      MIN(order_date) as first_order_date,
      MAX(order_date) as last_order_date,
      GROUP_CONCAT(DISTINCT channel) as channels,
      SUM(CASE WHEN status IN ('Delivered','Fulfilled') THEN 1 ELSE 0 END) as delivered_count,
      SUM(CASE WHEN status IN ('Cancelled','Failed','Rejected') THEN 1 ELSE 0 END) as cancelled_count
    FROM orders WHERE customer_phone = ?
    GROUP BY customer_phone
  `, [phone]);
  return customers.length > 0 ? customers[0] : null;
}

export function getCustomerOrders(phone) {
  return queryAll(
    'SELECT * FROM orders WHERE customer_phone = ? ORDER BY order_date DESC',
    [phone]
  );
}

// ─── Seed Data ─────────────────────────────────────────────────────────────

export function seedInventoryFromProducts() {
  const existing = execCount('SELECT COUNT(*) FROM inventory');
  if (existing > 0) return { seeded: 0, message: 'Inventory already has data' };

  const products = queryAll('SELECT sku, name, price, cost FROM products WHERE sku IS NOT NULL AND sku != ""');
  let seeded = 0;

  for (const p of products) {
    try {
      runSql('INSERT OR IGNORE INTO inventory (sku, name, stock_quantity, low_stock_threshold, cost) VALUES (?, ?, ?, ?, ?)',
        [p.sku, p.name, Math.floor(Math.random() * 50) + 5, 5, p.cost || 0]);
      seeded++;
    } catch (e) { /* skip duplicates */ }
  }

  saveDb();
  return { seeded, message: `Seeded ${seeded} inventory items from products` };
}

export function seedDemoExpenses() {
  const existing = execCount('SELECT COUNT(*) FROM expenses');
  if (existing > 0) return { seeded: 0, message: 'Expenses already has data' };

  const categories = [
    { category: 'Rent', desc: 'Monthly office rent', amount: 8500 },
    { category: 'Utilities', desc: 'Electricity bill', amount: 1200 },
    { category: 'Utilities', desc: 'Internet & phone', amount: 650 },
    { category: 'Marketing', desc: 'Facebook ads', amount: 3500 },
    { category: 'Marketing', desc: 'Instagram promotions', amount: 1800 },
    { category: 'Salaries', desc: 'Staff salaries', amount: 25000 },
    { category: 'Packaging', desc: 'Boxes & materials', amount: 2200 },
    { category: 'Transport', desc: 'Delivery van fuel', amount: 1500 },
    { category: 'Office', desc: 'Office supplies', amount: 450 },
    { category: 'Insurance', desc: 'Business insurance', amount: 1200 },
  ];

  let seeded = 0;
  for (const e of categories) {
    const month = String(Math.floor(Math.random() * 3) + 7).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    runSql('INSERT INTO expenses (category, description, amount, date) VALUES (?, ?, ?, ?)',
      [e.category, e.desc, e.amount, `2026-${month}-${day}`]);
    seeded++;
  }

  saveDb();
  return { seeded, message: `Seeded ${seeded} demo expenses` };
}
