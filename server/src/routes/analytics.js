import { Router } from 'express';
import { getAnalytics } from '../services/database.js';

const router = Router();

// Today's quick stats
router.get('/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw   = getAnalytics(today, today);
    const s     = raw.summary || {};
    res.json({
      orders:   s.total_orders   || 0,
      revenue:  s.total_revenue  || 0,
      profit:   s.total_profit   || 0,
      delivered: s.delivered_orders || 0,
      delayed:   s.delayed_orders   || 0,
      cancelled: s.cancelled_orders || 0,
      date: today,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  try {
    let { dateFrom, dateTo, days } = req.query;

    // Support "days" shorthand sent by the frontend time range selector
    if (days && !dateFrom) {
      const d = new Date();
      dateTo = d.toISOString().split('T')[0];
      d.setDate(d.getDate() - parseInt(days, 10));
      dateFrom = d.toISOString().split('T')[0];
    }

    const raw = getAnalytics(dateFrom, dateTo);

    const s = raw.summary || {};
    const totalRevenue = s.total_revenue || 0;
    const totalCosts  = s.total_costs  || 0;
    const totalProfit = s.total_profit || 0;

    const result = {
      totalOrders:      s.total_orders     || 0,
      totalRevenue,
      totalProfit,
      totalCosts,
      totalProducts:    s.total_products   || 0,
      totalCustomers:   s.total_customers  || 0,
      avgOrderValue:    s.avg_order_value  || 0,
      avgMargin:        totalRevenue > 0 ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0,
      delayedOrders:    s.delayed_orders   || 0,
      deliveredOrders:  s.delivered_orders || 0,
      cancelledOrders:  s.cancelled_orders || 0,
      codCollected:     s.cod_collected    || 0,
      totalShipping:    s.total_shipping   || 0,
      totalDiscounts:   s.total_discounts  || 0,

      bySource:      raw.bySource    || [],
      byStatus:      (raw.byStatus   || []).reduce((acc, r) => { acc[r.status  || 'Unknown'] = r.count; return acc; }, {}),
      byChannel:     (raw.byChannel  || []).reduce((acc, r) => { acc[r.channel || 'Unknown'] = r.count; return acc; }, {}),
      byGovernorate: (raw.byGovernorate || []).reduce((acc, r) => { acc[r.governorate] = r.count; return acc; }, {}),
      byMirrorType:  (raw.byMirrorType  || []).reduce((acc, r) => { if (r.mirror_type) acc[r.mirror_type] = r.count; return acc; }, {}),
      bySize:        (raw.bySize || []).reduce((acc, r) => { if (r.size) acc[r.size] = r.count; return acc; }, {}),

      salesTrend:    (raw.dailyRevenue || []).map(d => ({
        date: d.date, revenue: d.revenue, profit: d.profit, orders: d.orders
      })),
      topProducts:   (raw.topProducts || []).map(p => ({
        name: p.product_name, sku: p.product_sku, count: p.count,
        revenue: p.revenue, avgPrice: p.avg_price
      })),
      topMirrorTypes: (raw.topMirrorTypes || []).map(m => ({
        name: m.mirror_type, count: m.count, revenue: m.revenue
      })),
      hourlyOrders:  raw.hourlyOrders || []
    };

    res.json(result);
  } catch (error) {
    console.error('[Analytics]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
