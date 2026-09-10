import { Router } from 'express';
import { getFixedAssets, getAssetById, createFixedAsset, updateFixedAsset, deleteFixedAsset, calculateMonthlyDepreciation } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => { try { res.json(getFixedAssets(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/:id', (req, res) => { try { const a = getAssetById(req.params.id); if (!a) return res.status(404).json({ error: 'Not found' }); res.json(a); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createFixedAsset(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/:id', (req, res) => { try { const ok = updateFixedAsset(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/:id', (req, res) => { try { deleteFixedAsset(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/:id/depreciate', (req, res) => { try { const result = calculateMonthlyDepreciation(req.params.id); res.json(result); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
