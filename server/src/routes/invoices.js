import { Router } from 'express';
import { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice } from '../services/database.js';
const router = Router();

router.get('/', (req, res) => { try { res.json(getInvoices(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/:id', (req, res) => { try { const inv = getInvoiceById(req.params.id); if (!inv) return res.status(404).json({ error: 'Not found' }); res.json(inv); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createInvoice(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/:id', (req, res) => { try { updateInvoice(req.params.id, req.body); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/:id', (req, res) => { try { deleteInvoice(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
