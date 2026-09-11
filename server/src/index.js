import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// ── Existing routes ──────────────────────────────────────────────────────────
import ordersRouter from './routes/orders.js';
import productsRouter from './routes/products.js';
import analyticsRouter from './routes/analytics.js';
import syncRouter from './routes/sync.js';
import exportRouter from './routes/export.js';
import customersRouter from './routes/customers.js';
import alertsRouter from './routes/alerts.js';
import bulkRouter from './routes/bulk.js';
import expensesRouter from './routes/expenses.js';
import inventoryRouter from './routes/inventory.js';
import authRouter from './routes/auth.js';
import orderStatusRouter from './routes/order-status.js';
import rulesRouter from './routes/rules.js';
import pnlRouter from './routes/pnl.js';
import seedRouter from './routes/seed.js';
import companiesRouter from './routes/companies.js';
import customersErpRouter from './routes/customers-erp.js';
import invoicesRouter from './routes/invoices.js';
import estimatesRouter from './routes/estimates.js';
import creditNotesRouter from './routes/credit-notes.js';
import paymentsRouter from './routes/payments.js';
import salesRouter from './routes/sales.js';
import productsErpRouter from './routes/products-erp.js';
import receiptRouter from './routes/receipt.js';
import shipmentsRouter from './routes/shipments.js';

// ── New ERP routes ───────────────────────────────────────────────────────────
import suppliersRouter from './routes/suppliers.js';
import purchaseOrdersRouter from './routes/purchase-orders.js';
import goodsReceiptsRouter from './routes/goods-receipts.js';
import hrRouter from './routes/hr.js';
import accountingRouter from './routes/accounting.js';
import bankRouter from './routes/bank.js';
import fixedAssetsRouter from './routes/fixed-assets.js';
import taxRouter from './routes/tax.js';
import warehouseRouter from './routes/warehouse.js';
import notificationsRouter from './routes/notifications.js';
import recurringInvoicesRouter from './routes/recurring-invoices.js';
import pdfRouter from './routes/pdf.js';

// ── Middleware ────────────────────────────────────────────────────────────────
import { authMiddleware } from './middleware/auth.js';

import { startScheduler } from './services/scheduler.js';
import { getDb, seedInventoryFromProducts, seedDemoExpenses } from './services/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const clientDist = join(__dirname, '..', '..', 'client', 'dist');

app.use(cors());
app.use(express.json());

// Auth middleware on all /api routes
app.use('/api', authMiddleware);

// ── Existing routes ──────────────────────────────────────────────────────────
app.use('/api/orders', ordersRouter);
app.use('/api/products', productsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/export', exportRouter);
app.use('/api/customers', customersRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/bulk', bulkRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/auth', authRouter);
app.use('/api/order-status', orderStatusRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/pnl', pnlRouter);
app.use('/api/seed', seedRouter);
app.use('/api/erp/companies', companiesRouter);
app.use('/api/erp/customers', customersErpRouter);
app.use('/api/erp/invoices', invoicesRouter);
app.use('/api/erp/estimates', estimatesRouter);
app.use('/api/erp/credit-notes', creditNotesRouter);
app.use('/api/erp/payments', paymentsRouter);
app.use('/api/erp/sales', salesRouter);
app.use('/api/erp/products', productsErpRouter);
app.use('/api/receipt', receiptRouter);
app.use('/api/shipments', shipmentsRouter);

// ── New ERP routes ───────────────────────────────────────────────────────────
app.use('/api/erp/suppliers', suppliersRouter);
app.use('/api/erp/purchase-orders', purchaseOrdersRouter);
app.use('/api/erp/goods-receipts', goodsReceiptsRouter);
app.use('/api/hr', hrRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api/bank', bankRouter);
app.use('/api/fixed-assets', fixedAssetsRouter);
app.use('/api/tax', taxRouter);
app.use('/api/warehouse', warehouseRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/erp/recurring-invoices', recurringInvoicesRouter);
app.use('/api/pdf', pdfRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

async function start() {
  await getDb();
  console.log('[Server] Database initialized');
  const inv = seedInventoryFromProducts();
  const exp = seedDemoExpenses();
  if (inv.seeded > 0) console.log(`[Server] ${inv.message}`);
  if (exp.seeded > 0) console.log(`[Server] ${exp.message}`);
  startScheduler();
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
