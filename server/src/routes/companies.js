import { Router } from 'express';
import { getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany } from '../services/database.js';
const router = Router();

router.get('/', (req, res) => { try { res.json(getCompanies(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/:id', (req, res) => { try { const c = getCompanyById(req.params.id); if (!c) return res.status(404).json({ error: 'Not found' }); res.json(c); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createCompany(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/:id', (req, res) => { try { updateCompany(req.params.id, req.body); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/:id', (req, res) => { try { deleteCompany(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
