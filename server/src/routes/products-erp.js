import { Router } from 'express';
import { getProductsERP, updateProductERP, createProductERP, deleteProductERP } from '../services/database.js';
const router = Router();

router.get('/', (req, res) => { try { res.json(getProductsERP(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createProductERP(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/:id', (req, res) => { try { updateProductERP(req.params.id, req.body); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/:id', (req, res) => { try { deleteProductERP(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
