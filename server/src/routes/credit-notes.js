import { Router } from 'express';
import { getCreditNotes, getCreditNoteById, createCreditNote, deleteCreditNote } from '../services/database.js';
const router = Router();

router.get('/', (req, res) => { try { res.json(getCreditNotes(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/:id', (req, res) => { try { const cn = getCreditNoteById(req.params.id); if (!cn) return res.status(404).json({ error: 'Not found' }); res.json(cn); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createCreditNote(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/:id', (req, res) => { try { deleteCreditNote(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
