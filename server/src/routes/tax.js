import { Router } from 'express';
import { getTaxRates, createTaxRate, updateTaxRate, deleteTaxRate, getCurrencies, getExchangeRates, upsertExchangeRate } from '../services/database.js';

const router = Router();

// Tax rates
router.get('/rates', (req, res) => { try { res.json({ rates: getTaxRates() }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/rates', (req, res) => { try { const id = createTaxRate(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/rates/:id', (req, res) => { try { const ok = updateTaxRate(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/rates/:id', (req, res) => { try { deleteTaxRate(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

// Currencies & Exchange Rates
router.get('/currencies', (req, res) => { try { res.json({ currencies: getCurrencies() }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/exchange-rates', (req, res) => { try { res.json({ rates: getExchangeRates() }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/exchange-rates', (req, res) => {
  try {
    const { from_currency, to_currency, rate } = req.body;
    upsertExchangeRate(from_currency, to_currency, rate);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
