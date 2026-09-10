import { Router } from 'express';
import { addExpense, getExpenses, deleteExpense, getExpensesSummary } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  const expenses = getExpenses(req.query);
  res.json({ expenses });
});

router.get('/summary', (req, res) => {
  const summary = getExpensesSummary(req.query.dateFrom, req.query.dateTo);
  res.json(summary);
});

router.post('/', (req, res) => {
  const result = addExpense(req.body);
  res.json({ status: result });
});

router.delete('/:id', (req, res) => {
  deleteExpense(req.params.id);
  res.json({ status: 'deleted' });
});

export default router;
