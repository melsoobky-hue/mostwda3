import { Router } from 'express';
import { verifyPin, changePin, getAuthUsers } from '../services/database.js';

const router = Router();

router.post('/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });
  const user = verifyPin(pin);
  if (!user) return res.status(401).json({ error: 'Invalid PIN' });
  res.json({ user: { id: user.id, name: user.name, role: user.role } });
});

router.post('/change-pin', (req, res) => {
  const { oldPin, newPin, name } = req.body;
  if (!oldPin || !newPin) return res.status(400).json({ error: 'Both PINs required' });
  const result = changePin(oldPin, newPin, name);
  if (!result) return res.status(401).json({ error: 'Invalid old PIN' });
  res.json({ status: result });
});

router.get('/users', (req, res) => {
  const users = getAuthUsers();
  res.json({ users });
});

export default router;
