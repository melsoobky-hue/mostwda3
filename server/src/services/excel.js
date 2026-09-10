import ExcelJS from 'exceljs';
import { getAllOrders, getAnalytics, getAllProducts } from './database.js';

const HEADER_FILL = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1E3A8A' } };
const HEADER_FONT = { bold:true, color:{ argb:'FFFFFFFF' }, size:11 };

function styleHeader(row) {
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = { horizontal:'center', vertical:'middle' };
  row.height = 22;
}

export async function generateOrdersReport(filters = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mostawdaa Dashboard';
  workbook.created = new Date();

  // getAllOrders now returns { orders, total, page, limit }
  const { orders } = getAllOrders({ ...filters, limit: 50000 });

  const sheet = workbook.addWorksheet('Orders', {
    views: [{ state:'frozen', ySplit:1 }],
  });

  sheet.columns = [
    { header:'Source',           key:'source',                width:15 },
    { header:'Order ID',         key:'source_order_id',       width:20 },
    { header:'Customer',         key:'customer_name',         width:25 },
    { header:'Phone',            key:'customer_phone',        width:18 },
    { header:'Governorate',      key:'customer_governorate',  width:18 },
    { header:'Delivery Zone',    key:'customer_delivery_zone',width:20 },
    { header:'Product',          key:'product_name',          width:35 },
    { header:'SKU',              key:'product_sku',           width:18 },
    { header:'Mirror Type',      key:'mirror_type',           width:14 },
    { header:'Dimensions',       key:'mirror_dimensions',     width:14 },
    { header:'Qty',              key:'quantity',              width:8  },
    { header:'Unit Price (EGP)', key:'unit_price',            width:16 },
    { header:'Total (EGP)',      key:'total_price',           width:15 },
    { header:'Cost (EGP)',       key:'cost',                  width:14 },
    { header:'Profit (EGP)',     key:'profit',                width:14 },
    { header:'Margin %',         key:'profit_margin',         width:12 },
    { header:'Shipping (EGP)',   key:'shipping_cost',         width:14 },
    { header:'COD (EGP)',        key:'cod_amount',            width:14 },
    { header:'Status',           key:'status',                width:18 },
    { header:'Payment Method',   key:'payment_method',        width:18 },
    { header:'Order Date',       key:'order_date',            width:16 },
    { header:'Expected Delivery',key:'expected_delivery_date',width:18 },
    { header:'Delayed',          key:'is_delayed',            width:10 },
    { header:'Delay Days',       key:'delay_days',            width:12 },
    { header:'Referral Source',  key:'referral_source',       width:18 },
  ];

  styleHeader(sheet.getRow(1));

  const SOURCE_COLORS = {
    mostwda3:   'FF3B82F6',
    chichomz:   'FF10B981',
    raneen:     'FFF59E0B',
    saraydecore:'FF8B5CF6',
  };

  orders.forEach(o => {
    const row = sheet.addRow({
      source:                o.source,
      source_order_id:       o.source_order_id,
      customer_name:         o.customer_name,
      customer_phone:        o.customer_phone,
      customer_governorate:  o.customer_governorate,
      customer_delivery_zone:o.customer_delivery_zone,
      product_name:          o.product_name,
      product_sku:           o.product_sku,
      mirror_type:           o.mirror_type,
      mirror_dimensions:     o.mirror_dimensions,
      quantity:              o.quantity,
      unit_price:            o.unit_price,
      total_price:           o.total_price,
      cost:                  o.cost,
      profit:                o.profit,
      profit_margin:         o.profit_margin ? parseFloat(o.profit_margin).toFixed(1) + '%' : '',
      shipping_cost:         o.shipping_cost,
      cod_amount:            o.cod_amount,
      status:                o.status,
      payment_method:        o.payment_method,
      order_date:            o.order_date,
      expected_delivery_date:o.expected_delivery_date,
      is_delayed:            o.is_delayed ? 'Yes' : 'No',
      delay_days:            o.delay_days || '',
      referral_source:       o.referral_source,
    });

    // Colour source cell
    const srcCell = row.getCell('source');
    const argb = SOURCE_COLORS[o.source] || 'FF6B7280';
    srcCell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb } };
    srcCell.font = { bold:true, color:{ argb:'FFFFFFFF' } };

    // Highlight delayed rows
    if (o.is_delayed) {
      row.eachCell(cell => {
        if (!cell.fill?.fgColor?.argb || cell.fill.fgColor.argb === 'FF000000') {
          cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFEF2F2' } };
        }
      });
    }

    // Red profit cell if negative
    if ((o.profit || 0) < 0) {
      row.getCell('profit').font = { color:{ argb:'FFEF4444' }, bold:true };
    } else if ((o.profit || 0) > 0) {
      row.getCell('profit').font = { color:{ argb:'FF10B981' }, bold:true };
    }
  });

  sheet.autoFilter = {
    from: { row:1, column:1 },
    to:   { row: orders.length + 1, column: sheet.columns.length },
  };

  return workbook;
}

