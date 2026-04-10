import {
  createDocument,
  addPage,
  renderToBuffer,
  type HeaderConfig,
} from '../renderer.js';
import {
  MARGINS,
  drawText,
  drawTextRight,
  drawKeyValue,
  drawDivider,
  drawSectionHeader,
  drawTable,
  type TableColumn,
} from '../layout.js';
import { colors } from '../colors.js';

export interface InvoiceItem {
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  patient: {
    name: string;
    id: string;
    phone?: string;
    email?: string;
  };
  doctor?: {
    name: string;
    specialization?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  paymentMethod?: string;
  hospital: HeaderConfig;
}

export async function generateInvoice(data: InvoiceData): Promise<Uint8Array> {
  const ctx = await createDocument({
    title: `Invoice ${data.invoiceNumber}`,
    subject: 'Medical Invoice',
  });

  ctx.header = data.hospital;
  ctx.footer = {
    text: 'This is a computer-generated invoice. No signature required.',
    showPageNumbers: true,
    showGeneratedAt: true,
  };

  const { page, y: startY } = addPage(ctx);
  const { bold, regular } = ctx.fonts;
  let y = startY;

  // ── Invoice Title ──
  page.drawText('INVOICE', {
    x: MARGINS.left,
    y,
    size: 22,
    font: bold,
    color: colors.primary,
  });

  // Status badge (right-aligned)
  const statusColor = data.status === 'PAID' ? colors.secondary : colors.danger;
  drawTextRight(page, data.status.toUpperCase(), y, {
    font: bold,
    size: 14,
    color: statusColor,
  });

  y -= 30;

  // ── Invoice details (left) + Patient details (right) ──
  y = drawKeyValue(page, 'Invoice No', data.invoiceNumber, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Date', data.date, MARGINS.left, y, bold, regular);
  if (data.dueDate) {
    y = drawKeyValue(page, 'Due Date', data.dueDate, MARGINS.left, y, bold, regular);
  }
  if (data.paymentMethod) {
    y = drawKeyValue(page, 'Payment', data.paymentMethod, MARGINS.left, y, bold, regular);
  }

  y -= 8;
  y = drawSectionHeader(page, 'Patient Details', y, bold);
  y = drawKeyValue(page, 'Name', data.patient.name, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Patient ID', data.patient.id, MARGINS.left, y, bold, regular);
  if (data.patient.phone) {
    y = drawKeyValue(page, 'Phone', data.patient.phone, MARGINS.left, y, bold, regular);
  }
  if (data.doctor) {
    y = drawKeyValue(page, 'Doctor', `Dr. ${data.doctor.name}`, MARGINS.left, y, bold, regular);
  }

  y -= 8;

  // ── Items Table ──
  y = drawSectionHeader(page, 'Billing Items', y, bold);

  const columns: TableColumn[] = [
    { header: '#', width: 30 },
    { header: 'Description', width: 200 },
    { header: 'Type', width: 80 },
    { header: 'Qty', width: 40, align: 'right' },
    { header: 'Unit Price', width: 70, align: 'right' },
    { header: 'Total', width: 75.28, align: 'right' },
  ];

  const rows = data.items.map((item, i) => [
    String(i + 1),
    item.description,
    item.type,
    String(item.quantity),
    `₹${item.unitPrice.toFixed(2)}`,
    `₹${item.totalPrice.toFixed(2)}`,
  ]);

  y = drawTable(page, MARGINS.left, y, {
    columns,
    rows,
    boldFont: bold,
    regularFont: regular,
  });

  y -= 5;

  // ── Totals ──
  const totalsX = MARGINS.left + 330;
  y = drawKeyValue(page, 'Subtotal', `₹${data.subtotal.toFixed(2)}`, totalsX, y, bold, regular);
  if (data.discount > 0) {
    y = drawKeyValue(page, 'Discount', `-₹${data.discount.toFixed(2)}`, totalsX, y, bold, regular);
  }
  if (data.tax > 0) {
    y = drawKeyValue(page, 'Tax', `₹${data.tax.toFixed(2)}`, totalsX, y, bold, regular);
  }
  y = drawDivider(page, y, colors.tableBorder, 0.5);

  page.drawText('Total Amount:', {
    x: totalsX,
    y,
    size: 12,
    font: bold,
    color: colors.darkGray,
  });
  const totalText = `₹${data.totalAmount.toFixed(2)}`;
  drawTextRight(page, totalText, y, { font: bold, size: 12, color: colors.primary });
  y -= 20;

  if (data.paidAmount > 0 && data.paidAmount < data.totalAmount) {
    y = drawKeyValue(page, 'Paid', `₹${data.paidAmount.toFixed(2)}`, totalsX, y, bold, regular);
    const balance = data.totalAmount - data.paidAmount;
    y = drawKeyValue(page, 'Balance Due', `₹${balance.toFixed(2)}`, totalsX, y, bold, regular);
  }

  return renderToBuffer(ctx);
}
