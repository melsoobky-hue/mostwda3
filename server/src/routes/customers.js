import { Router } from 'express';
import { getDb } from '../services/database.js';

const router = Router();

function queryAll(sql, params = []) {
  const db = getDb();
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  } catch (e) {
    console.error('[Customers] queryAll error:', e.message);
    return [];
  }
}

function queryOne(sql, params = []) {
  const db = getDb();
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    let result = null;
    if (stmt.step()) result = stmt.getAsObject();
    stmt.free();
    return result;
  } catch (e) {
    console.error('[Customers] queryOne error:', e.message);
    return null;
  }
}

function execCount(sql, params = []) {
  const db = getDb();
  try {
    const r = db.exec(sql, params);
    return (r.length > 0 && r[0].values.length > 0) ? r[0].values[0][0] : 0;
  } catch (_) { return 0; }
}

router.get('/', (req, res) => {
  try {
    const { search, page, limit, sortBy, sortDir } = req.query;
    const conditions = ['customer_phone IS NOT NULL', "customer_phone != ''"];
    const params = [];

    if (search) {
      conditions.push('(customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const where = conditions.join(' AND ');
    const allowedSort = ['customer_name', 'total_orders', 'total_spent', 'last_order_date'];
    const sortByCol = allowedSort.includes(sortBy) ? sortBy : 'total_spent';
    const sortDirection = sortDir === 'asc' ? 'ASC' : 'DESC';

    const pg = Math.max(1, parseInt(page) || 1);
    const lim = Math.min(500, parseInt(limit) || 50);
    const offset = (pg - 1) * lim;

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
      ORDER BY ${sortByCol} ${sortDirection}
      LIMIT ? OFFSET ?
    `, [...params, lim, offset]);

    res.json({ customers, total, page: pg, limit: lim });
  } catch (error) {
    console.error('[Customers]', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:phone/orders', (req, res) => {
  try {
    const phone = req.params.phone;
    const orders = queryAll(
      `SELECT * FROM orders WHERE customer_phone = ? ORDER BY order_date DESC`,
      [phone]
    );
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:phone', (req, res) => {
  try {
    const phone = req.params.phone;
    const customer = queryOne(
      `SELECT
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
      GROUP BY customer_phone`,
      [phone]
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
