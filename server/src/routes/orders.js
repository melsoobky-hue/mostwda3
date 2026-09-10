import { Router } from 'express';
import { getAllOrders, getOrderById } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const {
      source, status, governorate, dateFrom, dateTo,
      search, page, limit, mirror_type, minPrice, maxPrice,
      isDelayed, sortBy, sortDir
    } = req.query;

    const result = getAllOrders({
      source, status, governorate, dateFrom, dateTo,
      search, page, limit, mirror_type, minPrice, maxPrice,
      isDelayed, sortBy, sortDir
    });
    res.json(result);
  } catch (error) {
    console.error('[Orders]', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const order = getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
