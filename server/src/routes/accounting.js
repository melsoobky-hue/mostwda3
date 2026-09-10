import { Router } from 'express';
import {
  getChartOfAccounts, createAccount, updateAccount,
  getJournalEntries, getJournalEntryById, createJournalEntry, deleteJournalEntry,
  getTrialBalance,
} from '../services/database.js';

const router = Router();

// ── Chart of Accounts ──────────────────────────────────────────────────────
router.get('/accounts', (req, res) => { try { res.json({ accounts: getChartOfAccounts(req.query) }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/accounts', (req, res) => { try { const id = createAccount(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/accounts/:id', (req, res) => { try { const ok = updateAccount(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });

// ── Journal Entries ────────────────────────────────────────────────────────
router.get('/journal', (req, res) => { try { res.json(getJournalEntries(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/journal/:id', (req, res) => { try { const je = getJournalEntryById(req.params.id); if (!je) return res.status(404).json({ error: 'Not found' }); res.json(je); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/journal', (req, res) => { try { const id = createJournalEntry(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/journal/:id', (req, res) => { try { deleteJournalEntry(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

// ── Reports ────────────────────────────────────────────────────────────────
router.get('/trial-balance', (req, res) => { try { res.json({ entries: getTrialBalance() }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
