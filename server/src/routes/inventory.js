import { Router } from 'express';
import { upsertInventory, getInventory, updateStock, getLowStockItems, syncInventoryFromProducts } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  const items = getInventory(req.query);
  res.json({ items });
});

router.get('/low-stock', (req, res) => {
  const items = getLowStockItems();
  res.json({ items });
});

router.post('/', (req, res) => {
  const result = upsertInventory(req.body);
  res.json({ status: result });
});

router.post('/sync', (req, res) => {
  const result = syncInventoryFromProducts();
  res.json({ status: 'synced', ...result });
});

router.put('/stock', (req, res) => {
  const { sku, quantity, notes } = req.body;
  if (!sku) return res.status(400).json({ error: 'sku required' });
  updateStock(sku, quantity, notes);
  res.json({ status: 'updated' });
});

export default router;
