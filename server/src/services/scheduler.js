import cron from 'node-cron';
import { syncMostwda3API } from './mostwda3-sync.js';
import { scrapeChichomz } from '../scrapers/chichomz.js';
import { scrapeRaneen } from '../scrapers/raneen.js';
import { syncSarayDecoreAPI } from './saraydecore-sync.js';
import { hasCookies } from '../scrapers/browser.js';
import { logSync, getSetting, setSetting } from './database.js';

/* ── State ──────────────────────────────────────────────────────────────── */
let isRunning       = false;
let lastRun         = null;
let scheduledTask   = null;
let currentInterval = null;

// Per-source detailed status
let syncStatus = {
  mostwda3:    { state: 'idle', lastRun: null, lastSuccess: null, lastError: null, count: 0, duration: 0 },
  chichomz:    { state: 'idle', lastRun: null, lastSuccess: null, lastError: null, count: 0, duration: 0 },
  raneen:      { state: 'idle', lastRun: null, lastSuccess: null, lastError: null, count: 0, duration: 0 },
  saraydecore: { state: 'idle', lastRun: null, lastSuccess: null, lastError: null, count: 0, duration: 0 },
};

// SSE subscribers: Map<res, true>
const sseClients = new Set();

/* ── SSE helpers ──────────────────────────────────────────────────────────── */
export function addSseClient(res) {
  sseClients.add(res);
}
export function removeSseClient(res) {
  sseClients.delete(res);
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch (_) { sseClients.delete(client); }
  }
}

/* ── Interval helpers ──────────────────────────────────────────────────── */
function getIntervalMinutes() {
  const val = getSetting('sync_interval_minutes');
  return val ? parseInt(val, 10) : 60;
}

function getIntervalLabel(minutes) {
  if (minutes < 60)   return `Every ${minutes} min`;
  if (minutes === 60) return 'Every hour';
  if (minutes < 1440) return `Every ${(minutes / 60).toFixed(0)}h`;
  return `Every ${(minutes / 1440).toFixed(0)}d`;
}

function getIntervalCron(minutes) {
  if (minutes < 60)   return `*/${minutes} * * * *`;
  if (minutes < 1440) return `0 */${Math.floor(minutes / 60)} * * *`;
  return `0 0 */${Math.floor(minutes / 1440)} * *`;
}

/* ── Retry wrapper ───────────────────────────────────────────────────────── */
async function withRetry(fn, attempts = 3, delayMs = 2000) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

/* ── Persist last-synced per source ──────────────────────────────────────── */
function loadPersistedStatus() {
  for (const src of Object.keys(syncStatus)) {
    const saved = getSetting(`sync_last_success_${src}`);
    if (saved) syncStatus[src].lastSuccess = saved;
    const savedRun = getSetting(`sync_last_run_${src}`);
    if (savedRun) syncStatus[src].lastRun = savedRun;
    const savedErr = getSetting(`sync_last_error_${src}`);
    if (savedErr) syncStatus[src].lastError = savedErr;
  }
}

function persistSourceStatus(src) {
  const s = syncStatus[src];
  if (s.lastSuccess) setSetting(`sync_last_success_${src}`, s.lastSuccess);
  if (s.lastRun)     setSetting(`sync_last_run_${src}`,     s.lastRun);
  if (s.lastError)   setSetting(`sync_last_error_${src}`,   s.lastError);
}

