import { Router } from 'express';
import { getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } from '../services/database.js';
const router = Router();

router.get('/', (req, res) => { try { res.json(getPurchaseOrders(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/:id', (req, res) => { try { const po = getPurchaseOrderById(req.params.id); if (!po) return res.status(404).json({ error: 'Not found' }); res.json(po); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createPurchaseOrder(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/:id', (req, res) => { try { const ok = updatePurchaseOrder(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/:id', (req, res) => { try { deletePurchaseOrder(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
