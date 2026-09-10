import { Router } from 'express';
import { getRecurringInvoices, createRecurringInvoice, updateRecurringInvoice, deleteRecurringInvoice, processRecurringInvoices } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => { try { res.json({ invoices: getRecurringInvoices(req.query) }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createRecurringInvoice(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/:id', (req, res) => { try { const ok = updateRecurringInvoice(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/:id', (req, res) => { try { deleteRecurringInvoice(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/process', (req, res) => { try { const created = processRecurringInvoices(); res.json({ created }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
