import { Router } from 'express';
import { getPayments, createPayment, updatePayment, deletePayment } from '../services/database.js';
const router = Router();

router.get('/', (req, res) => { try { res.json(getPayments(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createPayment(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
// Bug fix #7: Add PUT (update) route
router.put('/:id', (req, res) => { try { const ok = updatePayment(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/:id', (req, res) => { try { deletePayment(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
