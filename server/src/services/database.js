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

export function runSql(sql, params = []) {
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
    'CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)',
    'CREATE INDEX IF NOT EXISTS idx_estimates_customer ON estimates(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status)',
    'CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id)',
    'CREATE INDEX IF NOT EXISTS idx_credit_notes_customer ON credit_notes(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_customers_erp_phone ON customers_erp(phone)',
    'CREATE INDEX IF NOT EXISTS idx_customers_erp_company ON customers_erp(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON sync_logs(source)',
    'CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON sync_logs(started_at)',
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

  // ─── ERP Tables ────────────────────────────────────────────────────────────

  runSql(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT DEFAULT '',
      tax_number TEXT DEFAULT '',
      commercial_register TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      governorate TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      website TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS customers_erp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT DEFAULT '',
      company_id INTEGER,
      type TEXT DEFAULT 'individual',
      tax_number TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      phone2 TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      governorate TEXT DEFAULT '',
      country TEXT DEFAULT 'Egypt',
      credit_limit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      payment_terms INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      company_id INTEGER,
      type TEXT DEFAULT 'invoice',
      status TEXT DEFAULT 'draft',
      date TEXT DEFAULT (date('now')),
      due_date TEXT DEFAULT '',
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_percent REAL DEFAULT 14,
      shipping_cost REAL DEFAULT 0,
      total REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance_due REAL DEFAULT 0,
      currency TEXT DEFAULT 'EGP',
      payment_terms TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      terms TEXT DEFAULT '',
      internal_notes TEXT DEFAULT '',
      reference TEXT DEFAULT '',
      parent_invoice_id INTEGER,
      created_by TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers_erp(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT DEFAULT '',
      description TEXT DEFAULT '',
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      tax_percent REAL DEFAULT 14,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS estimates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estimate_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      company_id INTEGER,
      status TEXT DEFAULT 'draft',
      date TEXT DEFAULT (date('now')),
      expiry_date TEXT DEFAULT '',
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_percent REAL DEFAULT 14,
      shipping_cost REAL DEFAULT 0,
      total REAL DEFAULT 0,
      currency TEXT DEFAULT 'EGP',
      notes TEXT DEFAULT '',
      terms TEXT DEFAULT '',
      converted_invoice_id INTEGER,
      created_by TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers_erp(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS estimate_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estimate_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT DEFAULT '',
      description TEXT DEFAULT '',
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      tax_percent REAL DEFAULT 14,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS credit_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credit_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      invoice_id INTEGER,
      type TEXT DEFAULT 'credit_note',
      status TEXT DEFAULT 'draft',
      date TEXT DEFAULT (date('now')),
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_percent REAL DEFAULT 14,
      total REAL DEFAULT 0,
      reason TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      applied_to_invoice INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers_erp(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS credit_note_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credit_note_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT DEFAULT '',
      description TEXT DEFAULT '',
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      tax_percent REAL DEFAULT 14,
      total REAL DEFAULT 0,
      FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      invoice_id INTEGER,
      credit_note_id INTEGER,
      amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      payment_date TEXT DEFAULT (date('now')),
      reference TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      cheque_number TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers_erp(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS recurring_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '',
      customer_id INTEGER,
      frequency TEXT DEFAULT 'monthly',
      start_date TEXT DEFAULT (date('now')),
      next_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      template_json TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      last_generated TEXT DEFAULT '',
      generated_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers_erp(id)
    );
  `);

  // ── Purchasing / Procurement ─────────────────────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT DEFAULT '',
      contact_person TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      governorate TEXT DEFAULT '',
      country TEXT DEFAULT 'Egypt',
      tax_number TEXT DEFAULT '',
      payment_terms INTEGER DEFAULT 30,
      credit_limit REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER,
      status TEXT DEFAULT 'draft',
      order_date TEXT DEFAULT (date('now')),
      expected_date TEXT DEFAULT '',
      received_date TEXT DEFAULT '',
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_percent REAL DEFAULT 14,
      shipping_cost REAL DEFAULT 0,
      total REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance_due REAL DEFAULT 0,
      currency TEXT DEFAULT 'EGP',
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT DEFAULT '',
      sku TEXT DEFAULT '',
      quantity REAL DEFAULT 1,
      received_quantity REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      tax_percent REAL DEFAULT 14,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS goods_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grn_number TEXT UNIQUE NOT NULL,
      po_id INTEGER,
      supplier_id INTEGER,
      receipt_date TEXT DEFAULT (date('now')),
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS goods_receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grn_id INTEGER NOT NULL,
      po_item_id INTEGER,
      product_id INTEGER,
      product_name TEXT DEFAULT '',
      sku TEXT DEFAULT '',
      expected_qty REAL DEFAULT 0,
      received_qty REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      FOREIGN KEY (grn_id) REFERENCES goods_receipts(id) ON DELETE CASCADE
    );
  `);

  // ── HR / Payroll ────────────────────────────────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      name_ar TEXT DEFAULT '',
      national_id TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      department TEXT DEFAULT '',
      job_title TEXT DEFAULT '',
      hire_date TEXT DEFAULT '',
      termination_date TEXT DEFAULT '',
      employment_type TEXT DEFAULT 'full_time',
      basic_salary REAL DEFAULT 0,
      allowances REAL DEFAULT 0,
      bank_account TEXT DEFAULT '',
      address TEXT DEFAULT '',
      emergency_contact TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT DEFAULT '',
      check_out TEXT DEFAULT '',
      hours_worked REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      status TEXT DEFAULT 'present',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(employee_id, date)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_number TEXT UNIQUE NOT NULL,
      employee_id INTEGER NOT NULL,
      period_month TEXT NOT NULL,
      basic_salary REAL DEFAULT 0,
      allowances REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      bonuses REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      tax_deduction REAL DEFAULT 0,
      social_insurance REAL DEFAULT 0,
      net_salary REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      paid_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type TEXT DEFAULT 'annual',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days INTEGER DEFAULT 1,
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      approved_by TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
  `);

  // ── General Ledger / Accounting ──────────────────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_code TEXT UNIQUE NOT NULL,
      account_name TEXT NOT NULL,
      account_name_ar TEXT DEFAULT '',
      account_type TEXT NOT NULL,
      parent_id INTEGER,
      normal_balance TEXT DEFAULT 'debit',
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_number TEXT UNIQUE NOT NULL,
      date TEXT DEFAULT (date('now')),
      description TEXT DEFAULT '',
      reference TEXT DEFAULT '',
      source_type TEXT DEFAULT 'manual',
      source_id INTEGER,
      status TEXT DEFAULT 'posted',
      created_by TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      description TEXT DEFAULT '',
      FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
    );
  `);

  // ── Bank Accounts & Reconciliation ──────────────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT DEFAULT '',
      iban TEXT DEFAULT '',
      currency TEXT DEFAULT 'EGP',
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_account_id INTEGER NOT NULL,
      transaction_date TEXT NOT NULL,
      description TEXT DEFAULT '',
      reference TEXT DEFAULT '',
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      is_reconciled INTEGER DEFAULT 0,
      reconciled_at TEXT DEFAULT '',
      payment_id INTEGER,
      journal_entry_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
    );
  `);

  // ── Fixed Assets ──────────────────────────────────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS fixed_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT UNIQUE NOT NULL,
      asset_name TEXT NOT NULL,
      category TEXT DEFAULT '',
      description TEXT DEFAULT '',
      purchase_date TEXT DEFAULT '',
      purchase_price REAL DEFAULT 0,
      salvage_value REAL DEFAULT 0,
      useful_life_years INTEGER DEFAULT 5,
      depreciation_method TEXT DEFAULT 'straight_line',
      accumulated_depreciation REAL DEFAULT 0,
      current_value REAL DEFAULT 0,
      location TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS asset_depreciation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      period TEXT NOT NULL,
      depreciation_amount REAL DEFAULT 0,
      accumulated_total REAL DEFAULT 0,
      book_value REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (asset_id) REFERENCES fixed_assets(id)
    );
  `);

  // ── Tax Configuration ──────────────────────────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS tax_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rate REAL NOT NULL,
      type TEXT DEFAULT 'vat',
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Currencies & Exchange Rates ────────────────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS currencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      symbol TEXT DEFAULT '',
      is_base INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      effective_date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Warehouse Locations & Transfers ──────────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      address TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS warehouse_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL,
      zone TEXT DEFAULT '',
      aisle TEXT DEFAULT '',
      shelf TEXT DEFAULT '',
      bin TEXT DEFAULT '',
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_number TEXT UNIQUE NOT NULL,
      from_warehouse_id INTEGER,
      to_warehouse_id INTEGER,
      status TEXT DEFAULT 'draft',
      transfer_date TEXT DEFAULT (date('now')),
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id)
    );
  `);

  runSql(`
    CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_id INTEGER NOT NULL,
      sku TEXT DEFAULT '',
      product_name TEXT DEFAULT '',
      quantity REAL DEFAULT 0,
      from_location_id INTEGER,
      to_location_id INTEGER,
      FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE
    );
  `);

  // ── Notifications / Alerts log ────────────────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT DEFAULT '',
      entity_type TEXT DEFAULT '',
      entity_id INTEGER,
      is_read INTEGER DEFAULT 0,
      rule_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Manual customers (not from orders) ───────────────────────────────
  runSql(`
    CREATE TABLE IF NOT EXISTS manual_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      governorate TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Daily Summary ──────────────────────────────────────────────────────
  runSql(`
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
      avg_order_value REAL DEFAULT 0
    );
  `);

  // Insert default chart of accounts if empty
  const coaCount = execCount('SELECT COUNT(*) FROM chart_of_accounts');
  if (coaCount === 0) {
    const defaultAccounts = [
      ['1000', 'Assets', 'Assets', 'asset', null, 'debit'],
      ['1100', 'Current Assets', 'الأصول المتداولة', 'asset', null, 'debit'],
      ['1110', 'Cash', 'النقدية', 'asset', null, 'debit'],
      ['1120', 'Bank', 'البنك', 'asset', null, 'debit'],
      ['1130', 'Accounts Receivable', 'المدينون', 'asset', null, 'debit'],
      ['1140', 'Inventory', 'المخزون', 'asset', null, 'debit'],
      ['1200', 'Fixed Assets', 'الأصول الثابتة', 'asset', null, 'debit'],
      ['2000', 'Liabilities', 'الخصوم', 'liability', null, 'credit'],
      ['2100', 'Current Liabilities', 'الخصوم المتداولة', 'liability', null, 'credit'],
      ['2110', 'Accounts Payable', 'الدائنون', 'liability', null, 'credit'],
      ['2120', 'VAT Payable', 'ضريبة القيمة المضافة', 'liability', null, 'credit'],
      ['3000', 'Equity', 'حقوق الملكية', 'equity', null, 'credit'],
      ['3100', 'Retained Earnings', 'الأرباح المحتجزة', 'equity', null, 'credit'],
      ['4000', 'Revenue', 'الإيرادات', 'revenue', null, 'credit'],
      ['4100', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', null, 'credit'],
      ['5000', 'Expenses', 'المصروفات', 'expense', null, 'debit'],
      ['5100', 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', 'expense', null, 'debit'],
      ['5200', 'Operating Expenses', 'المصروفات التشغيلية', 'expense', null, 'debit'],
      ['5300', 'Payroll Expense', 'مصروفات الرواتب', 'expense', null, 'debit'],
    ];
    for (const [code, name, nameAr, type, parent, normal] of defaultAccounts) {
      runSql(`INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, normal_balance) VALUES (?,?,?,?,?,?)`,
        [code, name, nameAr, type, parent, normal]);
    }
  }

  // Insert default tax rates if empty
  const taxCount = execCount('SELECT COUNT(*) FROM tax_rates');
  if (taxCount === 0) {
    runSql(`INSERT INTO tax_rates (name, rate, type, is_default, is_active) VALUES ('VAT 14%', 14, 'vat', 1, 1)`);
    runSql(`INSERT INTO tax_rates (name, rate, type, is_default, is_active) VALUES ('VAT 0%', 0, 'vat', 0, 1)`);
    runSql(`INSERT INTO tax_rates (name, rate, type, is_default, is_active) VALUES ('Exempt', 0, 'exempt', 0, 1)`);
  }

  // Insert default currencies if empty
  const currCount = execCount('SELECT COUNT(*) FROM currencies');
  if (currCount === 0) {
    runSql(`INSERT INTO currencies (code, name, symbol, is_base, is_active) VALUES ('EGP', 'Egyptian Pound', 'ج.م', 1, 1)`);
    runSql(`INSERT INTO currencies (code, name, symbol, is_base, is_active) VALUES ('USD', 'US Dollar', '$', 0, 1)`);
    runSql(`INSERT INTO currencies (code, name, symbol, is_base, is_active) VALUES ('EUR', 'Euro', '€', 0, 1)`);
    runSql(`INSERT INTO currencies (code, name, symbol, is_base, is_active) VALUES ('SAR', 'Saudi Riyal', 'ر.س', 0, 1)`);
  }

  // Insert default admin PIN if none exists
  const authCount = execCount('SELECT COUNT(*) FROM auth');
  if (authCount === 0) {
    runSql("INSERT INTO auth (pin, name, role) VALUES ('1234', 'Admin', 'admin')");
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

export function queryAll(sql, params = []) {
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

export function queryOne(sql, params = []) {
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

export function execCount(sql, params = []) {
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

export function updateStock(sku, quantity, notes, low_stock_threshold, cost) {
  const fields = [`stock_quantity = ?`, `last_restocked = datetime('now')`, `notes = ?`, `updated_at = datetime('now')`];
  const params = [quantity, notes || ''];
  if (low_stock_threshold != null) { fields.splice(2, 0, 'low_stock_threshold = ?'); params.splice(2, 0, low_stock_threshold); }
  if (cost != null && cost >= 0) { fields.splice(-1, 0, 'cost = ?'); params.splice(-1, 0, cost); }
  params.push(sku);
  runSql(`UPDATE inventory SET ${fields.join(', ')} WHERE sku = ?`, params);
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

// ═══════════════════════════════════════════════════════════════════════════════
// ERP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Companies ──────────────────────────────────────────────────────────────

export function getCompanies(filters = {}) {
  let where = '1=1';
  const params = [];
  if (filters.search) { where += ' AND (name LIKE ? OR name_ar LIKE ? OR phone LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s, s); }
  if (filters.is_active !== undefined) { where += ' AND is_active = ?'; params.push(filters.is_active); }
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(500, parseInt(filters.limit) || 50);
  const offset = (page - 1) * limit;
  const total = execCount(`SELECT COUNT(*) FROM companies WHERE ${where}`, params);
  const companies = queryAll(`SELECT * FROM companies WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  return { companies, total, page, limit };
}

export function getCompanyById(id) {
  return queryOne('SELECT * FROM companies WHERE id = ?', [parseInt(id)]);
}

export function createCompany(data) {
  runSql(`INSERT INTO companies (name, name_ar, tax_number, commercial_register, address, city, governorate, phone, email, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.name_ar || '', data.tax_number || '', data.commercial_register || '', data.address || '',
     data.city || '', data.governorate || '', data.phone || '', data.email || '', data.website || '', data.notes || '']);
  const row = queryOne('SELECT last_insert_rowid() as id');
  saveDb();
  return row?.id;
}

export function updateCompany(id, data) {
  const fields = [];
  const params = [];
  for (const [k, v] of Object.entries(data)) {
    if (['name','name_ar','tax_number','commercial_register','address','city','governorate','phone','email','website','notes','is_active'].includes(k)) {
      fields.push(`${k} = ?`); params.push(v);
    }
  }
  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now')");
  params.push(parseInt(id));
  runSql(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`, params);
  saveDb();
  return true;
}

export function deleteCompany(id) {
  runSql('DELETE FROM companies WHERE id = ?', [parseInt(id)]);
  saveDb();
  return true;
}

// ─── ERP Customers ──────────────────────────────────────────────────────────

export function getCustomersERP(filters = {}) {
  let where = '1=1';
  const params = [];
  if (filters.search) { where += ' AND (c.name LIKE ? OR c.name_ar LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s, s, s); }
  if (filters.company_id) { where += ' AND c.company_id = ?'; params.push(parseInt(filters.company_id)); }
  if (filters.type) { where += ' AND c.type = ?'; params.push(filters.type); }
  if (filters.is_active !== undefined) { where += ' AND c.is_active = ?'; params.push(filters.is_active); }
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(500, parseInt(filters.limit) || 50);
  const offset = (page - 1) * limit;
  const total = execCount(`SELECT COUNT(*) FROM customers_erp c WHERE ${where}`, params);
  const customers = queryAll(`
    SELECT c.*, comp.name as company_name,
      (SELECT COUNT(*) FROM invoices WHERE customer_id = c.id) as invoice_count,
      (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE customer_id = c.id AND status != 'cancelled') as total_invoiced,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id) as total_paid,
      (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE customer_id = c.id AND status != 'cancelled') - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id) as balance
    FROM customers_erp c LEFT JOIN companies comp ON c.company_id = comp.id
    WHERE ${where} ORDER BY c.name ASC LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  return { customers, total, page, limit };
}

export function getCustomerERPById(id) {
  return queryOne(`
    SELECT c.*, comp.name as company_name FROM customers_erp c
    LEFT JOIN companies comp ON c.company_id = comp.id WHERE c.id = ?
  `, [parseInt(id)]);
}

export function createCustomerERP(data) {
  runSql(`INSERT INTO customers_erp (name, name_ar, company_id, type, tax_number, email, phone, phone2, address, city, governorate, country, credit_limit, payment_terms, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.name_ar || '', data.company_id || null, data.type || 'individual', data.tax_number || '',
     data.email || '', data.phone || '', data.phone2 || '', data.address || '', data.city || '',
     data.governorate || '', data.country || 'Egypt', data.credit_limit || 0, data.payment_terms || 0, data.notes || '']);
  const row = queryOne('SELECT last_insert_rowid() as id');
  saveDb();
  return row?.id;
}

export function updateCustomerERP(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['name','name_ar','company_id','type','tax_number','email','phone','phone2','address','city','governorate','country','credit_limit','payment_terms','notes','is_active'];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { fields.push(`${k} = ?`); params.push(v); }
  }
  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now')");
  params.push(parseInt(id));
  runSql(`UPDATE customers_erp SET ${fields.join(', ')} WHERE id = ?`, params);
  saveDb();
  return true;
}

export function deleteCustomerERP(id) {
  runSql('DELETE FROM customers_erp WHERE id = ?', [parseInt(id)]);
  saveDb();
  return true;
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export function getNextInvoiceNumber() {
  const row = queryOne("SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1");
  if (!row || !row.invoice_number) return 'INV-0001';
  const num = parseInt(row.invoice_number.replace('INV-', '')) || 0;
  return `INV-${String(num + 1).padStart(4, '0')}`;
}

export function getInvoices(filters = {}) {
  let where = '1=1';
  const params = [];
  if (filters.customer_id) { where += ' AND i.customer_id = ?'; params.push(parseInt(filters.customer_id)); }
  if (filters.status) { where += ' AND i.status = ?'; params.push(filters.status); }
  if (filters.type) { where += ' AND i.type = ?'; params.push(filters.type); }
  if (filters.dateFrom) { where += ' AND i.date >= ?'; params.push(filters.dateFrom); }
  if (filters.dateTo) { where += ' AND i.date <= ?'; params.push(filters.dateTo); }
  if (filters.search) { where += ' AND (i.invoice_number LIKE ? OR i.reference LIKE ? OR c.name LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s, s); }
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(500, parseInt(filters.limit) || 50);
  const offset = (page - 1) * limit;
  const total = execCount(`SELECT COUNT(*) FROM invoices i LEFT JOIN customers_erp c ON i.customer_id = c.id WHERE ${where}`, params);
  const invoices = queryAll(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, comp.name as company_name
    FROM invoices i LEFT JOIN customers_erp c ON i.customer_id = c.id LEFT JOIN companies comp ON i.company_id = comp.id
    WHERE ${where} ORDER BY i.date DESC, i.id DESC LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  return { invoices, total, page, limit };
}

export function getInvoiceById(id) {
  const invoice = queryOne(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
      c.address as customer_address, c.city as customer_city, c.governorate as customer_governorate,
      c.tax_number as customer_tax_number, comp.name as company_name
    FROM invoices i LEFT JOIN customers_erp c ON i.customer_id = c.id LEFT JOIN companies comp ON i.company_id = comp.id
    WHERE i.id = ?
  `, [parseInt(id)]);
  if (!invoice) return null;
  invoice.items = queryAll('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order', [parseInt(id)]);
  invoice.payments = queryAll('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date', [parseInt(id)]);
  return invoice;
}

export function createInvoice(data) {
  const invoiceNumber = data.invoice_number || getNextInvoiceNumber();
  runSql(`INSERT INTO invoices (invoice_number, customer_id, company_id, type, status, date, due_date, subtotal, discount_amount, discount_percent, tax_amount, tax_percent, shipping_cost, total, amount_paid, balance_due, currency, payment_terms, notes, terms, internal_notes, reference, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoiceNumber, data.customer_id || null, data.company_id || null, data.type || 'invoice', data.status || 'draft',
     data.date || new Date().toISOString().slice(0, 10), data.due_date || '', data.subtotal || 0,
     data.discount_amount || 0, data.discount_percent || 0, data.tax_amount || 0, data.tax_percent || 14,
     data.shipping_cost || 0, data.total || 0, data.amount_paid || 0, data.balance_due || data.total || 0,
     data.currency || 'EGP', data.payment_terms || '', data.notes || '', data.terms || '',
     data.internal_notes || '', data.reference || '', data.created_by || 'admin']);
  const row = queryOne('SELECT last_insert_rowid() as id');
  const invoiceId = row?.id;

  if (data.items && data.items.length > 0) {
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      runSql(`INSERT INTO invoice_items (invoice_id, product_id, product_name, description, quantity, unit_price, discount_percent, tax_percent, total, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceId, item.product_id || null, item.product_name || '', item.description || '',
         item.quantity || 1, item.unit_price || 0, item.discount_percent || 0, item.tax_percent || 14,
         item.total || (item.quantity || 1) * (item.unit_price || 0), i]);
    }
  }
  saveDb();
  return invoiceId;
}

export function updateInvoice(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['customer_id','company_id','status','date','due_date','subtotal','discount_amount','discount_percent','tax_amount','tax_percent','shipping_cost','total','amount_paid','balance_due','payment_terms','notes','terms','internal_notes','reference'];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { fields.push(`${k} = ?`); params.push(v); }
  }
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    params.push(parseInt(id));
    runSql(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`, params);
  }
  if (data.items) {
    runSql('DELETE FROM invoice_items WHERE invoice_id = ?', [parseInt(id)]);
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      runSql(`INSERT INTO invoice_items (invoice_id, product_id, product_name, description, quantity, unit_price, discount_percent, tax_percent, total, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.product_id || null, item.product_name || '', item.description || '',
         item.quantity || 1, item.unit_price || 0, item.discount_percent || 0, item.tax_percent || 14,
         item.total || 0, i]);
    }
  }
  saveDb();
  return true;
}

export function deleteInvoice(id) {
  runSql('DELETE FROM invoice_items WHERE invoice_id = ?', [parseInt(id)]);
  runSql('DELETE FROM payments WHERE invoice_id = ?', [parseInt(id)]);
  runSql('DELETE FROM invoices WHERE id = ?', [parseInt(id)]);
  saveDb();
  return true;
}

// ─── Estimates ──────────────────────────────────────────────────────────────

export function getNextEstimateNumber() {
  const row = queryOne("SELECT estimate_number FROM estimates ORDER BY id DESC LIMIT 1");
  if (!row || !row.estimate_number) return 'EST-0001';
  const num = parseInt(row.estimate_number.replace('EST-', '')) || 0;
  return `EST-${String(num + 1).padStart(4, '0')}`;
}

export function getEstimates(filters = {}) {
  let where = '1=1';
  const params = [];
  if (filters.customer_id) { where += ' AND e.customer_id = ?'; params.push(parseInt(filters.customer_id)); }
  if (filters.status) { where += ' AND e.status = ?'; params.push(filters.status); }
  if (filters.search) { where += ' AND (e.estimate_number LIKE ? OR c.name LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s); }
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(500, parseInt(filters.limit) || 50);
  const offset = (page - 1) * limit;
  const total = execCount(`SELECT COUNT(*) FROM estimates e LEFT JOIN customers_erp c ON e.customer_id = c.id WHERE ${where}`, params);
  const estimates = queryAll(`
    SELECT e.*, c.name as customer_name, c.phone as customer_phone, comp.name as company_name
    FROM estimates e LEFT JOIN customers_erp c ON e.customer_id = c.id LEFT JOIN companies comp ON e.company_id = comp.id
    WHERE ${where} ORDER BY e.date DESC, e.id DESC LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  return { estimates, total, page, limit };
}

export function getEstimateById(id) {
  const est = queryOne(`
    SELECT e.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
      c.address as customer_address, comp.name as company_name
    FROM estimates e LEFT JOIN customers_erp c ON e.customer_id = c.id LEFT JOIN companies comp ON e.company_id = comp.id
    WHERE e.id = ?
  `, [parseInt(id)]);
  if (!est) return null;
  est.items = queryAll('SELECT * FROM estimate_items WHERE estimate_id = ? ORDER BY sort_order', [parseInt(id)]);
  return est;
}

export function createEstimate(data) {
  const estimateNumber = data.estimate_number || getNextEstimateNumber();
  runSql(`INSERT INTO estimates (estimate_number, customer_id, company_id, status, date, expiry_date, subtotal, discount_amount, discount_percent, tax_amount, tax_percent, shipping_cost, total, currency, notes, terms, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [estimateNumber, data.customer_id || null, data.company_id || null, data.status || 'draft',
     data.date || new Date().toISOString().slice(0, 10), data.expiry_date || '', data.subtotal || 0,
     data.discount_amount || 0, data.discount_percent || 0, data.tax_amount || 0, data.tax_percent || 14,
     data.shipping_cost || 0, data.total || 0, data.currency || 'EGP', data.notes || '', data.terms || '',
     data.created_by || 'admin']);
  const row = queryOne('SELECT last_insert_rowid() as id');
  const estId = row?.id;
  if (data.items && data.items.length > 0) {
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      runSql(`INSERT INTO estimate_items (estimate_id, product_id, product_name, description, quantity, unit_price, discount_percent, tax_percent, total, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [estId, item.product_id || null, item.product_name || '', item.description || '',
         item.quantity || 1, item.unit_price || 0, item.discount_percent || 0, item.tax_percent || 14,
         item.total || 0, i]);
    }
  }
  saveDb();
  return estId;
}

export function updateEstimate(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['customer_id','company_id','status','date','expiry_date','subtotal','discount_amount','discount_percent','tax_amount','tax_percent','shipping_cost','total','notes','terms','converted_invoice_id'];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { fields.push(`${k} = ?`); params.push(v); }
  }
  if (fields.length > 0) { fields.push("updated_at = datetime('now')"); params.push(parseInt(id)); runSql(`UPDATE estimates SET ${fields.join(', ')} WHERE id = ?`, params); }
  if (data.items) {
    runSql('DELETE FROM estimate_items WHERE estimate_id = ?', [parseInt(id)]);
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      runSql(`INSERT INTO estimate_items (estimate_id, product_id, product_name, description, quantity, unit_price, discount_percent, tax_percent, total, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.product_id || null, item.product_name || '', item.description || '',
         item.quantity || 1, item.unit_price || 0, item.discount_percent || 0, item.tax_percent || 14,
         item.total || 0, i]);
    }
  }
  saveDb();
  return true;
}

export function deleteEstimate(id) {
  runSql('DELETE FROM estimate_items WHERE estimate_id = ?', [parseInt(id)]);
  runSql('DELETE FROM estimates WHERE id = ?', [parseInt(id)]);
  saveDb();
  return true;
}

export function convertEstimateToInvoice(estimateId) {
  const est = getEstimateById(estimateId);
  if (!est) return null;
  const invoiceId = createInvoice({
    customer_id: est.customer_id, company_id: est.company_id, type: 'invoice', status: 'sent',
    date: est.date, subtotal: est.subtotal, discount_amount: est.discount_amount,
    discount_percent: est.discount_percent, tax_amount: est.tax_amount, tax_percent: est.tax_percent,
    shipping_cost: est.shipping_cost, total: est.total, balance_due: est.total,
    notes: est.notes, terms: est.terms, reference: est.estimate_number,
    items: est.items.map(it => ({ ...it, invoice_id: undefined })),
  });
  updateEstimate(estimateId, { status: 'converted', converted_invoice_id: invoiceId });
  return invoiceId;
}

// ─── Credit Notes ───────────────────────────────────────────────────────────

export function getNextCreditNumber() {
  const row = queryOne("SELECT credit_number FROM credit_notes ORDER BY id DESC LIMIT 1");
  if (!row || !row.credit_number) return 'CN-0001';
  const num = parseInt(row.credit_number.replace('CN-', '')) || 0;
  return `CN-${String(num + 1).padStart(4, '0')}`;
}

export function getCreditNotes(filters = {}) {
  let where = '1=1';
  const params = [];
  if (filters.customer_id) { where += ' AND cn.customer_id = ?'; params.push(parseInt(filters.customer_id)); }
  if (filters.status) { where += ' AND cn.status = ?'; params.push(filters.status); }
  if (filters.search) { where += ' AND (cn.credit_number LIKE ? OR c.name LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s); }
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(500, parseInt(filters.limit) || 50);
  const offset = (page - 1) * limit;
  const total = execCount(`SELECT COUNT(*) FROM credit_notes cn LEFT JOIN customers_erp c ON cn.customer_id = c.id WHERE ${where}`, params);
  const notes = queryAll(`
    SELECT cn.*, c.name as customer_name FROM credit_notes cn LEFT JOIN customers_erp c ON cn.customer_id = c.id
    WHERE ${where} ORDER BY cn.date DESC LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  return { credit_notes: notes, total, page, limit };
}

export function getCreditNoteById(id) {
  const cn = queryOne('SELECT cn.*, c.name as customer_name FROM credit_notes cn LEFT JOIN customers_erp c ON cn.customer_id = c.id WHERE cn.id = ?', [parseInt(id)]);
  if (!cn) return null;
  cn.items = queryAll('SELECT * FROM credit_note_items WHERE credit_note_id = ?', [parseInt(id)]);
  return cn;
}

export function createCreditNote(data) {
  const creditNumber = data.credit_number || getNextCreditNumber();
  runSql(`INSERT INTO credit_notes (credit_number, customer_id, invoice_id, type, status, date, subtotal, tax_amount, tax_percent, total, reason, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [creditNumber, data.customer_id || null, data.invoice_id || null, data.type || 'credit_note',
     data.status || 'draft', data.date || new Date().toISOString().slice(0, 10),
     data.subtotal || 0, data.tax_amount || 0, data.tax_percent || 14, data.total || 0,
     data.reason || '', data.notes || '']);
  const row = queryOne('SELECT last_insert_rowid() as id');
  const cnId = row?.id;
  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      runSql(`INSERT INTO credit_note_items (credit_note_id, product_id, product_name, description, quantity, unit_price, tax_percent, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [cnId, item.product_id || null, item.product_name || '', item.description || '',
         item.quantity || 1, item.unit_price || 0, item.tax_percent || 14, item.total || 0]);
    }
  }
  saveDb();
  return cnId;
}

export function deleteCreditNote(id) {
  runSql('DELETE FROM credit_note_items WHERE credit_note_id = ?', [parseInt(id)]);
  runSql('DELETE FROM credit_notes WHERE id = ?', [parseInt(id)]);
  saveDb();
  return true;
}

// ─── Payments ───────────────────────────────────────────────────────────────

export function getNextPaymentNumber() {
  const row = queryOne("SELECT payment_number FROM payments ORDER BY id DESC LIMIT 1");
  if (!row || !row.payment_number) return 'PAY-0001';
  const num = parseInt(row.payment_number.replace('PAY-', '')) || 0;
  return `PAY-${String(num + 1).padStart(4, '0')}`;
}

export function getPayments(filters = {}) {
  let where = '1=1';
  const params = [];
  if (filters.customer_id) { where += ' AND p.customer_id = ?'; params.push(parseInt(filters.customer_id)); }
  if (filters.invoice_id) { where += ' AND p.invoice_id = ?'; params.push(parseInt(filters.invoice_id)); }
  if (filters.payment_method) { where += ' AND p.payment_method = ?'; params.push(filters.payment_method); }
  if (filters.dateFrom) { where += ' AND p.payment_date >= ?'; params.push(filters.dateFrom); }
  if (filters.dateTo) { where += ' AND p.payment_date <= ?'; params.push(filters.dateTo); }
  if (filters.search) { where += ' AND (p.payment_number LIKE ? OR c.name LIKE ? OR p.reference LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s, s); }
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(500, parseInt(filters.limit) || 50);
  const offset = (page - 1) * limit;
  const total = execCount(`SELECT COUNT(*) FROM payments p LEFT JOIN customers_erp c ON p.customer_id = c.id WHERE ${where}`, params);
  const payments = queryAll(`
    SELECT p.*, c.name as customer_name, i.invoice_number
    FROM payments p LEFT JOIN customers_erp c ON p.customer_id = c.id LEFT JOIN invoices i ON p.invoice_id = i.id
    WHERE ${where} ORDER BY p.payment_date DESC LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  return { payments, total, page, limit };
}

export function createPayment(data) {
  const paymentNumber = data.payment_number || getNextPaymentNumber();
  runSql(`INSERT INTO payments (payment_number, customer_id, invoice_id, credit_note_id, amount, payment_method, payment_date, reference, notes, bank_name, cheque_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [paymentNumber, data.customer_id || null, data.invoice_id || null, data.credit_note_id || null,
     data.amount || 0, data.payment_method || 'cash', data.payment_date || new Date().toISOString().slice(0, 10),
     data.reference || '', data.notes || '', data.bank_name || '', data.cheque_number || '']);

  if (data.invoice_id && data.amount) {
    const inv = getInvoiceById(data.invoice_id);
    if (inv) {
      const newPaid = (inv.amount_paid || 0) + (data.amount || 0);
      const newBalance = (inv.total || 0) - newPaid;
      const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : inv.status;
      runSql('UPDATE invoices SET amount_paid = ?, balance_due = ?, status = ? WHERE id = ?', [newPaid, Math.max(0, newBalance), newStatus, parseInt(data.invoice_id)]);
    }
  }
  saveDb();
  const row = queryOne('SELECT last_insert_rowid() as id');
  return row?.id;
}

export function deletePayment(id) {
  const payment = queryOne('SELECT * FROM payments WHERE id = ?', [parseInt(id)]);
  if (payment && payment.invoice_id) {
    const inv = getInvoiceById(payment.invoice_id);
    if (inv) {
      const newPaid = Math.max(0, (inv.amount_paid || 0) - (payment.amount || 0));
      const newBalance = (inv.total || 0) - newPaid;
      runSql('UPDATE invoices SET amount_paid = ?, balance_due = ?, status = ? WHERE id = ?', [newPaid, Math.max(0, newBalance), newBalance <= 0 ? 'paid' : 'sent', parseInt(payment.invoice_id)]);
    }
  }
  runSql('DELETE FROM payments WHERE id = ?', [parseInt(id)]);
  saveDb();
  return true;
}

// ─── Recurring Invoices ─────────────────────────────────────────────────────

export function getRecurringInvoices(filters = {}) {
  let where = '1=1';
  const params = [];
  if (filters.is_active !== undefined) { where += ' AND r.is_active = ?'; params.push(filters.is_active); }
  return queryAll(`SELECT r.*, c.name as customer_name FROM recurring_invoices r LEFT JOIN customers_erp c ON r.customer_id = c.id WHERE ${where} ORDER BY r.next_date`, params);
}

export function createRecurringInvoice(data) {
  runSql(`INSERT INTO recurring_invoices (name, customer_id, frequency, start_date, next_date, end_date, template_json, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name || '', data.customer_id || null, data.frequency || 'monthly',
     data.start_date || new Date().toISOString().slice(0, 10), data.next_date || '',
     data.end_date || '', JSON.stringify(data.template || {}), data.is_active !== false ? 1 : 0]);
  const row = queryOne('SELECT last_insert_rowid() as id');
  saveDb();
  return row?.id;
}

export function updateRecurringInvoice(id, data) {
  const fields = [];
  const params = [];
  for (const [k, v] of Object.entries(data)) {
    if (['name','customer_id','frequency','start_date','next_date','end_date','is_active','template_json','last_generated','generated_count'].includes(k)) {
      fields.push(`${k} = ?`); params.push(k === 'template_json' ? JSON.stringify(v) : v);
    }
  }
  if (fields.length === 0) return false;
  params.push(parseInt(id));
  runSql(`UPDATE recurring_invoices SET ${fields.join(', ')} WHERE id = ?`, params);
  saveDb();
  return true;
}

export function deleteRecurringInvoice(id) {
  runSql('DELETE FROM recurring_invoices WHERE id = ?', [parseInt(id)]);
  saveDb();
  return true;
}

// ─── ERP Products (enhanced) ───────────────────────────────────────────────

export function getProductsERP(filters = {}) {
  let where = '1=1';
  const params = [];
  if (filters.search) { where += ' AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s, s); }
  if (filters.source) { where += ' AND source = ?'; params.push(filters.source); }
  if (filters.category) { where += ' AND category = ?'; params.push(filters.category); }
  if (filters.mirror_type) { where += ' AND mirror_type = ?'; params.push(filters.mirror_type); }
  if (filters.is_active !== undefined) { where += ' AND is_active = ?'; params.push(filters.is_active); }
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(500, parseInt(filters.limit) || 50);
  const offset = (page - 1) * limit;
  const total = execCount(`SELECT COUNT(*) FROM products WHERE ${where}`, params);
  const products = queryAll(`SELECT * FROM products WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  return { products, total, page, limit };
}

export function updateProductERP(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['name','name_ar','sku','barcode','category','category_ar','subcategory','mirror_type','mirror_shape','mirror_color','price','cost','weight','dimensions','description','description_ar','image_url','gallery_images','is_active'];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { fields.push(`${k} = ?`); params.push(typeof v === 'object' ? JSON.stringify(v) : v); }
  }
  if (fields.length === 0) return false;
  params.push(parseInt(id));
  runSql(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
  saveDb();
  return true;
}

export function createProductERP(data) {
  runSql(`INSERT INTO products (name, name_ar, sku, barcode, source, category, category_ar, subcategory, mirror_type, mirror_shape, mirror_color, price, cost, weight, dimensions, description, description_ar, image_url, gallery_images, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name || '', data.name_ar || '', data.sku || '', data.barcode || '', data.source || 'manual',
     data.category || '', data.category_ar || '', data.subcategory || '', data.mirror_type || '',
     data.mirror_shape || '', data.mirror_color || '', data.price || 0, data.cost || 0,
     data.weight || '', data.dimensions || '', data.description || '', data.description_ar || '',
     data.image_url || '', JSON.stringify(data.gallery_images || []), data.is_active !== false ? 1 : 0]);
  const row = queryOne('SELECT last_insert_rowid() as id');
  saveDb();
  return row?.id;
}

export function deleteProductERP(id) {
  runSql('DELETE FROM products WHERE id = ?', [parseInt(id)]);
  saveDb();
  return true;
}

// ─── Enhanced Inventory ─────────────────────────────────────────────────────

export function getInventoryFiltered(filters = {}) {
  let where = '1=1';
  const params = [];
  if (filters.search) { where += ' AND (i.name LIKE ? OR i.sku LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s); }
  if (filters.low_stock) { where += ' AND i.stock_quantity <= i.low_stock_threshold'; }
  if (filters.source) { where += ' AND p.source = ?'; params.push(filters.source); }
  if (filters.category) { where += ' AND p.category = ?'; params.push(filters.category); }
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(500, parseInt(filters.limit) || 50);
  const offset = (page - 1) * limit;
  const total = execCount(`SELECT COUNT(*) FROM inventory i LEFT JOIN products p ON i.sku = p.sku WHERE ${where}`, params);
  const items = queryAll(`
    SELECT i.*, p.source, p.category, p.mirror_type, p.image_url, p.price as retail_price
    FROM inventory i LEFT JOIN products p ON i.sku = p.sku
    WHERE ${where} ORDER BY i.name ASC LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  return { items, total, page, limit };
}

// ─── Sales Summary ──────────────────────────────────────────────────────────

export function getSalesSummary(filters = {}) {
  let dateWhere = '1=1';
  let paymentDateWhere = '1=1';
  const params = [];
  const paymentParams = [];
  if (filters.dateFrom) { dateWhere += ' AND date >= ?'; params.push(filters.dateFrom); paymentDateWhere += ' AND payment_date >= ?'; paymentParams.push(filters.dateFrom); }
  if (filters.dateTo) { dateWhere += ' AND date <= ?'; params.push(filters.dateTo); paymentDateWhere += ' AND payment_date <= ?'; paymentParams.push(filters.dateTo); }

  const invoiceStats = queryOne(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total, COALESCE(SUM(amount_paid), 0) as paid, COALESCE(SUM(balance_due), 0) as outstanding
    FROM invoices WHERE ${dateWhere} AND status != 'cancelled'
  `, params);

  const estimateStats = queryOne(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
    FROM estimates WHERE ${dateWhere} AND status != 'cancelled'
  `, params);

  const paymentStats = queryOne(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
    FROM payments WHERE ${paymentDateWhere}
  `, paymentParams);

  const creditStats = queryOne(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
    FROM credit_notes WHERE ${dateWhere} AND status != 'cancelled'
  `, params);

  const monthly = queryAll(`
    SELECT strftime('%Y-%m', date) as month, SUM(total) as total, SUM(amount_paid) as paid, COUNT(*) as count
    FROM invoices WHERE ${dateWhere} AND status != 'cancelled'
    GROUP BY month ORDER BY month DESC LIMIT 12
  `, params);

  const topCustomers = queryAll(`
    SELECT c.name, COUNT(i.id) as orders, SUM(i.total) as total
    FROM invoices i JOIN customers_erp c ON i.customer_id = c.id
    WHERE ${dateWhere} AND i.status != 'cancelled'
    GROUP BY i.customer_id ORDER BY total DESC LIMIT 10
  `, params);

  return {
    invoices: invoiceStats || { count: 0, total: 0, paid: 0, outstanding: 0 },
    estimates: estimateStats || { count: 0, total: 0 },
    payments: paymentStats || { count: 0, total: 0 },
    creditNotes: creditStats || { count: 0, total: 0 },
    monthly,
    topCustomers,
  };
}


// ─── Bug Fix: Manual Customers ──────────────────────────────────────────────
export function createManualCustomer(data) {
  const existing = execCount('SELECT COUNT(*) FROM manual_customers WHERE phone = ?', [data.phone]);
  if (existing > 0) {
    runSql('UPDATE manual_customers SET name=?, email=?, address=?, governorate=?, notes=? WHERE phone=?',
      [data.name||'', data.email||'', data.address||'', data.governorate||'', data.notes||'', data.phone]);
  } else {
    runSql('INSERT INTO manual_customers (name, phone, email, address, governorate, notes) VALUES (?,?,?,?,?,?)',
      [data.name||'', data.phone||'', data.email||'', data.address||'', data.governorate||'', data.notes||'']);
  }
  saveDb();
  return { phone: data.phone };
}

export function deleteManualCustomer(phone) {
  runSql('DELETE FROM manual_customers WHERE phone = ?', [phone]);
  saveDb();
}

// ─── Bug Fix: updatePayment & updateCreditNote ──────────────────────────────
export function updatePayment(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['amount','payment_method','payment_date','reference','notes','bank_name','cheque_number'];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { fields.push(`${k} = ?`); params.push(v); }
  }
  if (fields.length === 0) return false;
  params.push(parseInt(id));
  runSql(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`, params);
  saveDb();
  return true;
}

export function updateCreditNote(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['status','date','subtotal','tax_amount','tax_percent','total','reason','notes','applied_to_invoice'];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { fields.push(`${k} = ?`); params.push(v); }
  }
  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now')");
  params.push(parseInt(id));
  runSql(`UPDATE credit_notes SET ${fields.join(', ')} WHERE id = ?`, params);
  saveDb();
  return true;
}

// ─── Daily Summary (Bug Fix #5) ─────────────────────────────────────────────
export function refreshDailySummary(dateStr) {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  const r = db.exec(`
    SELECT COUNT(*) as total_orders, COALESCE(SUM(total_price),0) as total_revenue,
      COALESCE(SUM(cost),0) as total_costs, COALESCE(SUM(profit),0) as total_profit,
      COALESCE(SUM(cod_amount),0) as total_cod, COALESCE(SUM(shipping_cost),0) as total_shipping,
      SUM(CASE WHEN is_delayed=1 THEN 1 ELSE 0 END) as delayed_orders,
      SUM(CASE WHEN status='Delivered' THEN 1 ELSE 0 END) as delivered_orders,
      SUM(CASE WHEN status IN('Cancelled','Failed') THEN 1 ELSE 0 END) as cancelled_orders,
      AVG(total_price) as avg_order_value
    FROM orders WHERE order_date = ?`, [date]);
  if (!r.length || !r[0].values.length) return;
  const cols = r[0].columns; const vals = r[0].values[0];
  const s = {}; cols.forEach((c, i) => { s[c] = vals[i] ?? 0; });
  runSql(`INSERT OR REPLACE INTO daily_summary
    (date,total_orders,total_revenue,total_costs,total_profit,total_cod,total_shipping,
     delayed_orders,delivered_orders,cancelled_orders,avg_order_value)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [date,s.total_orders,s.total_revenue,s.total_costs,s.total_profit,
     s.total_cod,s.total_shipping,s.delayed_orders,s.delivered_orders,s.cancelled_orders,s.avg_order_value]);
  saveDb();
}

// ─── Rules Engine (Bug Fix #4) ──────────────────────────────────────────────
export function evaluateRules() {
  const rules = getActiveRules();
  const notifications = [];
  for (const rule of rules) {
    try {
      let triggered = false;
      let message = '';
      if (rule.type === 'low_stock') {
        const thresh = rule.condition?.threshold || 5;
        const items = queryAll('SELECT * FROM inventory WHERE stock_quantity <= ?', [thresh]);
        if (items.length > 0) {
          triggered = true;
          message = `${items.length} products have stock ≤ ${thresh}`;
        }
      } else if (rule.type === 'delayed_orders') {
        const count = execCount("SELECT COUNT(*) FROM orders WHERE is_delayed=1 AND status NOT IN('Delivered','Cancelled')");
        if (count > 0) { triggered = true; message = `${count} delayed orders need attention`; }
      } else if (rule.type === 'loss_orders') {
        const count = execCount('SELECT COUNT(*) FROM orders WHERE profit < 0');
        if (count > 0) { triggered = true; message = `${count} orders running at a loss`; }
      }
      if (triggered) {
        const already = execCount('SELECT COUNT(*) FROM notifications WHERE rule_id=? AND is_read=0 AND created_at > datetime("now","-1 hour")', [rule.id]);
        if (already === 0) {
          runSql('INSERT INTO notifications (type,title,message,rule_id) VALUES (?,?,?,?)',
            [rule.type, rule.name, message, rule.id]);
          runSql('UPDATE rules SET trigger_count = COALESCE(trigger_count,0)+1 WHERE id=?', [rule.id]);
          notifications.push({ rule: rule.name, message });
        }
      }
    } catch (_) {}
  }
  if (notifications.length) saveDb();
  return notifications;
}

export function getNotifications(unreadOnly = false) {
  const where = unreadOnly ? 'WHERE is_read=0' : '';
  return queryAll(`SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT 100`);
}

export function markNotificationRead(id) {
  runSql('UPDATE notifications SET is_read=1 WHERE id=?', [parseInt(id)]);
  saveDb();
}

export function markAllNotificationsRead() {
  runSql("UPDATE notifications SET is_read=1 WHERE is_read=0");
  saveDb();
}

// ─── Suppliers ───────────────────────────────────────────────────────────────
export function getSuppliers(filters = {}) {
  let where = '1=1'; const params = [];
  if (filters.search) { where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'; const s=`%${filters.search}%`; params.push(s,s,s); }
  if (filters.is_active !== undefined) { where += ' AND is_active=?'; params.push(filters.is_active); }
  const page=Math.max(1,parseInt(filters.page)||1), limit=Math.min(200,parseInt(filters.limit)||50);
  const total=execCount(`SELECT COUNT(*) FROM suppliers WHERE ${where}`,params);
  const suppliers=queryAll(`SELECT * FROM suppliers WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit]);
  return {suppliers,total,page,limit};
}
export function getSupplierById(id) { return queryOne('SELECT * FROM suppliers WHERE id=?',[parseInt(id)]); }
export function createSupplier(data) {
  runSql(`INSERT INTO suppliers (name,name_ar,contact_person,email,phone,address,city,governorate,country,tax_number,payment_terms,credit_limit,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [data.name,data.name_ar||'',data.contact_person||'',data.email||'',data.phone||'',
     data.address||'',data.city||'',data.governorate||'',data.country||'Egypt',
     data.tax_number||'',data.payment_terms||30,data.credit_limit||0,data.notes||'']);
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function updateSupplier(id, data) {
  const f=[],p=[],allowed=['name','name_ar','contact_person','email','phone','address','city','governorate','tax_number','payment_terms','credit_limit','notes','is_active'];
  for(const[k,v]of Object.entries(data)){if(allowed.includes(k)){f.push(`${k}=?`);p.push(v);}}
  if(!f.length)return false; f.push("updated_at=datetime('now')"); p.push(parseInt(id));
  runSql(`UPDATE suppliers SET ${f.join(',')} WHERE id=?`,p); saveDb(); return true;
}
export function deleteSupplier(id) { runSql('DELETE FROM suppliers WHERE id=?',[parseInt(id)]); saveDb(); }

// ─── Purchase Orders ─────────────────────────────────────────────────────────
export function getNextPONumber() {
  const row=queryOne("SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1");
  if(!row||!row.po_number)return'PO-0001';
  return`PO-${String((parseInt(row.po_number.replace('PO-',''))||0)+1).padStart(4,'0')}`;
}
export function getPurchaseOrders(filters={}) {
  let where='1=1'; const params=[];
  if(filters.supplier_id){where+=' AND po.supplier_id=?';params.push(parseInt(filters.supplier_id));}
  if(filters.status){where+=' AND po.status=?';params.push(filters.status);}
  if(filters.search){where+=' AND (po.po_number LIKE ? OR s.name LIKE ?)';const sv=`%${filters.search}%`;params.push(sv,sv);}
  const page=Math.max(1,parseInt(filters.page)||1),limit=Math.min(200,parseInt(filters.limit)||50);
  const total=execCount(`SELECT COUNT(*) FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id WHERE ${where}`,params);
  const orders=queryAll(`SELECT po.*,s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id WHERE ${where} ORDER BY po.order_date DESC LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit]);
  return{orders,total,page,limit};
}
export function getPurchaseOrderById(id) {
  const po=queryOne(`SELECT po.*,s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id WHERE po.id=?`,[parseInt(id)]);
  if(!po)return null;
  po.items=queryAll('SELECT * FROM purchase_order_items WHERE po_id=? ORDER BY sort_order',[parseInt(id)]);
  return po;
}
export function createPurchaseOrder(data) {
  const poNum=data.po_number||getNextPONumber();
  runSql(`INSERT INTO purchase_orders (po_number,supplier_id,status,order_date,expected_date,subtotal,tax_amount,tax_percent,shipping_cost,total,amount_paid,balance_due,currency,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [poNum,data.supplier_id||null,data.status||'draft',data.order_date||new Date().toISOString().slice(0,10),
     data.expected_date||'',data.subtotal||0,data.tax_amount||0,data.tax_percent||14,
     data.shipping_cost||0,data.total||0,data.amount_paid||0,data.balance_due||data.total||0,
     data.currency||'EGP',data.notes||'',data.created_by||'admin']);
  const row=queryOne('SELECT last_insert_rowid() as id'); const poId=row?.id;
  if(data.items?.length){
    for(let i=0;i<data.items.length;i++){
      const it=data.items[i];
      runSql(`INSERT INTO purchase_order_items (po_id,product_id,product_name,sku,quantity,unit_price,tax_percent,total,sort_order) VALUES (?,?,?,?,?,?,?,?,?)`,
        [poId,it.product_id||null,it.product_name||'',it.sku||'',it.quantity||1,it.unit_price||0,it.tax_percent||14,it.total||0,i]);
    }
  }
  saveDb(); return poId;
}
export function updatePurchaseOrder(id, data) {
  const f=[],p=[],allowed=['supplier_id','status','order_date','expected_date','received_date','subtotal','tax_amount','tax_percent','shipping_cost','total','amount_paid','balance_due','notes'];
  for(const[k,v]of Object.entries(data)){if(allowed.includes(k)){f.push(`${k}=?`);p.push(v);}}
  if(f.length){f.push("updated_at=datetime('now')");p.push(parseInt(id));runSql(`UPDATE purchase_orders SET ${f.join(',')} WHERE id=?`,p);}
  if(data.items){
    runSql('DELETE FROM purchase_order_items WHERE po_id=?',[parseInt(id)]);
    for(let i=0;i<data.items.length;i++){const it=data.items[i];
      runSql(`INSERT INTO purchase_order_items (po_id,product_id,product_name,sku,quantity,unit_price,tax_percent,total,sort_order) VALUES (?,?,?,?,?,?,?,?,?)`,
        [id,it.product_id||null,it.product_name||'',it.sku||'',it.quantity||1,it.unit_price||0,it.tax_percent||14,it.total||0,i]);}
  }
  saveDb(); return true;
}
export function deletePurchaseOrder(id) {
  runSql('DELETE FROM purchase_order_items WHERE po_id=?',[parseInt(id)]);
  runSql('DELETE FROM purchase_orders WHERE id=?',[parseInt(id)]);
  saveDb();
}

// ─── Goods Receipts ──────────────────────────────────────────────────────────
export function getNextGRNNumber() {
  const row=queryOne("SELECT grn_number FROM goods_receipts ORDER BY id DESC LIMIT 1");
  if(!row||!row.grn_number)return'GRN-0001';
  return`GRN-${String((parseInt(row.grn_number.replace('GRN-',''))||0)+1).padStart(4,'0')}`;
}
export function getGoodsReceipts(filters={}) {
  let where='1=1'; const params=[];
  if(filters.po_id){where+=' AND gr.po_id=?';params.push(parseInt(filters.po_id));}
  if(filters.supplier_id){where+=' AND gr.supplier_id=?';params.push(parseInt(filters.supplier_id));}
  const page=Math.max(1,parseInt(filters.page)||1),limit=50;
  const total=execCount(`SELECT COUNT(*) FROM goods_receipts gr WHERE ${where}`,params);
  const receipts=queryAll(`SELECT gr.*,po.po_number,s.name as supplier_name FROM goods_receipts gr LEFT JOIN purchase_orders po ON gr.po_id=po.id LEFT JOIN suppliers s ON gr.supplier_id=s.id WHERE ${where} ORDER BY gr.receipt_date DESC LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit]);
  return{receipts,total,page,limit};
}
export function createGoodsReceipt(data) {
  const grnNum=data.grn_number||getNextGRNNumber();
  runSql(`INSERT INTO goods_receipts (grn_number,po_id,supplier_id,receipt_date,notes,created_by) VALUES (?,?,?,?,?,?)`,
    [grnNum,data.po_id||null,data.supplier_id||null,data.receipt_date||new Date().toISOString().slice(0,10),data.notes||'',data.created_by||'admin']);
  const row=queryOne('SELECT last_insert_rowid() as id'); const grnId=row?.id;
  if(data.items?.length){
    for(const it of data.items){
      runSql(`INSERT INTO goods_receipt_items (grn_id,po_item_id,product_id,product_name,sku,expected_qty,received_qty,unit_cost,total_cost) VALUES (?,?,?,?,?,?,?,?,?)`,
        [grnId,it.po_item_id||null,it.product_id||null,it.product_name||'',it.sku||'',it.expected_qty||0,it.received_qty||0,it.unit_cost||0,it.total_cost||0]);
      // Update inventory stock
      if(it.sku && it.received_qty > 0){
        const inv=queryOne('SELECT * FROM inventory WHERE sku=?',[it.sku]);
        if(inv){
          runSql("UPDATE inventory SET stock_quantity=stock_quantity+?,cost=CASE WHEN ?<>0 THEN ? ELSE cost END,last_restocked=datetime('now'),updated_at=datetime('now') WHERE sku=?",
            [it.received_qty,it.unit_cost||0,it.unit_cost||0,it.sku]);
        } else {
          runSql(`INSERT INTO inventory (sku,name,stock_quantity,cost,last_restocked) VALUES (?,?,?,?,datetime('now'))`,
            [it.sku,it.product_name||'',it.received_qty||0,it.unit_cost||0]);
        }
        // Update PO received quantity
        if(it.po_item_id){
          runSql('UPDATE purchase_order_items SET received_quantity=COALESCE(received_quantity,0)+? WHERE id=?',[it.received_qty,it.po_item_id]);
        }
      }
    }
  }
  // Mark PO as received if fully received
  if(data.po_id) {
    const remaining=execCount('SELECT COUNT(*) FROM purchase_order_items WHERE po_id=? AND received_quantity < quantity',[parseInt(data.po_id)]);
    if(remaining===0) runSql("UPDATE purchase_orders SET status='received',received_date=date('now'),updated_at=datetime('now') WHERE id=?",[parseInt(data.po_id)]);
  }
  saveDb(); return grnId;
}

// ─── Employees ───────────────────────────────────────────────────────────────
export function getNextEmployeeNumber() {
  const row=queryOne("SELECT employee_number FROM employees ORDER BY id DESC LIMIT 1");
  if(!row||!row.employee_number)return'EMP-001';
  return`EMP-${String((parseInt(row.employee_number.replace('EMP-',''))||0)+1).padStart(3,'0')}`;
}
export function getEmployees(filters={}) {
  let where='1=1'; const params=[];
  if(filters.search){where+=' AND (name LIKE ? OR email LIKE ? OR department LIKE ?)';const s=`%${filters.search}%`;params.push(s,s,s);}
  if(filters.department){where+=' AND department=?';params.push(filters.department);}
  if(filters.is_active!==undefined){where+=' AND is_active=?';params.push(filters.is_active);}
  const page=Math.max(1,parseInt(filters.page)||1),limit=Math.min(200,parseInt(filters.limit)||50);
  const total=execCount(`SELECT COUNT(*) FROM employees WHERE ${where}`,params);
  const employees=queryAll(`SELECT * FROM employees WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit]);
  return{employees,total,page,limit};
}
export function getEmployeeById(id){return queryOne('SELECT * FROM employees WHERE id=?',[parseInt(id)]);}
export function createEmployee(data) {
  const num=data.employee_number||getNextEmployeeNumber();
  runSql(`INSERT INTO employees (employee_number,name,name_ar,national_id,email,phone,department,job_title,hire_date,employment_type,basic_salary,allowances,bank_account,address,emergency_contact,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [num,data.name,data.name_ar||'',data.national_id||'',data.email||'',data.phone||'',data.department||'',
     data.job_title||'',data.hire_date||'',data.employment_type||'full_time',
     data.basic_salary||0,data.allowances||0,data.bank_account||'',data.address||'',data.emergency_contact||'',data.notes||'']);
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function updateEmployee(id, data) {
  const f=[],p=[],allowed=['name','name_ar','national_id','email','phone','department','job_title','hire_date','termination_date','employment_type','basic_salary','allowances','bank_account','address','emergency_contact','notes','is_active'];
  for(const[k,v]of Object.entries(data)){if(allowed.includes(k)){f.push(`${k}=?`);p.push(v);}}
  if(!f.length)return false; f.push("updated_at=datetime('now')"); p.push(parseInt(id));
  runSql(`UPDATE employees SET ${f.join(',')} WHERE id=?`,p); saveDb(); return true;
}
export function deleteEmployee(id){runSql('DELETE FROM employees WHERE id=?',[parseInt(id)]);saveDb();}

// ─── Attendance ──────────────────────────────────────────────────────────────
export function getAttendance(filters={}) {
  let where='1=1'; const params=[];
  if(filters.employee_id){where+=' AND a.employee_id=?';params.push(parseInt(filters.employee_id));}
  if(filters.date){where+=' AND a.date=?';params.push(filters.date);}
  if(filters.month){where+=' AND strftime("%Y-%m",a.date)=?';params.push(filters.month);}
  return queryAll(`SELECT a.*,e.name as employee_name,e.department FROM attendance a LEFT JOIN employees e ON a.employee_id=e.id WHERE ${where} ORDER BY a.date DESC`,params);
}
export function upsertAttendance(data) {
  const existing=execCount('SELECT COUNT(*) FROM attendance WHERE employee_id=? AND date=?',[data.employee_id,data.date]);
  if(existing>0){
    runSql("UPDATE attendance SET check_in=?,check_out=?,hours_worked=?,overtime_hours=?,status=?,notes=? WHERE employee_id=? AND date=?",
      [data.check_in||'',data.check_out||'',data.hours_worked||0,data.overtime_hours||0,data.status||'present',data.notes||'',data.employee_id,data.date]);
  } else {
    runSql(`INSERT INTO attendance (employee_id,date,check_in,check_out,hours_worked,overtime_hours,status,notes) VALUES (?,?,?,?,?,?,?,?)`,
      [data.employee_id,data.date,data.check_in||'',data.check_out||'',data.hours_worked||0,data.overtime_hours||0,data.status||'present',data.notes||'']);
  }
  saveDb();
}

// ─── Payroll ─────────────────────────────────────────────────────────────────
export function getNextPayrollNumber() {
  const row=queryOne("SELECT payroll_number FROM payroll ORDER BY id DESC LIMIT 1");
  if(!row||!row.payroll_number)return'PAY-EMP-0001';
  return`PAY-EMP-${String((parseInt(row.payroll_number.replace('PAY-EMP-',''))||0)+1).padStart(4,'0')}`;
}
export function getPayroll(filters={}) {
  let where='1=1'; const params=[];
  if(filters.employee_id){where+=' AND p.employee_id=?';params.push(parseInt(filters.employee_id));}
  if(filters.period_month){where+=' AND p.period_month=?';params.push(filters.period_month);}
  if(filters.status){where+=' AND p.status=?';params.push(filters.status);}
  const page=Math.max(1,parseInt(filters.page)||1),limit=50;
  const total=execCount(`SELECT COUNT(*) FROM payroll p WHERE ${where}`,params);
  const records=queryAll(`SELECT p.*,e.name as employee_name,e.department FROM payroll p LEFT JOIN employees e ON p.employee_id=e.id WHERE ${where} ORDER BY p.period_month DESC LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit]);
  return{records,total,page,limit};
}
export function createPayroll(data) {
  const num=getNextPayrollNumber();
  const net=(data.basic_salary||0)+(data.allowances||0)+(data.overtime_pay||0)+(data.bonuses||0)-(data.deductions||0)-(data.tax_deduction||0)-(data.social_insurance||0);
  runSql(`INSERT INTO payroll (payroll_number,employee_id,period_month,basic_salary,allowances,overtime_pay,bonuses,deductions,tax_deduction,social_insurance,net_salary,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [num,data.employee_id,data.period_month,data.basic_salary||0,data.allowances||0,data.overtime_pay||0,data.bonuses||0,data.deductions||0,data.tax_deduction||0,data.social_insurance||0,net,data.status||'draft',data.notes||'']);
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function updatePayroll(id,data) {
  const f=[],p=[],allowed=['status','bonuses','deductions','tax_deduction','social_insurance','net_salary','paid_date','notes'];
  for(const[k,v]of Object.entries(data)){if(allowed.includes(k)){f.push(`${k}=?`);p.push(v);}}
  if(!f.length)return false; p.push(parseInt(id)); runSql(`UPDATE payroll SET ${f.join(',')} WHERE id=?`,p); saveDb(); return true;
}

// ─── Leave Requests ───────────────────────────────────────────────────────────
export function getLeaveRequests(filters={}) {
  let where='1=1'; const params=[];
  if(filters.employee_id){where+=' AND lr.employee_id=?';params.push(parseInt(filters.employee_id));}
  if(filters.status){where+=' AND lr.status=?';params.push(filters.status);}
  return queryAll(`SELECT lr.*,e.name as employee_name FROM leave_requests lr LEFT JOIN employees e ON lr.employee_id=e.id WHERE ${where} ORDER BY lr.created_at DESC`,params);
}
export function createLeaveRequest(data) {
  runSql(`INSERT INTO leave_requests (employee_id,leave_type,start_date,end_date,days,reason,status) VALUES (?,?,?,?,?,?,?)`,
    [data.employee_id,data.leave_type||'annual',data.start_date,data.end_date,data.days||1,data.reason||'','pending']);
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function updateLeaveRequest(id,data) {
  const f=[],p=[],allowed=['status','approved_by','notes'];
  for(const[k,v]of Object.entries(data)){if(allowed.includes(k)){f.push(`${k}=?`);p.push(v);}}
  if(!f.length)return false; p.push(parseInt(id)); runSql(`UPDATE leave_requests SET ${f.join(',')} WHERE id=?`,p); saveDb(); return true;
}

// ─── Chart of Accounts ────────────────────────────────────────────────────────
export function getChartOfAccounts(filters={}) {
  let where='1=1'; const params=[];
  if(filters.account_type){where+=' AND account_type=?';params.push(filters.account_type);}
  if(filters.is_active!==undefined){where+=' AND is_active=?';params.push(filters.is_active);}
  return queryAll(`SELECT * FROM chart_of_accounts WHERE ${where} ORDER BY account_code`,params);
}
export function createAccount(data) {
  runSql(`INSERT INTO chart_of_accounts (account_code,account_name,account_name_ar,account_type,parent_id,normal_balance,description) VALUES (?,?,?,?,?,?,?)`,
    [data.account_code,data.account_name,data.account_name_ar||'',data.account_type,data.parent_id||null,data.normal_balance||'debit',data.description||'']);
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function updateAccount(id,data) {
  const f=[],p=[],allowed=['account_name','account_name_ar','account_type','parent_id','normal_balance','description','is_active'];
  for(const[k,v]of Object.entries(data)){if(allowed.includes(k)){f.push(`${k}=?`);p.push(v);}}
  if(!f.length)return false; p.push(parseInt(id)); runSql(`UPDATE chart_of_accounts SET ${f.join(',')} WHERE id=?`,p); saveDb(); return true;
}

// ─── Journal Entries ─────────────────────────────────────────────────────────
export function getNextJournalNumber() {
  const row=queryOne("SELECT entry_number FROM journal_entries ORDER BY id DESC LIMIT 1");
  if(!row||!row.entry_number)return'JE-0001';
  return`JE-${String((parseInt(row.entry_number.replace('JE-',''))||0)+1).padStart(4,'0')}`;
}
export function getJournalEntries(filters={}) {
  let where='1=1'; const params=[];
  if(filters.dateFrom){where+=' AND date>=?';params.push(filters.dateFrom);}
  if(filters.dateTo){where+=' AND date<=?';params.push(filters.dateTo);}
  if(filters.source_type){where+=' AND source_type=?';params.push(filters.source_type);}
  if(filters.search){where+=' AND (entry_number LIKE ? OR description LIKE ?)';const s=`%${filters.search}%`;params.push(s,s);}
  const page=Math.max(1,parseInt(filters.page)||1),limit=50;
  const total=execCount(`SELECT COUNT(*) FROM journal_entries WHERE ${where}`,params);
  const entries=queryAll(`SELECT * FROM journal_entries WHERE ${where} ORDER BY date DESC,id DESC LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit]);
  return{entries,total,page,limit};
}
export function getJournalEntryById(id) {
  const entry=queryOne('SELECT * FROM journal_entries WHERE id=?',[parseInt(id)]);
  if(!entry)return null;
  entry.lines=queryAll('SELECT jl.*,a.account_code,a.account_name FROM journal_lines jl LEFT JOIN chart_of_accounts a ON jl.account_id=a.id WHERE jl.entry_id=?',[parseInt(id)]);
  return entry;
}
export function createJournalEntry(data) {
  const num=data.entry_number||getNextJournalNumber();
  runSql(`INSERT INTO journal_entries (entry_number,date,description,reference,source_type,source_id,status,created_by) VALUES (?,?,?,?,?,?,?,?)`,
    [num,data.date||new Date().toISOString().slice(0,10),data.description||'',data.reference||'',data.source_type||'manual',data.source_id||null,data.status||'posted',data.created_by||'admin']);
  const row=queryOne('SELECT last_insert_rowid() as id'); const entryId=row?.id;
  if(data.lines?.length){
    for(const line of data.lines){
      runSql(`INSERT INTO journal_lines (entry_id,account_id,debit,credit,description) VALUES (?,?,?,?,?)`,
        [entryId,line.account_id,line.debit||0,line.credit||0,line.description||'']);
    }
  }
  saveDb(); return entryId;
}
export function deleteJournalEntry(id){
  runSql('DELETE FROM journal_lines WHERE entry_id=?',[parseInt(id)]);
  runSql('DELETE FROM journal_entries WHERE id=?',[parseInt(id)]);
  saveDb();
}
export function getTrialBalance() {
  return queryAll(`
    SELECT a.account_code,a.account_name,a.account_name_ar,a.account_type,a.normal_balance,
      COALESCE(SUM(jl.debit),0) as total_debit, COALESCE(SUM(jl.credit),0) as total_credit,
      CASE WHEN a.normal_balance='debit' THEN COALESCE(SUM(jl.debit),0)-COALESCE(SUM(jl.credit),0)
           ELSE COALESCE(SUM(jl.credit),0)-COALESCE(SUM(jl.debit),0) END as balance
    FROM chart_of_accounts a LEFT JOIN journal_lines jl ON a.id=jl.account_id
    WHERE a.is_active=1
    GROUP BY a.id ORDER BY a.account_code`);
}

// ─── Bank Accounts & Transactions ────────────────────────────────────────────
export function getBankAccounts() { return queryAll('SELECT * FROM bank_accounts WHERE is_active=1 ORDER BY account_name'); }
export function createBankAccount(data) {
  runSql(`INSERT INTO bank_accounts (account_name,bank_name,account_number,iban,currency,opening_balance,current_balance,notes) VALUES (?,?,?,?,?,?,?,?)`,
    [data.account_name,data.bank_name,data.account_number||'',data.iban||'',data.currency||'EGP',data.opening_balance||0,data.opening_balance||0,data.notes||'']);
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function updateBankAccount(id,data) {
  const f=[],p=[],allowed=['account_name','bank_name','account_number','iban','currency','current_balance','notes','is_active'];
  for(const[k,v]of Object.entries(data)){if(allowed.includes(k)){f.push(`${k}=?`);p.push(v);}}
  if(!f.length)return false; f.push("updated_at=datetime('now')"); p.push(parseInt(id));
  runSql(`UPDATE bank_accounts SET ${f.join(',')} WHERE id=?`,p); saveDb(); return true;
}
export function getBankTransactions(filters={}) {
  let where='1=1'; const params=[];
  if(filters.bank_account_id){where+=' AND bank_account_id=?';params.push(parseInt(filters.bank_account_id));}
  if(filters.is_reconciled!==undefined){where+=' AND is_reconciled=?';params.push(filters.is_reconciled);}
  if(filters.dateFrom){where+=' AND transaction_date>=?';params.push(filters.dateFrom);}
  if(filters.dateTo){where+=' AND transaction_date<=?';params.push(filters.dateTo);}
  const page=Math.max(1,parseInt(filters.page)||1),limit=50;
  const total=execCount(`SELECT COUNT(*) FROM bank_transactions WHERE ${where}`,params);
  const txns=queryAll(`SELECT bt.*,ba.account_name,ba.bank_name FROM bank_transactions bt LEFT JOIN bank_accounts ba ON bt.bank_account_id=ba.id WHERE ${where} ORDER BY bt.transaction_date DESC LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit]);
  return{transactions:txns,total,page,limit};
}
export function createBankTransaction(data) {
  runSql(`INSERT INTO bank_transactions (bank_account_id,transaction_date,description,reference,debit,credit,balance,payment_id) VALUES (?,?,?,?,?,?,?,?)`,
    [data.bank_account_id,data.transaction_date||new Date().toISOString().slice(0,10),data.description||'',data.reference||'',data.debit||0,data.credit||0,data.balance||0,data.payment_id||null]);
  if(data.debit)runSql('UPDATE bank_accounts SET current_balance=current_balance-?,updated_at=datetime("now") WHERE id=?',[data.debit,data.bank_account_id]);
  if(data.credit)runSql('UPDATE bank_accounts SET current_balance=current_balance+?,updated_at=datetime("now") WHERE id=?',[data.credit,data.bank_account_id]);
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function reconcileTransaction(id) {
  runSql("UPDATE bank_transactions SET is_reconciled=1,reconciled_at=datetime('now') WHERE id=?",[parseInt(id)]);
  saveDb();
}

// ─── Fixed Assets ─────────────────────────────────────────────────────────────
export function getFixedAssets(filters={}) {
  let where='1=1'; const params=[];
  if(filters.category){where+=' AND category=?';params.push(filters.category);}
  if(filters.status){where+=' AND status=?';params.push(filters.status);}
  if(filters.search){where+=' AND (asset_name LIKE ? OR asset_code LIKE ?)';const s=`%${filters.search}%`;params.push(s,s);}
  const page=Math.max(1,parseInt(filters.page)||1),limit=50;
  const total=execCount(`SELECT COUNT(*) FROM fixed_assets WHERE ${where}`,params);
  const assets=queryAll(`SELECT * FROM fixed_assets WHERE ${where} ORDER BY asset_name ASC LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit]);
  return{assets,total,page,limit};
}
export function getAssetById(id){return queryOne('SELECT * FROM fixed_assets WHERE id=?',[parseInt(id)]);}
export function createFixedAsset(data) {
  const code=data.asset_code||`AST-${Date.now().toString().slice(-6)}`;
  const currentValue=data.purchase_price||0;
  runSql(`INSERT INTO fixed_assets (asset_code,asset_name,category,description,purchase_date,purchase_price,salvage_value,useful_life_years,depreciation_method,current_value,location,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [code,data.asset_name,data.category||'',data.description||'',data.purchase_date||'',data.purchase_price||0,data.salvage_value||0,data.useful_life_years||5,data.depreciation_method||'straight_line',currentValue,data.location||'',data.status||'active',data.notes||'']);
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function updateFixedAsset(id,data) {
  const f=[],p=[],allowed=['asset_name','category','description','purchase_date','purchase_price','salvage_value','useful_life_years','depreciation_method','accumulated_depreciation','current_value','location','status','notes'];
  for(const[k,v]of Object.entries(data)){if(allowed.includes(k)){f.push(`${k}=?`);p.push(v);}}
  if(!f.length)return false; f.push("updated_at=datetime('now')"); p.push(parseInt(id));
  runSql(`UPDATE fixed_assets SET ${f.join(',')} WHERE id=?`,p); saveDb(); return true;
}
export function deleteFixedAsset(id){runSql('DELETE FROM fixed_assets WHERE id=?',[parseInt(id)]);saveDb();}
export function calculateMonthlyDepreciation(id) {
  const asset=getAssetById(id);
  if(!asset||asset.status!=='active')return null;
  const depreciable=asset.purchase_price-asset.salvage_value;
  let monthly=0;
  if(asset.depreciation_method==='straight_line'){
    monthly=depreciable/(asset.useful_life_years*12);
  } else if(asset.depreciation_method==='declining_balance'){
    const rate=2/(asset.useful_life_years*12);
    monthly=asset.current_value*rate;
  }
  monthly=parseFloat(monthly.toFixed(2));
  const period=new Date().toISOString().slice(0,7);
  const newAccum=(asset.accumulated_depreciation||0)+monthly;
  const newValue=Math.max(asset.salvage_value,asset.purchase_price-newAccum);
  runSql(`INSERT INTO asset_depreciation (asset_id,period,depreciation_amount,accumulated_total,book_value) VALUES (?,?,?,?,?)`,
    [id,period,monthly,newAccum,newValue]);
  runSql("UPDATE fixed_assets SET accumulated_depreciation=?,current_value=?,updated_at=datetime('now') WHERE id=?",[newAccum,newValue,id]);
  saveDb(); return{period,monthly,newAccum,newValue};
}

// ─── Tax Rates ────────────────────────────────────────────────────────────────
export function getTaxRates() { return queryAll('SELECT * FROM tax_rates WHERE is_active=1 ORDER BY rate'); }
export function createTaxRate(data) {
  runSql(`INSERT INTO tax_rates (name,rate,type,is_default,is_active) VALUES (?,?,?,?,?)`,
    [data.name,data.rate,data.type||'vat',data.is_default?1:0,1]);
  if(data.is_default){runSql('UPDATE tax_rates SET is_default=0 WHERE id != (SELECT MAX(id) FROM tax_rates)');}
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function updateTaxRate(id,data) {
  const f=[],p=[],allowed=['name','rate','type','is_default','is_active'];
  for(const[k,v]of Object.entries(data)){if(allowed.includes(k)){f.push(`${k}=?`);p.push(v);}}
  if(!f.length)return false; p.push(parseInt(id)); runSql(`UPDATE tax_rates SET ${f.join(',')} WHERE id=?`,p); saveDb(); return true;
}
export function deleteTaxRate(id){runSql('UPDATE tax_rates SET is_active=0 WHERE id=?',[parseInt(id)]);saveDb();}

// ─── Currencies & Exchange Rates ──────────────────────────────────────────────
export function getCurrencies() { return queryAll('SELECT * FROM currencies WHERE is_active=1'); }
export function getExchangeRates() {
  return queryAll('SELECT * FROM exchange_rates ORDER BY effective_date DESC');
}
export function upsertExchangeRate(from_currency,to_currency,rate) {
  const existing=execCount('SELECT COUNT(*) FROM exchange_rates WHERE from_currency=? AND to_currency=? AND effective_date=date("now")',[from_currency,to_currency]);
  if(existing>0){
    runSql('UPDATE exchange_rates SET rate=? WHERE from_currency=? AND to_currency=? AND effective_date=date("now")',[rate,from_currency,to_currency]);
  } else {
    runSql('INSERT INTO exchange_rates (from_currency,to_currency,rate) VALUES (?,?,?)',[from_currency,to_currency,rate]);
  }
  saveDb();
}
export function convertCurrency(amount,fromCurrency,toCurrency) {
  if(fromCurrency===toCurrency)return amount;
  const rate=queryOne('SELECT rate FROM exchange_rates WHERE from_currency=? AND to_currency=? ORDER BY effective_date DESC LIMIT 1',[fromCurrency,toCurrency]);
  if(!rate)return amount;
  return parseFloat((amount*rate.rate).toFixed(2));
}

// ─── Warehouses & Stock Transfers ────────────────────────────────────────────
export function getWarehouses() { return queryAll('SELECT * FROM warehouses WHERE is_active=1 ORDER BY name'); }
export function createWarehouse(data) {
  runSql(`INSERT INTO warehouses (name,code,address,is_active) VALUES (?,?,?,1)`,[data.name,data.code||data.name.slice(0,6).toUpperCase(),data.address||'']);
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function getWarehouseLocations(warehouseId) {
  return queryAll('SELECT * FROM warehouse_locations WHERE warehouse_id=? AND is_active=1',[parseInt(warehouseId)]);
}
export function createWarehouseLocation(data) {
  runSql(`INSERT INTO warehouse_locations (warehouse_id,zone,aisle,shelf,bin,name) VALUES (?,?,?,?,?,?)`,
    [data.warehouse_id,data.zone||'',data.aisle||'',data.shelf||'',data.bin||'',data.name||'']);
  const row=queryOne('SELECT last_insert_rowid() as id'); saveDb(); return row?.id;
}
export function getStockTransfers(filters={}) {
  let where='1=1'; const params=[];
  if(filters.status){where+=' AND st.status=?';params.push(filters.status);}
  const page=Math.max(1,parseInt(filters.page)||1),limit=50;
  const total=execCount(`SELECT COUNT(*) FROM stock_transfers st WHERE ${where}`,params);
  const transfers=queryAll(`SELECT st.*,fw.name as from_warehouse,tw.name as to_warehouse FROM stock_transfers st LEFT JOIN warehouses fw ON st.from_warehouse_id=fw.id LEFT JOIN warehouses tw ON st.to_warehouse_id=tw.id WHERE ${where} ORDER BY st.transfer_date DESC LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit]);
  return{transfers,total,page,limit};
}
export function createStockTransfer(data) {
  const num=`TRF-${Date.now().toString().slice(-6)}`;
  runSql(`INSERT INTO stock_transfers (transfer_number,from_warehouse_id,to_warehouse_id,status,transfer_date,notes,created_by) VALUES (?,?,?,?,?,?,?)`,
    [num,data.from_warehouse_id||null,data.to_warehouse_id||null,data.status||'draft',data.transfer_date||new Date().toISOString().slice(0,10),data.notes||'',data.created_by||'admin']);
  const row=queryOne('SELECT last_insert_rowid() as id'); const tId=row?.id;
  if(data.items?.length){
    for(const it of data.items){
      runSql(`INSERT INTO stock_transfer_items (transfer_id,sku,product_name,quantity,from_location_id,to_location_id) VALUES (?,?,?,?,?,?)`,
        [tId,it.sku||'',it.product_name||'',it.quantity||0,it.from_location_id||null,it.to_location_id||null]);
    }
    if(data.status==='completed'){
      for(const it of data.items){
        if(it.sku){
          runSql("UPDATE inventory SET stock_quantity=COALESCE(stock_quantity,0)-?,updated_at=datetime('now') WHERE sku=?",[it.quantity,it.sku]);
        }
      }
    }
  }
  saveDb(); return tId;
}

// ─── Recurring Invoices Processor ─────────────────────────────────────────────
export function processRecurringInvoices() {
  const today=new Date().toISOString().slice(0,10);
  const due=queryAll("SELECT * FROM recurring_invoices WHERE is_active=1 AND (next_date='' OR next_date<=?) AND (end_date='' OR end_date>=?)",[today,today]);
  const created=[];
  for(const rec of due){
    try{
      const template=JSON.parse(rec.template_json||'{}');
      template.customer_id=rec.customer_id;
      template.date=today;
      template.status='draft';
      const invId=createInvoice(template);
      const freq=rec.frequency;
      const nextDate=new Date(today);
      if(freq==='weekly')nextDate.setDate(nextDate.getDate()+7);
      else if(freq==='monthly')nextDate.setMonth(nextDate.getMonth()+1);
      else if(freq==='quarterly')nextDate.setMonth(nextDate.getMonth()+3);
      else if(freq==='yearly')nextDate.setFullYear(nextDate.getFullYear()+1);
      runSql("UPDATE recurring_invoices SET next_date=?,last_generated=?,generated_count=COALESCE(generated_count,0)+1 WHERE id=?",
        [nextDate.toISOString().slice(0,10),today,rec.id]);
      created.push({recurringId:rec.id,invoiceId:invId});
    }catch(e){console.error('[Recurring] Failed:',e.message);}
  }
  if(created.length)saveDb();
  return created;
}
