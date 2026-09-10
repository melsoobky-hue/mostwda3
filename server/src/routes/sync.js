import { Router } from 'express';
import { runAllScrapers, runSingleScraper, getSyncStatus, updateSchedulerInterval, getSchedulerInterval, addSseClient, removeSseClient } from '../services/scheduler.js';
import { getSyncLogs, getSetting, setSetting } from '../services/database.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json(getSyncStatus());
});

// SSE stream — clients subscribe here for live sync progress events
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx proxy support
  res.flushHeaders();

  // Send current status immediately so the client can render without waiting
  const status = getSyncStatus();
  res.write(`event: init\ndata: ${JSON.stringify(status)}\n\n`);

  // Heartbeat every 25 s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (_) {}
  }, 25000);

  addSseClient(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSseClient(res);
  });
});

router.get('/interval', (req, res) => {
  res.json(getSchedulerInterval());
});

router.post('/interval', (req, res) => {
  try {
    const { minutes } = req.body;
    if (!minutes || minutes < 1 || minutes > 1440) {
      return res.status(400).json({ error: 'Interval must be between 1 and 1440 minutes' });
    }
    const result = updateSchedulerInterval(parseInt(minutes, 10));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/run', async (req, res) => {
  try {
    const result = await runAllScrapers();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/run/:source', async (req, res) => {
  try {
    const result = await runSingleScraper(req.params.source);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs', (req, res) => {
  try {
    res.json(getSyncLogs());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/credentials', (req, res) => {
  res.json({
    mostwda3: {
      username: getSetting('mostwda3_username') || '',
      hasPassword: !!getSetting('mostwda3_password')
    },
    chichomz: {
      email: getSetting('chichomz_email') || '',
      hasPassword: !!getSetting('chichomz_password')
    },
    raneen: {
      email: getSetting('raneen_email') || '',
      hasPassword: !!getSetting('raneen_password')
    },
    saraydecore: {
      username: getSetting('saraydecore_username') || '',
      hasPassword: !!getSetting('saraydecore_password')
    }
  });
});

router.post('/credentials', (req, res) => {
  try {
    const { source, username, email, password } = req.body;
    if (source === 'mostwda3') {
      if (username !== undefined) setSetting('mostwda3_username', username);
      if (password !== undefined) setSetting('mostwda3_password', password);
    } else if (source === 'chichomz') {
      if (email !== undefined) setSetting('chichomz_email', email);
      if (password !== undefined) setSetting('chichomz_password', password);
    } else if (source === 'raneen') {
      if (email !== undefined) setSetting('raneen_email', email);
      if (password !== undefined) setSetting('raneen_password', password);
    } else if (source === 'saraydecore') {
      if (username !== undefined) setSetting('saraydecore_username', username);
      if (password !== undefined) setSetting('saraydecore_password', password);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
