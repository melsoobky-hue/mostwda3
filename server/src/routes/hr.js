import { Router } from 'express';
import {
  getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee,
  getAttendance, upsertAttendance,
  getPayroll, createPayroll, updatePayroll,
  getLeaveRequests, createLeaveRequest, updateLeaveRequest,
} from '../services/database.js';

const router = Router();

// ── Employees ──────────────────────────────────────────────────────────────
router.get('/employees', (req, res) => { try { res.json(getEmployees(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/employees/:id', (req, res) => { try { const e = getEmployeeById(req.params.id); if (!e) return res.status(404).json({ error: 'Not found' }); res.json(e); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/employees', (req, res) => { try { const id = createEmployee(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/employees/:id', (req, res) => { try { const ok = updateEmployee(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/employees/:id', (req, res) => { try { deleteEmployee(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

// ── Attendance ─────────────────────────────────────────────────────────────
router.get('/attendance', (req, res) => { try { res.json({ attendance: getAttendance(req.query) }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/attendance', (req, res) => { try { upsertAttendance(req.body); res.json({ status: 'saved' }); } catch (e) { res.status(500).json({ error: e.message }); } });

// ── Payroll ────────────────────────────────────────────────────────────────
router.get('/payroll', (req, res) => { try { res.json(getPayroll(req.query)); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/payroll', (req, res) => { try { const id = createPayroll(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/payroll/:id', (req, res) => { try { const ok = updatePayroll(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });

// ── Leave Requests ─────────────────────────────────────────────────────────
router.get('/leave', (req, res) => { try { res.json({ requests: getLeaveRequests(req.query) }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/leave', (req, res) => { try { const id = createLeaveRequest(req.body); res.json({ id }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/leave/:id', (req, res) => { try { const ok = updateLeaveRequest(req.params.id, req.body); res.json({ success: ok }); } catch (e) { res.status(500).json({ error: e.message }); } });

export default router;
