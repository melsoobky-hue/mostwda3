import { Router } from 'express';
import { getCustomers, getCustomerByPhone, getCustomerOrders, createManualCustomer, deleteManualCustomer } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const result = getCustomers(req.query);
    res.json(result);
  } catch (error) {
    console.error('[Customers]', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:phone/orders', (req, res) => {
  try {
    const orders = getCustomerOrders(req.params.phone);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:phone', (req, res) => {
  try {
    const customer = getCustomerByPhone(req.params.phone);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bug fix #2: Add POST (create) and DELETE routes
router.post('/', (req, res) => {
  try {
    const result = createManualCustomer(req.body);
    res.json({ status: 'created', ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:phone', (req, res) => {
  try {
    deleteManualCustomer(req.params.phone);
    res.json({ status: 'deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
