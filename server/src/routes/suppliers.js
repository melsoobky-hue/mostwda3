import { Router } from 'express';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from '../services/database.js';
const router = Router();

router.get('/', (req, res) => { try { res.json(getSuppliers(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/:id', (req, res) => { try { const s = getSupplierById(req.params.id); if (!s) return res.status(404).json({ error: 'Not found' }); res.json(s); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createSupplier(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/:id', (req, res) => { try { const ok = updateSupplier(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/:id', (req, res) => { try { deleteSupplier(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
