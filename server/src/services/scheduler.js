import cron from 'node-cron';
import { syncMostwda3API } from './mostwda3-sync.js';
import { scrapeChichomz } from '../scrapers/chichomz.js';
import { scrapeRaneen } from '../scrapers/raneen.js';
import { syncSarayDecoreAPI } from './saraydecore-sync.js';
import { hasCookies } from '../scrapers/browser.js';
import { logSync, getSetting, setSetting } from './database.js';

let isRunning = false;
let lastRun = null;
let syncStatus = { mostwda3: 'idle', chichomz: 'idle', raneen: 'idle', saraydecore: 'idle' };
let scheduledTask = null;
let currentInterval = null;

function getIntervalMinutes() {
  const val = getSetting('sync_interval_minutes');
  return val ? parseInt(val, 10) : 60;
}

function getIntervalLabel(minutes) {
  if (minutes < 60) return `Every ${minutes} minutes`;
  if (minutes === 60) return 'Every 1 hour';
  if (minutes < 1440) return `Every ${(minutes / 60).toFixed(1)} hours`;
  return `Every ${(minutes / 1440).toFixed(1)} days`;
}

function getIntervalCron(minutes) {
  if (minutes < 60) return `*/${minutes} * * * *`;
  if (minutes < 1440) return `0 */${Math.floor(minutes / 60)} * * *`;
  return `0 0 */${Math.floor(minutes / 1440)} * * *`;
}

export function startScheduler() {
  const minutes = getIntervalMinutes();
  console.log(`[Scheduler] Auto-sync enabled - ${getIntervalLabel(minutes)}`);
  scheduleCron(minutes);

  setTimeout(async () => {
    console.log('[Scheduler] Running initial sync on startup...');
    await runAllScrapers();
  }, 5000);
}

function scheduleCron(minutes) {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  const cronExpr = getIntervalCron(minutes);
  console.log(`[Scheduler] Scheduling with cron: ${cronExpr}`);
  scheduledTask = cron.schedule(cronExpr, async () => {
    console.log('[Scheduler] Auto-sync triggered');
    await runAllScrapers();
  });
  currentInterval = minutes;
}

export function updateSchedulerInterval(minutes) {
  setSetting('sync_interval_minutes', String(minutes));
  scheduleCron(minutes);
  console.log(`[Scheduler] Interval updated to ${getIntervalLabel(minutes)}`);
  return { success: true, interval: minutes, label: getIntervalLabel(minutes) };
}

export function getSchedulerInterval() {
  const minutes = getIntervalMinutes();
  return { interval: minutes, label: getIntervalLabel(minutes) };
}

export async function runAllScrapers(auto = true) {
  if (isRunning) {
    console.log('[Scheduler] Sync already in progress, skipping...');
    return { success: false, message: 'Sync already in progress' };
  }

  isRunning = true;
  lastRun = new Date().toISOString();
  const results = {};

  const tasks = [
    { name: 'mostwda3', fn: syncMostwda3API, needsLogin: false },
    { name: 'saraydecore', fn: syncSarayDecoreAPI, needsLogin: false },
    { name: 'chichomz', fn: scrapeChichomz, needsLogin: true },
    { name: 'raneen', fn: scrapeRaneen, needsLogin: true },
  ];

  for (const { name, fn, needsLogin } of tasks) {
    if (auto && needsLogin && !hasCookies(name)) {
      console.log(`[Scheduler] ${name} - skipping (no saved session, run manually to log in)`);
      syncStatus[name] = 'skipped';
      results[name] = 'skipped - no session';
      continue;
    }

    syncStatus[name] = 'running';
    try {
      const start = new Date().toISOString();
      const result = await fn();
      const synced = result?.orders || result?.products ? result.orders + result.products : 0;
      logSync(name, 'success', synced, null, start, {
        ordersSynced: result?.orders || 0, productsSynced: result?.products || 0
      });
      syncStatus[name] = 'success';
      results[name] = 'success';
      console.log(`[Scheduler] ${name} sync complete`);
    } catch (error) {
      logSync(name, 'failed', 0, error.message, new Date().toISOString());
      syncStatus[name] = 'failed';
      results[name] = error.message;
      console.error(`[Scheduler] ${name} failed:`, error.message);
    }
  }

  isRunning = false;
  return { success: true, results };
}

export function getSyncStatus() {
  const minutes = getIntervalMinutes();
  return {
    isRunning,
    lastRun,
    status: syncStatus,
    nextSync: getIntervalLabel(minutes),
    interval: minutes,
    autoSync: true
  };
}

export async function runSingleScraper(source) {
  if (isRunning) {
    return { success: false, message: 'Sync already in progress' };
  }

  isRunning = true;
  try {
    syncStatus[source] = 'running';
    const start = new Date().toISOString();

    const scrapers = {
      mostwda3: syncMostwda3API,
      saraydecore: syncSarayDecoreAPI,
      chichomz: scrapeChichomz,
      raneen: scrapeRaneen,
    };

    const scraper = scrapers[source];
    if (!scraper) throw new Error(`Unknown source: ${source}`);

    const result = await scraper();
    const synced = result?.orders || result?.products ? result.orders + result.products : 0;
    logSync(source, 'success', synced, null, start, {
      ordersSynced: result?.orders || 0, productsSynced: result?.products || 0
    });
    syncStatus[source] = 'success';
    return { success: true };
  } catch (error) {
    logSync(source, 'failed', 0, error.message, new Date().toISOString());
    syncStatus[source] = 'failed';
    return { success: false, error: error.message };
  } finally {
    isRunning = false;
  }
}
