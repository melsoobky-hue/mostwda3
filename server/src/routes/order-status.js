import { Router } from 'express';
import { updateOrderStatus, getOrderStatusHistory } from '../services/database.js';

const router = Router();

router.post('/', (req, res) => {
  const { source, source_order_id, status, changed_by, notes } = req.body;
  if (!source || !source_order_id || !status) {
    return res.status(400).json({ error: 'source, source_order_id, status required' });
  }
  const result = updateOrderStatus(source, source_order_id, status, changed_by, notes);
  if (!result) return res.status(404).json({ error: 'Order not found' });
  res.json(result);
});

router.get('/history/:orderId', (req, res) => {
  const history = getOrderStatusHistory(req.params.orderId);
  res.json({ history });
});

export default router;
