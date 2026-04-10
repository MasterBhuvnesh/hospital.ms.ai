import {
  createDocument,
  addPage,
  renderToBuffer,
  needsNewPage,
  type HeaderConfig,
} from '../renderer.js';
import {
  MARGINS,
  drawKeyValue,
  drawSectionHeader,
  drawTable,
  drawText,
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
  patient: {
    name: string;
    id: string;
    age: number;
    gender: string;
  };
  doctor?: {
    name: string;
  };
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

  let { page, y } = addPage(ctx);
  const { bold, regular } = ctx.fonts;

  // ── Title ──
  page.drawText('LABORATORY REPORT', {
    x: MARGINS.left,
    y,
    size: 18,
    font: bold,
    color: colors.primary,
  });

  if (data.isCritical) {
    page.drawText('⚠ CRITICAL', {
      x: MARGINS.left + 220,
      y,
      size: 14,
      font: bold,
      color: colors.danger,
    });
  }

  y -= 28;

  // ── Patient Info ──
  y = drawSectionHeader(page, 'Patient Information', y, bold);
  y = drawKeyValue(page, 'Name', data.patient.name, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Patient ID', data.patient.id, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Age / Gender', `${data.patient.age} yrs / ${data.patient.gender}`, MARGINS.left, y, bold, regular);
  if (data.doctor) {
    y = drawKeyValue(page, 'Referred By', `Dr. ${data.doctor.name}`, MARGINS.left, y, bold, regular);
  }

  y -= 8;

  // ── Test Info ──
  y = drawSectionHeader(page, 'Test Details', y, bold);
  y = drawKeyValue(page, 'Test', `${data.testName} (${data.testCode})`, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Sample Type', data.sampleType, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Collected', data.collectedAt, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Reported', data.reportedAt, MARGINS.left, y, bold, regular);

  y -= 8;

  // ── Results Table ──
  y = drawSectionHeader(page, 'Results', y, bold);

  const columns: TableColumn[] = [
    { header: 'Parameter', width: 170 },
    { header: 'Value', width: 90, align: 'right' },
    { header: 'Unit', width: 80 },
    { header: 'Normal Range', width: 100 },
    { header: 'Status', width: 55.28, align: 'right' },
  ];

  const rows = data.results.map((r) => [
    r.parameter,
    r.value,
    r.unit,
    r.normalRange,
    r.isAbnormal ? 'ABNORMAL' : 'Normal',
  ]);

  y = drawTable(page, MARGINS.left, y, {
    columns,
    rows,
    boldFont: bold,
    regularFont: regular,
  });

  // ── Notes ──
  if (data.notes) {
    if (needsNewPage(y)) {
      ({ page, y } = addPage(ctx));
    }
    y -= 5;
    y = drawSectionHeader(page, 'Notes', y, bold);
    y = drawText(page, data.notes, MARGINS.left, y, { font: regular, size: 9, color: colors.gray });
  }

  // ── Signatures ──
  y -= 20;
  if (data.technician) {
    y = drawKeyValue(page, 'Lab Technician', data.technician, MARGINS.left, y, bold, regular, 9);
  }
  if (data.verifiedBy) {
    y = drawKeyValue(page, 'Verified By', data.verifiedBy, MARGINS.left, y, bold, regular, 9);
  }

  return renderToBuffer(ctx);
}
