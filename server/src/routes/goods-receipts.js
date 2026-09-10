import { Router } from 'express';
import { getGoodsReceipts, createGoodsReceipt } from '../services/database.js';
const router = Router();

router.get('/', (req, res) => { try { res.json(getGoodsReceipts(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createGoodsReceipt(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
