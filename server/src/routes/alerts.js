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
  } catch (e) { return []; }
}

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const alerts = [];

    const lowStock = queryAll(
      `SELECT name, sku, stock_quantity, low_stock_threshold, source, image_url
       FROM products WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0
       ORDER BY stock_quantity ASC LIMIT 20`
    );
    if (lowStock.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStock.length} products are running low on stock`,
        items: lowStock,
        count: lowStock.length,
        timestamp: new Date().toISOString()
      });
    }

    const outOfStock = queryAll(
      `SELECT name, sku, stock_quantity, source, image_url
       FROM products WHERE stock_quantity = 0 OR stock_status = 'Out of stock'
       ORDER BY name LIMIT 20`
    );
    if (outOfStock.length > 0) {
      alerts.push({
        type: 'danger',
        title: 'Out of Stock',
        message: `${outOfStock.length} products are out of stock`,
        items: outOfStock,
        count: outOfStock.length,
        timestamp: new Date().toISOString()
      });
    }

    const lossOrders = queryAll(
      `SELECT source_order_id, customer_name, product_name, total_price, cost, profit, channel, order_date
       FROM orders WHERE profit < 0
       ORDER BY profit ASC LIMIT 20`
    );
    if (lossOrders.length > 0) {
      alerts.push({
        type: 'danger',
        title: 'Loss Orders',
        message: `${lossOrders.length} orders are sold at a loss`,
        items: lossOrders,
        count: lossOrders.length,
        timestamp: new Date().toISOString()
      });
    }

    const delayedOrders = queryAll(
      `SELECT source_order_id, customer_name, product_name, status, order_date, delay_days, channel
       FROM orders WHERE is_delayed = 1 AND status NOT IN ('Delivered','Cancelled','Failed','Rejected')
       ORDER BY delay_days DESC LIMIT 20`
    );
    if (delayedOrders.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Delayed Orders',
        message: `${delayedOrders.length} orders are delayed`,
        items: delayedOrders,
        count: delayedOrders.length,
        timestamp: new Date().toISOString()
      });
    }

    const highValueReturns = queryAll(
      `SELECT source_order_id, customer_name, product_name, total_price, return_reason, channel, order_date
       FROM orders WHERE status = 'Returned' AND total_price > 1000
       ORDER BY total_price DESC LIMIT 10`
    );
    if (highValueReturns.length > 0) {
      alerts.push({
        type: 'info',
        title: 'High Value Returns',
        message: `${highValueReturns.length} high-value orders were returned`,
        items: highValueReturns,
        count: highValueReturns.length,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ alerts, totalAlerts: alerts.reduce((sum, a) => sum + a.count, 0) });
  } catch (error) {
    console.error('[Alerts]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
