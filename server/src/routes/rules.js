import { Router } from 'express';
import { addRule, getRules, updateRule, deleteRule, getActiveRules } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  const rules = getRules();
  res.json({ rules });
});

router.get('/active', (req, res) => {
  const rules = getActiveRules();
  res.json({ rules });
});

router.post('/', (req, res) => {
  const result = addRule(req.body);
  res.json({ status: result });
});

router.put('/:id', (req, res) => {
  const result = updateRule(req.params.id, req.body);
  res.json({ status: result });
});

router.delete('/:id', (req, res) => {
  deleteRule(req.params.id);
  res.json({ status: 'deleted' });
});

export default router;