export async function generateAnalyticsReport(dateFrom, dateTo) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mostawdaa Dashboard';
  workbook.created = new Date();

  const analytics = getAnalytics(dateFrom, dateTo);
  const s = analytics.summary || {};

  // ── Summary sheet ──────────────────────────────────────────────────────────
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header:'Metric', key:'metric', width:30 },
    { header:'Value',  key:'value',  width:22 },
  ];
  styleHeader(summary.getRow(1));

  const rows = [
    ['Total Orders',    s.total_orders],
    ['Total Revenue',   s.total_revenue],
    ['Total Costs',     s.total_costs],
    ['Total Profit',    s.total_profit],
    ['COD Collected',   s.cod_collected],
    ['Total Shipping',  s.total_shipping],
    ['Total Customers', s.total_customers],
    ['Delayed Orders',  s.delayed_orders],
    ['Delivered Orders',s.delivered_orders],
    ['Cancelled Orders',s.cancelled_orders],
    ['Total Products',  s.total_products],
  ];
  rows.forEach(([metric, value]) => summary.addRow({ metric, value: value || 0 }));

  // ── By Source ──────────────────────────────────────────────────────────────
  const bySource = workbook.addWorksheet('By Source');
  bySource.columns = [
    { header:'Source',  key:'source',  width:20 },
    { header:'Orders',  key:'count',   width:14 },
    { header:'Revenue', key:'revenue', width:18 },
    { header:'Avg Order',key:'avg_order',width:16 },
  ];
  styleHeader(bySource.getRow(1));
  (analytics.bySource || []).forEach(r => bySource.addRow(r));

  // ── By Governorate ─────────────────────────────────────────────────────────
  const byGov = workbook.addWorksheet('By Governorate');
  byGov.columns = [
    { header:'Governorate', key:'governorate', width:25 },
    { header:'Orders',      key:'count',       width:14 },
    { header:'Revenue',     key:'revenue',     width:18 },
  ];
  styleHeader(byGov.getRow(1));
  (analytics.byGovernorate || []).forEach(r => byGov.addRow(r));

  // ── Daily Revenue ──────────────────────────────────────────────────────────
  const daily = workbook.addWorksheet('Daily Revenue');
  daily.columns = [
    { header:'Date',    key:'date',    width:15 },
    { header:'Orders',  key:'orders',  width:12 },
    { header:'Revenue', key:'revenue', width:18 },
    { header:'Profit',  key:'profit',  width:16 },
  ];
  styleHeader(daily.getRow(1));
  (analytics.dailyRevenue || []).forEach(r => daily.addRow(r));

  // ── Top Products ───────────────────────────────────────────────────────────
  const products = workbook.addWorksheet('Top Products');
  products.columns = [
    { header:'Product',   key:'product_name', width:40 },
    { header:'Orders',    key:'count',        width:12 },
    { header:'Revenue',   key:'revenue',      width:18 },
    { header:'Avg Price', key:'avg_price',    width:16 },
  ];
  styleHeader(products.getRow(1));
  (analytics.topProducts || []).forEach(r => products.addRow(r));

  return workbook;
}

export async function generateProductsReport() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mostawdaa Dashboard';
  workbook.created = new Date();

  // getAllProducts returns { products, total, ... }
  const { products } = getAllProducts({ limit: 50000 });

  const sheet = workbook.addWorksheet('Products', {
    views: [{ state:'frozen', ySplit:1 }],
  });
  sheet.columns = [
    { header:'Name',        key:'name',           width:40 },
    { header:'SKU',         key:'sku',            width:22 },
    { header:'Mirror Type', key:'mirror_type',    width:14 },
    { header:'Dimensions',  key:'dimensions',     width:14 },
    { header:'Price (EGP)', key:'price',          width:15 },
    { header:'Cost (EGP)',  key:'cost',           width:15 },
    { header:'Margin %',    key:'profit_margin',  width:12 },
    { header:'Stock',       key:'stock_quantity', width:12 },
    { header:'Status',      key:'stock_status',   width:14 },
    { header:'Category',    key:'category',       width:20 },
    { header:'Source',      key:'source',         width:15 },
  ];
  styleHeader(sheet.getRow(1));
  products.forEach(p => sheet.addRow(p));

  sheet.autoFilter = {
    from: { row:1, column:1 },
    to:   { row: products.length + 1, column: sheet.columns.length },
  };

  return workbook;
}
