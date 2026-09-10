import { Router } from 'express';
import { getWarehouses, createWarehouse, getWarehouseLocations, createWarehouseLocation, getStockTransfers, createStockTransfer } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => { try { res.json({ warehouses: getWarehouses() }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', (req, res) => { try { const id = createWarehouse(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/:id/locations', (req, res) => { try { res.json({ locations: getWarehouseLocations(req.params.id) }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/:id/locations', (req, res) => { try { const id = createWarehouseLocation({ ...req.body, warehouse_id: req.params.id }); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/transfers', (req, res) => { try { res.json(getStockTransfers(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/transfers', (req, res) => { try { const id = createStockTransfer(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
