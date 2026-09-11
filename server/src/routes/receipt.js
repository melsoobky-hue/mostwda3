import { Router } from 'express';
import { getOrderById } from '../services/database.js';
import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const router = Router();
const COOKIES_DIR = join(process.cwd(), 'cookies');

function loadCookies(source) {
  try {
    const p = join(COOKIES_DIR, `${source}.json`);
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  } catch (_) {}
  return null;
}

router.get('/:id', async (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (order.source !== 'chichomz') {
    return res.status(400).json({ error: 'PDF download only available for Chichomz orders' });
  }

  const itemId = order.source_order_id;
  if (!itemId) return res.status(400).json({ error: 'No item ID found' });

  let browser = null;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      acceptDownloads: true,
    });

    const cookies = loadCookies('chichomz');
    if (cookies) await context.addCookies(cookies);

    const page = await context.newPage();
    await page.goto(`https://new.vendorschichomz.com/items/${itemId}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const printBtn = await page.$('button:has-text("Print"), a:has-text("Print"), button:has-text("طباعة")');
    if (!printBtn) {
      await browser.close();
      return res.status(404).json({ error: 'Print button not found on page' });
    }

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      printBtn.click(),
    ]);

    const fileName = download.suggestedFilename() || `receipt-${itemId}.pdf`;
    const buffer = await download.path().then(p => readFileSync(p));

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('[Receipt] PDF download failed:', error.message);
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({ error: `PDF download failed: ${error.message}` });
  }
});

export default router;
