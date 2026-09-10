import { Router } from 'express';
import { getProfitLoss } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  const report = getProfitLoss(req.query.dateFrom, req.query.dateTo);
  res.json(report);
});

export default router;
