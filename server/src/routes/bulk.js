import { Router } from 'express';
import { getDb, saveDb } from '../services/database.js';

const router = Router();

router.post('/price', (req, res) => {
  try {
    const { skus, price, cost, margin } = req.body;
    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ error: 'No products selected' });
    }

    const db = getDb();
    let updated = 0;

    for (const sku of skus) {
      const fields = [];
      const vals = [];

      if (price !== undefined && price !== '') {
        fields.push('price = ?');
        vals.push(parseFloat(price));
      }
      if (cost !== undefined && cost !== '') {
        fields.push('cost = ?');
        vals.push(parseFloat(cost));
      }
      if (margin !== undefined && margin !== '') {
        fields.push('profit_margin = ?');
        vals.push(parseFloat(margin));
      }
      if (price !== undefined && price !== '' && cost !== undefined && cost !== '') {
        const p = parseFloat(price);
        const c = parseFloat(cost);
        const m = p > 0 ? ((p - c) / p * 100).toFixed(1) : 0;
        fields.push('profit_margin = ?');
        vals.push(parseFloat(m));
      }

      if (fields.length > 0) {
        fields.push("updated_at = datetime('now')");
        db.run(`UPDATE products SET ${fields.join(', ')} WHERE sku = ?`, [...vals, sku]);
        updated++;
      }
    }

    saveDb();
    res.json({ success: true, updated });
  } catch (error) {
    console.error('[BulkUpdate]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
