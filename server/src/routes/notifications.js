import { Router } from 'express';
import { getNotifications, markNotificationRead, markAllNotificationsRead, evaluateRules } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    res.json({ notifications: getNotifications(unreadOnly) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/read/:id', (req, res) => {
  try { markNotificationRead(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/read-all', (req, res) => {
  try { markAllNotificationsRead(); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Manually trigger rule evaluation
router.post('/evaluate', (req, res) => {
  try { const notifications = evaluateRules(); res.json({ notifications }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
