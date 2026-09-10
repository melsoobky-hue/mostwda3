import { Router } from 'express';
import {
  getBankAccounts, createBankAccount, updateBankAccount,
  getBankTransactions, createBankTransaction, reconcileTransaction,
} from '../services/database.js';

const router = Router();

router.get('/accounts', (req, res) => { try { res.json({ accounts: getBankAccounts() }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/accounts', (req, res) => { try { const id = createBankAccount(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/accounts/:id', (req, res) => { try { const ok = updateBankAccount(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });

router.get('/transactions', (req, res) => { try { res.json(getBankTransactions(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/transactions', (req, res) => { try { const id = createBankTransaction(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/transactions/:id/reconcile', (req, res) => { try { reconcileTransaction(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
