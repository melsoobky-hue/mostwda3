import { Router } from 'express';
import { runAllScrapers, runSingleScraper, getSyncStatus, updateSchedulerInterval, getSchedulerInterval, addSseClient, removeSseClient, broadcastProgress } from '../services/scheduler.js';
import { getSyncLogs, getSetting, setSetting } from '../services/database.js';
import { loginChichomzInteractive } from '../scrapers/chichomz.js';
import { loginRaneenInteractive } from '../scrapers/raneen.js';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const COOKIES_DIR = join(process.cwd(), 'cookies');

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

// Source profiles — used by Settings.jsx
router.get('/profiles', (req, res) => {
  try {
    const status = getSyncStatus();
    const sources = ['mostwda3', 'saraydecore', 'chichomz', 'raneen'];
    const profiles = {};
    for (const src of sources) {
      const s = status.sources?.[src] || {};
      const hasCreds =
        src === 'mostwda3'    ? !!(getSetting('mostwda3_username') && getSetting('mostwda3_password')) :
        src === 'saraydecore' ? !!(getSetting('saraydecore_username') && getSetting('saraydecore_password')) :
        src === 'chichomz'   ? !!(getSetting('chichomz_email') && getSetting('chichomz_password')) :
        src === 'raneen'      ? !!(getSetting('raneen_email') && getSetting('raneen_password')) : false;
      profiles[src] = {
        status: s.state === 'success' ? 'active' : hasCreds ? 'configured' : 'idle',
        hasCredentials: hasCreds,
        lastRun: s.lastRun || null,
        lastSuccess: s.lastSuccess || null,
        lastError: s.lastError || null,
      };
    }
    res.json({ profiles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Credential management ──────────────────────────────────────────────────

router.get('/credentials', (req, res) => {
  res.json({
    mostwda3: {
      username: getSetting('mostwda3_username') || '',
      hasPassword: !!getSetting('mostwda3_password'),
    },
    chichomz: {
      email: getSetting('chichomz_email') || '',
      hasPassword: !!getSetting('chichomz_password'),
      hasCookies: existsSync(join(COOKIES_DIR, 'chichomz.json')),
    },
    raneen: {
      email: getSetting('raneen_email') || '',
      hasPassword: !!getSetting('raneen_password'),
      hasCookies: existsSync(join(COOKIES_DIR, 'raneen.json')),
    },
    saraydecore: {
      username: getSetting('saraydecore_username') || '',
      hasPassword: !!getSetting('saraydecore_password'),
    },
  });
});

router.post('/credentials', (req, res) => {
  try {
    const { source, username, email, password } = req.body;
    if (source === 'mostwda3') {
      if (username !== undefined) setSetting('mostwda3_username', username);
      if (password !== undefined) setSetting('mostwda3_password', password);
    } else if (source === 'chichomz') {
      if (email    !== undefined) setSetting('chichomz_email',    email);
      if (password !== undefined) setSetting('chichomz_password', password);
    } else if (source === 'raneen') {
      if (email    !== undefined) setSetting('raneen_email',    email);
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

// Clear saved cookies for a browser-scraped source
router.delete('/cookies/:source', (req, res) => {
  const source = req.params.source;
  if (!['chichomz', 'raneen'].includes(source)) {
    return res.status(400).json({ error: 'Only chichomz and raneen have saved sessions' });
  }
  try {
    const p = join(COOKIES_DIR, `${source}.json`);
    if (existsSync(p)) unlinkSync(p);
    res.json({ success: true, message: `Session cleared for ${source}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Interactive browser login (opens visible browser window on server) ─────

// Track active interactive login sessions so UI can poll progress
const loginSessions = {};

router.post('/login/:source', async (req, res) => {
  const source = req.params.source;
  if (!['chichomz', 'raneen'].includes(source)) {
    return res.status(400).json({ error: 'Only chichomz and raneen support browser login' });
  }

  // Already running?
  if (loginSessions[source]?.running) {
    return res.json({ already_running: true, logs: loginSessions[source].logs });
  }

  const session = { running: true, logs: [], success: false, error: null };
  loginSessions[source] = session;

  const onProgress = (msg) => {
    session.logs.push({ time: new Date().toISOString(), msg });
    // Also broadcast over SSE so the live-events feed picks it up
    broadcastProgress(source, msg);
  };

  // Fire-and-forget — client polls /login/:source/status
  const loginFn = source === 'chichomz' ? loginChichomzInteractive : loginRaneenInteractive;
  loginFn(onProgress)
    .then(() => { session.running = false; session.success = true; })
    .catch((e) => { session.running = false; session.error = e.message; onProgress(`Error: ${e.message}`); });

  res.json({ started: true });
});

router.get('/login/:source/status', (req, res) => {
  const source = req.params.source;
  const session = loginSessions[source];
  if (!session) return res.json({ idle: true });
  res.json({
    running: session.running,
    success: session.success,
    error:   session.error,
    logs:    session.logs,
    hasCookies: existsSync(join(COOKIES_DIR, `${source}.json`)),
  });
});

export default router;