/* ── Run one source ──────────────────────────────────────────────────────── */
async function runSource(name, fn, auto = true, needsLogin = false) {
  if (auto && needsLogin && !hasCookies(name)) {
    syncStatus[name].state = 'skipped';
    broadcast('source_update', { source: name, state: 'skipped', message: 'No saved session' });
    return { skipped: true };
  }

  const startTs = Date.now();
  const startIso = new Date().toISOString();
  syncStatus[name].state  = 'running';
  syncStatus[name].lastRun = startIso;

  broadcast('source_update', { source: name, state: 'running', startedAt: startIso });

  try {
    const result = await withRetry(() => fn(), 3, 2000);
    const durationMs = Date.now() - startTs;
    const synced = (result?.orders || 0) + (result?.products || 0);

    syncStatus[name].state       = 'success';
    syncStatus[name].lastSuccess = startIso;
    syncStatus[name].lastError   = null;
    syncStatus[name].count       = synced;
    syncStatus[name].duration    = durationMs;

    logSync(name, 'success', synced, null, startIso, {
      ordersSynced:   result?.orders   || 0,
      productsSynced: result?.products || 0,
      durationMs,
    });
    persistSourceStatus(name);

    broadcast('source_update', {
      source: name, state: 'success',
      orders: result?.orders || 0, products: result?.products || 0,
      durationMs, completedAt: new Date().toISOString(),
    });

    return result;
  } catch (err) {
    const durationMs = Date.now() - startTs;
    syncStatus[name].state     = 'failed';
    syncStatus[name].lastError = err.message;
    syncStatus[name].duration  = durationMs;

    logSync(name, 'failed', 0, err.message, startIso, { durationMs });
    persistSourceStatus(name);

    broadcast('source_update', {
      source: name, state: 'failed',
      error: err.message, durationMs, completedAt: new Date().toISOString(),
    });

    throw err;
  }
}

/* ── Public API ──────────────────────────────────────────────────────────── */
export function startScheduler() {
  loadPersistedStatus();
  const minutes = getIntervalMinutes();
  console.log(`[Scheduler] Starting — ${getIntervalLabel(minutes)}`);
  scheduleCron(minutes);

  setTimeout(async () => {
    console.log('[Scheduler] Running startup sync…');
    await runAllScrapers(true);
  }, 5000);
}

function scheduleCron(minutes) {
  if (scheduledTask) { scheduledTask.stop(); scheduledTask = null; }
  const cronExpr = getIntervalCron(minutes);
  scheduledTask  = cron.schedule(cronExpr, () => runAllScrapers(true));
  currentInterval = minutes;
}

export function updateSchedulerInterval(minutes) {
  setSetting('sync_interval_minutes', String(minutes));
  scheduleCron(minutes);
  return { success: true, interval: minutes, label: getIntervalLabel(minutes) };
}

export function getSchedulerInterval() {
  const minutes = getIntervalMinutes();
  return { interval: minutes, label: getIntervalLabel(minutes) };
}

export async function runAllScrapers(auto = true) {
  if (isRunning) return { success: false, message: 'Sync already in progress' };

  isRunning = true;
  lastRun   = new Date().toISOString();
  const results = {};

  broadcast('sync_start', { startedAt: lastRun, sources: Object.keys(syncStatus) });

  const tasks = [
    { name: 'mostwda3',    fn: syncMostwda3API,    needsLogin: false },
    { name: 'saraydecore', fn: syncSarayDecoreAPI,  needsLogin: false },
    { name: 'chichomz',    fn: scrapeChichomz,      needsLogin: true  },
    { name: 'raneen',      fn: scrapeRaneen,         needsLogin: true  },
  ];

  for (const { name, fn, needsLogin } of tasks) {
    try {
      results[name] = await runSource(name, fn, auto, needsLogin);
    } catch (err) {
      results[name] = { error: err.message };
      console.error(`[Scheduler] ${name} failed after retries:`, err.message);
    }
  }

  isRunning = false;
  broadcast('sync_complete', { completedAt: new Date().toISOString(), results });
  return { success: true, results };
}

export async function runSingleScraper(source) {
  if (isRunning) return { success: false, message: 'Sync already in progress' };

  const scrapers = {
    mostwda3:    { fn: syncMostwda3API,   needsLogin: false },
    saraydecore: { fn: syncSarayDecoreAPI, needsLogin: false },
    chichomz:    { fn: scrapeChichomz,    needsLogin: true  },
    raneen:      { fn: scrapeRaneen,       needsLogin: true  },
  };

  const scraper = scrapers[source];
  if (!scraper) return { success: false, error: `Unknown source: ${source}` };

  isRunning = true;
  try {
    await runSource(source, scraper.fn, false, scraper.needsLogin);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    isRunning = false;
  }
}

export function getSyncStatus() {
  const minutes = getIntervalMinutes();
  return {
    isRunning,
    lastRun,
    sources: syncStatus,
    nextSync: getIntervalLabel(minutes),
    interval: minutes,
    autoSync: true,
    // Legacy flat status shape for backward compat
    status: Object.fromEntries(
      Object.entries(syncStatus).map(([k, v]) => [k, v.state])
    ),
  };
}
