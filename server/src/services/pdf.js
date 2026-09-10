/**
 * PDF generation service using PDFKit.
 * Generates PDF invoices and estimates with full line items, tax breakdown, and branding.
 */
import PDFDocument from 'pdfkit';

const PRIMARY = '#4f6ef7';   // accent blue
const MUTED   = '#888888';
const TEXT    = '#1a1a2e';
const BORDER  = '#e8e8ee';

function header(doc, data) {
  doc.fillColor(PRIMARY).rect(0, 0, doc.page.width, 6).fill();
  doc.fillColor(TEXT).fontSize(20).font('Helvetica-Bold').text('Mostawdaa', 40, 28);
  doc.fillColor(MUTED).fontSize(9).font('Helvetica').text('Mirrors Dashboard', 40, 52);
  const typeLabel = data.type === 'estimate' ? 'ESTIMATE' : 'INVOICE';
  doc.fillColor(PRIMARY).fontSize(22).font('Helvetica-Bold')
    .text(typeLabel, 0, 28, { align: 'right', width: doc.page.width - 40 });
  doc.fillColor(MUTED).fontSize(9).font('Helvetica')
    .text(`#${data.invoice_number || data.estimate_number || ''}`, 0, 55, { align: 'right', width: doc.page.width - 40 });
  doc.moveTo(40, 75).lineTo(doc.page.width - 40, 75).strokeColor(BORDER).lineWidth(1).stroke();
}

function infoRow(doc, y, left, right) {
  const col1x = 40, col2x = doc.page.width / 2;
  if (left) {
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(left[0], col1x, y);
    doc.fillColor(TEXT).fontSize(9).font('Helvetica-Bold').text(left[1] || '—', col1x, y + 12);
  }
  if (right) {
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(right[0], col2x, y);
    doc.fillColor(TEXT).fontSize(9).font('Helvetica-Bold').text(right[1] || '—', col2x, y + 12);
  }
  return y + 30;
}

function billTo(doc, data) {
  let y = 90;
  y = infoRow(doc, y, ['Bill To', data.customer_name], ['Date', data.date]);
  y = infoRow(doc, y, ['Email', data.customer_email || '—'], ['Due Date', data.due_date || '—']);
  y = infoRow(doc, y, ['Phone', data.customer_phone || '—'], ['Status', (data.status || '').toUpperCase()]);
  if (data.customer_address) {
    doc.fillColor(MUTED).fontSize(8).text('Address', 40, y);
    doc.fillColor(TEXT).fontSize(9).font('Helvetica').text(data.customer_address, 40, y + 12);
    y += 30;
  }
  doc.moveTo(40, y + 5).lineTo(doc.page.width - 40, y + 5).strokeColor(BORDER).lineWidth(0.5).stroke();
  return y + 15;
}

function lineItemsTable(doc, items, startY, currency) {
  const sym = currency === 'USD' ? '$' : 'ج.م';
  const cols = { name: 40, qty: 280, price: 340, disc: 420, tax: 470, total: 510 };
  const headerY = startY;

  doc.fillColor('#f0f2ff').rect(40, headerY - 4, doc.page.width - 80, 20).fill();
  doc.fillColor(PRIMARY).fontSize(8).font('Helvetica-Bold');
  doc.text('Description', cols.name, headerY);
  doc.text('Qty', cols.qty, headerY);
  doc.text('Unit Price', cols.price, headerY);
  doc.text('Disc%', cols.disc, headerY);
  doc.text('Tax%', cols.tax, headerY);
  doc.text('Total', cols.total, headerY);

  let y = headerY + 22;
  items.forEach((item, i) => {
    if (y > doc.page.height - 150) { doc.addPage(); y = 60; }
    if (i % 2 === 0) {
      doc.fillColor('#fafbff').rect(40, y - 4, doc.page.width - 80, 18).fill();
    }
    doc.fillColor(TEXT).fontSize(8).font('Helvetica');
    const name = (item.product_name || item.description || '').slice(0, 35);
    doc.text(name, cols.name, y, { width: 230 });
    doc.text(String(item.quantity || 1), cols.qty, y);
    doc.text(`${sym} ${(item.unit_price || 0).toFixed(2)}`, cols.price, y);
    doc.text(`${item.discount_percent || 0}%`, cols.disc, y);
    doc.text(`${item.tax_percent || 0}%`, cols.tax, y);
    doc.text(`${sym} ${(item.total || 0).toFixed(2)}`, cols.total, y);
    y += 20;
  });
  return y + 10;
}

