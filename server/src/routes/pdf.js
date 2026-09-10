import { Router } from 'express';
import { getInvoiceById, getEstimateById } from '../services/database.js';
import { generateInvoicePDF, generateEstimatePDF } from '../services/pdf.js';

const router = Router();

router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const pdf = await generateInvoicePDF(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoice_number}.pdf"`);
    res.send(pdf);
  } catch (e) {
    console.error('[PDF]', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/estimates/:id', async (req, res) => {
  try {
    const estimate = getEstimateById(req.params.id);
    if (!estimate) return res.status(404).json({ error: 'Estimate not found' });
    const pdf = await generateEstimatePDF(estimate);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Estimate-${estimate.estimate_number}.pdf"`);
    res.send(pdf);
  } catch (e) {
    console.error('[PDF]', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
