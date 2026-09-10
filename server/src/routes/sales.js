import { Router } from 'express';
import { getSalesSummary } from '../services/database.js';
const router = Router();

router.get('/summary', (req, res) => { try { res.json(getSalesSummary(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
