import { Router } from 'express';
import { getAllProducts } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { source, search, mirror_type, sortBy, sortDir, page, limit } = req.query;
    const result = getAllProducts({ source, search, mirror_type, sortBy, sortDir, page, limit });
    res.json(result);
  } catch (error) {
    console.error('[Products]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
