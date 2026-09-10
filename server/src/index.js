import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
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
import { startScheduler } from './services/scheduler.js';
import { getDb } from './services/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const clientDist = join(__dirname, '..', '..', 'client', 'dist');

app.use(cors());
app.use(express.json());

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
  startScheduler();
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
