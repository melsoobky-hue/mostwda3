import { Router } from 'express';
import { addShipment, getShipments, updateShipment } from '../services/database.js';

const router = Router();

// GET /api/shipments?order_id=&status=&company=
router.get('/', (req, res) => {
  try {
    const shipments = getShipments(req.query);
    res.json({ shipments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/shipments/:id
router.get('/:id', (req, res) => {
  try {
    const all = getShipments({ order_id: req.params.id });
    res.json({ shipments: all });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/shipments
router.post('/', (req, res) => {
  try {
    const result = addShipment(req.body);
    res.json({ status: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/shipments/:id
router.put('/:id', (req, res) => {
  try {
    const result = updateShipment(req.params.id, req.body);
    res.json({ status: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
