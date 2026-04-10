import {
  addPage,
  createDocument,
  needsNewPage,
  renderToBuffer,
  type HeaderConfig,
} from '../renderer.js';

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

export interface LabResultValue {
  parameter: string;
  value: string;
  unit: string;
  normalRange: string;
  isAbnormal: boolean;
}
export interface LabReportData {
  reportId: string;
  date: string;
  patient: { name: string; id: string; age: number; gender: string };
  doctor?: { name: string };
  testName: string;
  testCode: string;
  sampleType: string;
  collectedAt: string;
  reportedAt: string;
  results: LabResultValue[];
  notes?: string;
  technician?: string;
  verifiedBy?: string;
  isCritical: boolean;
  hospital: HeaderConfig;
}

export async function generateLabReport(data: LabReportData): Promise<Uint8Array> {
  const ctx = await createDocument({
    title: `Lab Report - ${data.testName}`,
    subject: 'Laboratory Test Report',
  });

  ctx.header = data.hospital;

  ctx.footer = {
    text: 'This report is electronically generated and does not require a signature.',
    showPageNumbers: true,
    showGeneratedAt: true,
  };

  let { page, y: startY } = addPage(ctx);
  const { bold, regular } = ctx.fonts;

  // 🔥 FIX: avoid header overlap
  let y = startY - 40;

  // ─────────────────────────────
  // 🧾 TITLE + STATUS
  // ─────────────────────────────

  page.drawText('LABORATORY REPORT', {
    x: MARGINS.left,
    y,
    size: 18,
    font: bold,
    color: colors.primary,
  });

  // RIGHT aligned critical badge
  if (data.isCritical) {
    drawTextRight(page, 'CRITICAL', y, {
      font: bold,
      size: 12,
      color: colors.danger,
    });
  }

  y -= 18;
  y = drawDivider(page, y, colors.primary, 1);
  y -= 20;

  // ─────────────────────────────
  // 📊 TWO COLUMN GRID (FIX)
  // ─────────────────────────────

  const colGap = 40;
  const colWidth = (page.getWidth() - MARGINS.left - MARGINS.right - colGap) / 2;

  const leftX = MARGINS.left;
  const rightX = leftX + colWidth + colGap;

  let rowY = y;

  // Section headers
  page.drawText('Patient Information', {
    x: leftX,
    y: rowY,
    size: 12,
    font: bold,
    color: colors.primary,
  });

  page.drawText('Test Details', {
    x: rightX,
    y: rowY,
    size: 12,
    font: bold,
    color: colors.primary,
  });

  rowY -= 15;

  const leftData = [
    ['Name', data.patient.name],
    ['Patient ID', data.patient.id],
    ['Age / Gender', `${data.patient.age} yrs / ${data.patient.gender}`],
    ...(data.doctor ? [['Referred By', `Dr. ${data.doctor.name}`]] : []),
  ];

  const rightData = [
    ['Test', `${data.testName} (${data.testCode})`],
    ['Sample Type', data.sampleType],
    ['Collected', data.collectedAt],
    ['Reported', data.reportedAt],
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

  // ─────────────────────────────
  // 📦 RESULTS TABLE
  // ─────────────────────────────

  y = drawSectionHeader(page, 'Results', y, bold);

  const columns: TableColumn[] = [
    { header: 'Parameter', width: 170 },
    { header: 'Value', width: 90, align: 'right' },
    { header: 'Unit', width: 80 },
    { header: 'Normal Range', width: 100 },
    { header: 'Status', width: 55, align: 'right' },
  ];

  const rows = data.results.map((r) => [
    r.parameter,
    r.value,
    r.unit,
    r.normalRange,
    r.isAbnormal ? 'ABNORMAL' : 'Normal',
  ]);

  // 🔥 prevent overflow before drawing table
  if (needsNewPage(y)) {
    ({ page, y } = addPage(ctx));
  }

  y -= 10;

  y = drawTable(page, MARGINS.left, y, {
    columns,
    rows,
    boldFont: bold,
    regularFont: regular,
  });

  // ─────────────────────────────
  // 📝 NOTES
  // ─────────────────────────────

  if (data.notes) {
    if (needsNewPage(y)) {
      ({ page, y } = addPage(ctx));
    }

    y -= 10;
    y = drawSectionHeader(page, 'Notes', y, bold);

    y = drawText(page, data.notes, MARGINS.left, y, {
      font: regular,
      size: 9,
      color: colors.gray,
      maxWidth: page.getWidth() - MARGINS.left - MARGINS.right, // 🔥 wrap fix
    });
  }

  // ─────────────────────────────
  // ✍ SIGNATURE BLOCK (FIXED)
  // ─────────────────────────────

  const labelX = MARGINS.left;
  const valueX = MARGINS.left + 120; // fixed spacing (no wrap issue)

  if (data.technician) {
    page.drawText('Lab Technician:', {
      x: labelX,
      y,
      font: bold,
      color: colors.gray,
      size: 10,
    });

    page.drawText(data.technician, {
      x: valueX,
      y,
      font: regular,
      color: colors.gray,
      size: 10,
    });

    y -= 14;
  }

  if (data.verifiedBy) {
    page.drawText('Verified By:', {
      x: labelX,
      y,
      font: bold,
      color: colors.gray,
      size: 10,
    });

    page.drawText(data.verifiedBy, {
      x: valueX,
      y,
      font: regular,
      color: colors.gray,
      size: 10,
    });

    y -= 14;
  }
  return renderToBuffer(ctx);
}
