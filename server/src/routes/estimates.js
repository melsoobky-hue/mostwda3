import { Router } from 'express';
import { getEstimates, getEstimateById, createEstimate, updateEstimate, deleteEstimate, convertEstimateToInvoice } from '../services/database.js';
const router = Router();

router.get('/', (req, res) => { try { res.json(getEstimates(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/:id', (req, res) => { try { const est = getEstimateById(req.params.id); if (!est) return res.status(404).json({ error: 'Not found' }); res.json(est); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createEstimate(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/:id', (req, res) => { try { updateEstimate(req.params.id, req.body); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/:id', (req, res) => { try { deleteEstimate(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/:id/convert', (req, res) => { try { const invId = convertEstimateToInvoice(req.params.id); if (!invId) return res.status(400).json({ error: 'Cannot convert' }); res.json({ invoice_id: invId }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