function totalsBlock(doc, data, y, currency) {
  const sym = currency === 'USD' ? '$' : 'ج.م';
  const rightX = doc.page.width - 200;
  const labelW = 120, valueX = rightX + labelW;

  const rows = [
    ['Subtotal', `${sym} ${(data.subtotal || 0).toFixed(2)}`],
  ];
  if (data.discount_amount > 0) rows.push(['Discount', `- ${sym} ${(data.discount_amount || 0).toFixed(2)}`]);
  if (data.shipping_cost > 0)   rows.push(['Shipping', `${sym} ${(data.shipping_cost || 0).toFixed(2)}`]);
  rows.push([`Tax (${data.tax_percent || 0}%)`, `${sym} ${(data.tax_amount || 0).toFixed(2)}`]);

  rows.forEach(([label, value]) => {
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(label, rightX, y);
    doc.fillColor(TEXT).fontSize(8).font('Helvetica').text(value, valueX, y, { width: 90, align: 'right' });
    y += 16;
  });

  doc.moveTo(rightX, y).lineTo(doc.page.width - 40, y).strokeColor(PRIMARY).lineWidth(1).stroke();
  y += 6;
  doc.fillColor(PRIMARY).rect(rightX - 8, y - 4, doc.page.width - rightX + 8, 22).fill();
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
    .text('TOTAL', rightX, y)
    .text(`${sym} ${(data.total || 0).toFixed(2)}`, valueX, y, { width: 90, align: 'right' });
  y += 28;

  if (data.amount_paid > 0) {
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text('Amount Paid', rightX, y);
    doc.fillColor('#27ae60').fontSize(8).text(`${sym} ${(data.amount_paid || 0).toFixed(2)}`, valueX, y, { width: 90, align: 'right' });
    y += 16;
    doc.fillColor(MUTED).fontSize(8).text('Balance Due', rightX, y);
    doc.fillColor(TEXT).fontSize(9).font('Helvetica-Bold')
      .text(`${sym} ${(data.balance_due || 0).toFixed(2)}`, valueX, y, { width: 90, align: 'right' });
  }
  return y + 30;
}

function notesBlock(doc, data, y) {
  if (data.notes) {
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text('Notes', 40, y);
    doc.fillColor(TEXT).fontSize(8).text(data.notes, 40, y + 12, { width: 280 });
  }
  if (data.terms) {
    doc.fillColor(MUTED).fontSize(8).text('Terms & Conditions', 40, y + 30);
    doc.fillColor(TEXT).fontSize(8).text(data.terms, 40, y + 42, { width: 280 });
  }
}

function footer(doc) {
  const bottom = doc.page.height - 30;
  doc.fillColor(PRIMARY).rect(0, bottom - 6, doc.page.width, 6).fill();
  doc.fillColor(MUTED).fontSize(8).font('Helvetica')
    .text('Thank you for your business!', 0, bottom - 20, { align: 'center', width: doc.page.width });
}

export function generateInvoicePDF(invoiceData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    header(doc, invoiceData);
    let y = billTo(doc, invoiceData);
    y = lineItemsTable(doc, invoiceData.items || [], y, invoiceData.currency);
    y = totalsBlock(doc, invoiceData, y, invoiceData.currency);
    notesBlock(doc, invoiceData, y);
    footer(doc);
    doc.end();
  });
}

export function generateEstimatePDF(estimateData) {
  return generateInvoicePDF({ ...estimateData, type: 'estimate' });
}
