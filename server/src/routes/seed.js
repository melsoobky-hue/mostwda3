import { Router } from 'express';
import { seedInventoryFromProducts, seedDemoExpenses } from '../services/database.js';

const router = Router();

router.post('/', (req, res) => {
  try {
    const inv = seedInventoryFromProducts();
    const exp = seedDemoExpenses();
    res.json({ inventory: inv, expenses: exp });
  } catch (error) {
    console.error('[Seed]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
