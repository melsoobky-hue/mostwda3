import { Router } from 'express';
import { generateOrdersReport, generateAnalyticsReport, generateProductsReport } from '../services/excel.js';

const router = Router();

router.get('/orders', async (req, res) => {
  try {
    const { source, status, governorate, dateFrom, dateTo, search } = req.query;
    const workbook = await generateOrdersReport({ source, status, governorate, dateFrom, dateTo, search });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=orders-report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const workbook = await generateAnalyticsReport(dateFrom, dateTo);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics-report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products', async (req, res) => {
  try {
    const workbook = await generateProductsReport();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=products-report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
