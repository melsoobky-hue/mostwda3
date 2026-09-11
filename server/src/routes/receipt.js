import { Router } from 'express';
import { getOrderById } from '../services/database.js';

const router = Router();

router.get('/:id', (req, res) => {
  try {
    const order = getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const html = generateReceiptHTML(order);
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function generateReceiptHTML(order) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>Receipt - ${order.source_order_id || order.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Kufi Arabic', Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 20px; max-width: 400px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #e74c3c; padding-bottom: 12px; margin-bottom: 12px; }
  .header h1 { font-size: 18px; font-weight: 700; color: #e74c3c; }
  .header p { font-size: 11px; color: #666; margin-top: 4px; }
  .section { margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px dotted #eee; }
  .row .label { color: #888; }
  .row .value { font-weight: 600; }
  .item-box { background: #f8f8f8; border-radius: 8px; padding: 10px; margin: 8px 0; }
  .item-box h3 { font-size: 13px; margin-bottom: 6px; color: #333; }
  .total-box { border-top: 2px solid #e74c3c; padding-top: 10px; margin-top: 10px; }
  .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .total-row.grand { font-size: 16px; font-weight: 700; color: #e74c3c; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .status-assigned { background: #e3f2fd; color: #1565c0; }
  .status-processing { background: #fff3e0; color: #e65100; }
  .status-delivered { background: #e8f5e9; color: #2e7d32; }
  .status-fulfilled { background: #f3e5f5; color: #7b1fa2; }
  .footer { text-align: center; margin-top: 16px; padding-top: 10px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; }
  @media print { body { padding: 10px; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
  <h1>mirror receipt</h1>
  <p>${order.channel || 'Mostawdaa'}</p>
</div>

<div class="section">
  <div class="row"><span class="label">Order ID</span><span class="value">#${order.source_order_id || order.id}</span></div>
  <div class="row"><span class="label">Date</span><span class="value">${order.order_date || '—'}</span></div>
  <div class="row"><span class="label">Status</span><span class="value"><span class="status-badge status-${(order.status || '').toLowerCase().replace(/\s+/g, '-')}">${order.status || '—'}</span></span></div>
</div>

<div class="item-box">
  <h3>${order.product_name || order.customer_name || 'Item'}</h3>
  <div class="row"><span class="label">SKU</span><span class="value">${order.product_sku || '—'}</span></div>
  ${order.mirror_type ? `<div class="row"><span class="label">Type</span><span class="value">${order.mirror_type}</span></div>` : ''}
  ${order.mirror_dimensions ? `<div class="row"><span class="label">Dimensions</span><span class="value">${order.mirror_dimensions}</span></div>` : ''}
  <div class="row"><span class="label">Quantity</span><span class="value">${order.quantity || 1}</span></div>
</div>

<div class="section">
  <div class="row"><span class="label">Unit Price</span><span class="value">EGP ${(order.unit_price || 0).toLocaleString()}</span></div>
  <div class="row"><span class="label">Shipping</span><span class="value">EGP ${(order.shipping_cost || 0).toLocaleString()}</span></div>
  ${order.discount_amount ? `<div class="row"><span class="label">Discount</span><span class="value">- EGP ${order.discount_amount.toLocaleString()}</span></div>` : ''}
</div>

<div class="total-box">
  <div class="total-row grand"><span>Total</span><span>EGP ${(order.total_price || 0).toLocaleString()}</span></div>
  <div class="total-row"><span>Cash on Delivery</span><span>EGP ${(order.cod_amount || 0).toLocaleString()}</span></div>
</div>

<div class="footer">
  <p>Generated ${new Date().toLocaleString()}</p>
  <p>Mostawdaa Dashboard</p>
</div>

<div class="no-print" style="text-align:center; margin-top:16px;">
  <button onclick="window.print()" style="padding:10px 24px; background:#e74c3c; color:#fff; border:none; border-radius:8px; font-size:14px; cursor:pointer; font-family:inherit;">Print Receipt</button>
</div>
</body>
</html>`;
}

export default router;
