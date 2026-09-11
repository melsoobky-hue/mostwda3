import { Router } from 'express';
import { getOrderById } from '../services/database.js';
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
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
  let browser = null;
  try {
    const order = getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.source !== 'chichomz') return res.status(400).json({ error: 'PDF only for Chichomz orders' });

    const itemId = order.source_order_id;
    if (!itemId) return res.status(400).json({ error: 'No item ID' });

    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    const cookies = loadCookies('chichomz');
    if (cookies) await context.addCookies(cookies);

    const page = await context.newPage();

    console.log(`[Receipt] Opening item ${itemId}...`);
    await page.goto(`https://new.vendorschichomz.com/items/${itemId}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Try to intercept PDF download first
    let pdfBuffer = null;

    // Method 1: Check if Print triggers a download
    try {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }),
        page.click('button:has-text("Print"):visible, a:has-text("Print"):visible', { timeout: 3000 }),
      ]);
      const filePath = await download.path();
      pdfBuffer = readFileSync(filePath);
      console.log(`[Receipt] Got PDF via download: ${pdfBuffer.length} bytes`);
    } catch (_) {
      console.log('[Receipt] No download event, using page.pdf() fallback...');
    }

    // Method 2: Generate PDF from the page itself
    if (!pdfBuffer) {
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      console.log(`[Receipt] Generated PDF from page: ${pdfBuffer.length} bytes`);
    }

    await browser.close();

    const fileName = `receipt-${itemId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[Receipt] Error:', error.message);
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({ error: error.message });
  }
});

export default router;
