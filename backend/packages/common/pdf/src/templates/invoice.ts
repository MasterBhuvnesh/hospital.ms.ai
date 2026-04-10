import { addPage, createDocument, renderToBuffer, type HeaderConfig } from '../renderer.js';

import {
  MARGINS,
  drawDivider,
  drawSectionHeader,
  drawTable,
  drawText,
  drawTextRight,
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
  };
  doctor?: {
    name: string;
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

  let y = startY - 40;

  page.drawText('INVOICE', {
    x: MARGINS.left,
    y,
    size: 20,
    font: bold,
    color: colors.primary,
  });

  drawTextRight(page, data.status.toUpperCase(), y, {
    font: bold,
    size: 14,
    color: data.status === 'PAID' ? colors.secondary : colors.danger,
  });

  y -= 18;

  y = drawDivider(page, y, colors.primary, 1);

  y -= 20;

  const colGap = 40;
  const colWidth = (page.getWidth() - MARGINS.left - MARGINS.right - colGap) / 2;

  const leftX = MARGINS.left;
  const rightX = leftX + colWidth + colGap;

  let rowY = y - 15;

  page.drawText('Invoice Details', {
    x: leftX,
    y: rowY,
    size: 12,
    font: bold,
    color: colors.primary,
  });

  page.drawText('Patient Details', {
    x: rightX,
    y: rowY,
    size: 12,
    font: bold,
    color: colors.primary,
  });

  rowY -= 15;

  const leftData = [
    ['Invoice No', data.invoiceNumber],
    ['Date', data.date],
    ...(data.dueDate ? [['Due Date', data.dueDate]] : []),
    ...(data.paymentMethod ? [['Payment', data.paymentMethod]] : []),
  ];

  const rightData = [
    ['Name', data.patient.name],
    ['Patient ID', data.patient.id],
    ...(data.patient.phone ? [['Phone', data.patient.phone]] : []),
    ...(data.doctor ? [['Doctor', `Dr. ${data.doctor.name}`]] : []),
  ];

  const maxRows = Math.max(leftData.length, rightData.length);

  for (let i = 0; i < maxRows; i++) {
    if (leftData[i]) {
      drawText(page, `${leftData[i][0]}: ${leftData[i][1]}`, leftX, rowY, {
        font: regular,
        size: 10,
      });
    }

    if (rightData[i]) {
      drawText(page, `${rightData[i][0]}: ${rightData[i][1]}`, rightX, rowY, {
        font: regular,
        size: 10,
      });
    }

    rowY -= 14;
  }

  y = rowY - 20;

  y = drawSectionHeader(page, 'Billing Items', y, bold);

  const columns: TableColumn[] = [
    { header: '#', width: 30 },
    { header: 'Description', width: 200 },
    { header: 'Type', width: 80 },
    { header: 'Qty', width: 40, align: 'right' },
    { header: 'Unit Price', width: 70, align: 'right' },
    { header: 'Total', width: 75, align: 'right' },
  ];

  const rows = data.items.map((item, i) => [
    String(i + 1),
    item.description,
    item.type,
    String(item.quantity),
    `Rs. ${item.unitPrice.toFixed(2)}`,
    `Rs. ${item.totalPrice.toFixed(2)}`,
  ]);

  y -= 10;

  y = drawTable(page, MARGINS.left, y, {
    columns,
    rows,
    boldFont: bold,
    regularFont: regular,
  });

  y -= 15;

  const totalsWidth = 220;
  const totalsX = page.getWidth() - MARGINS.right - totalsWidth;
  const rightEdge = totalsX + totalsWidth;

  const totals = [
    ['Subtotal', `Rs. ${data.subtotal.toFixed(2)}`],
    ...(data.discount > 0 ? [['Discount', `-Rs. ${data.discount.toFixed(2)}`]] : []),
    ...(data.tax > 0 ? [['Tax', `Rs. ${data.tax.toFixed(2)}`]] : []),
  ];

  for (const [label, value] of totals) {
    drawText(page, label, totalsX, y, {
      font: regular,
      size: 10,
    });

    drawTextRight(page, value, y, {
      font: regular,
      size: 10,
    });

    y -= 14;
  }

  y = drawDivider(page, y, colors.tableBorder, 0.5);
  y -= 10;

  drawText(page, 'Total Amount:', totalsX, y, {
    font: bold,
    size: 12,
    color: colors.darkGray,
  });

  drawTextRight(page, `Rs. ${data.totalAmount.toFixed(2)}`, y, {
    font: bold,
    size: 12,
    color: colors.primary,
  });

  y -= 20;

  if (data.paidAmount > 0 && data.paidAmount < data.totalAmount) {
    drawText(page, 'Paid', totalsX, y, {
      font: regular,
      size: 10,
    });

    drawTextRight(page, `Rs. ${data.paidAmount.toFixed(2)}`, y, {
      font: regular,
      size: 10,
    });

    y -= 14;

    const balance = data.totalAmount - data.paidAmount;

    drawText(page, 'Balance Due', totalsX, y, {
      font: regular,
      size: 10,
    });

    drawTextRight(page, `Rs. ${balance.toFixed(2)}`, y, {
      font: regular,
      size: 10,
    });

    y -= 14;
  }

  if (y < 100) {
    const newPage = addPage(ctx);
    y = newPage.y;
  }

  return renderToBuffer(ctx);
}
