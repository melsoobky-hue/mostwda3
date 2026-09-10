import { Router } from 'express';
import { addShipment, getShipments, updateShipment } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  const shipments = getShipments(req.query);
  res.json({ shipments });
});

router.post('/', (req, res) => {
  const result = addShipment(req.body);
  res.json({ status: result });
});

router.put('/:id', (req, res) => {
  const result = updateShipment(req.params.id, req.body);
  res.json({ status: result });
});

// WhatsApp deep link
router.get('/whatsapp/:phone', (req, res) => {
  const phone = req.params.phone.replace(/[^0-9]/g, '');
  const message = req.query.message || 'Hello! Your order status has been updated.';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  res.json({ url });
});

export default router;
