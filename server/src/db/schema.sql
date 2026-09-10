CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_order_id TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  customer_governorate TEXT,
  customer_delivery_zone TEXT,
  customer_notes TEXT,
  product_name TEXT,
  product_sku TEXT,
  product_image_url TEXT,
  product_url TEXT,
  mirror_type TEXT,
  mirror_dimensions TEXT,
  mirror_size TEXT,
  mirror_color TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price REAL DEFAULT 0,
  total_price REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  profit_margin REAL DEFAULT 0,
  shipping_cost REAL DEFAULT 0,
  cod_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT,
  status TEXT,
  status_ar TEXT,
  order_date TEXT,
  order_timestamp TEXT,
  expected_delivery_date TEXT,
  actual_delivery_date TEXT,
  shipped_date TEXT,
  delivered_date TEXT,
  is_delayed INTEGER DEFAULT 0,
  delay_days INTEGER DEFAULT 0,
  delivery_attempts INTEGER DEFAULT 0,
  return_reason TEXT,
  channel TEXT,
  referral_source TEXT,
  origin_url TEXT,
  raw_data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(source, source_order_id)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  name_ar TEXT,
  sku TEXT UNIQUE,
  barcode TEXT,
  category TEXT,
  category_ar TEXT,
  subcategory TEXT,
  mirror_type TEXT,
  mirror_shape TEXT,
  dimensions TEXT,
  width REAL,
  height REAL,
  depth REAL,
  weight REAL,
  color TEXT,
  material TEXT,
  frame_type TEXT,
  lighting_type TEXT,
  has_touch INTEGER DEFAULT 0,
  has_led INTEGER DEFAULT 0,
  has_bluetooth INTEGER DEFAULT 0,
  description TEXT,
  description_ar TEXT,
  price REAL DEFAULT 0,
  price_usd REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  profit_margin REAL DEFAULT 0,
  compare_at_price REAL DEFAULT 0,
  image_url TEXT,
  gallery_images TEXT,
  stock_quantity INTEGER DEFAULT 0,
  stock_status TEXT,
  low_stock_threshold INTEGER DEFAULT 5,
  sku_code TEXT,
  weight_kg REAL,
  source TEXT,
  source_url TEXT,
  is_active INTEGER DEFAULT 1,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT,
  status TEXT,
  records_synced INTEGER DEFAULT 0,
  orders_synced INTEGER DEFAULT 0,
  products_synced INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER DEFAULT 0,
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS daily_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE,
  total_orders INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0,
  total_costs REAL DEFAULT 0,
  total_profit REAL DEFAULT 0,
  total_cod REAL DEFAULT 0,
  total_shipping REAL DEFAULT 0,
  delayed_orders INTEGER DEFAULT 0,
  delivered_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  orders_mostwda3 INTEGER DEFAULT 0,
  orders_chichomz INTEGER DEFAULT 0,
  orders_raneen INTEGER DEFAULT 0,
  orders_saraydecore INTEGER DEFAULT 0,
  revenue_mostwda3 REAL DEFAULT 0,
  revenue_chichomz REAL DEFAULT 0,
  revenue_raneen REAL DEFAULT 0,
  revenue_saraydecore REAL DEFAULT 0,
  avg_order_value REAL DEFAULT 0,
  top_product TEXT,
  top_governorate TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_source_id ON orders(source, source_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_governorate ON orders(customer_governorate);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_mirror_type ON products(mirror_type);
