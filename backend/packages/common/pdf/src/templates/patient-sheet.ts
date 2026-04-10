import {
  addPage,
  createDocument,
  needsNewPage,
  renderToBuffer,
  type HeaderConfig,
} from '../renderer.js';

import {
  drawDivider,
  drawSectionHeader,
  drawTable,
  drawText,
  drawTextRight,
  MARGINS,
  type TableColumn
} from '../layout.js';

import { colors } from '../colors.js';


export interface PatientSheetAllergy {
  allergen: string;
  severity: string;
}

export interface PatientSheetMedication {
  name: string;
  dosage: string;
  frequency: string;
  since: string;
}

export interface PatientSheetVisit {
  date: string;
  doctor: string;
  diagnosis: string;
}

export interface PatientSheetLabResult {
  testName: string;
  date: string;
  keyFinding: string;
  status: string;
}

export interface PatientSheetData {
  patient: {
    name: string;
    id: string;
    age: number;
    gender: string;
    bloodGroup?: string;
  };
  allergies: PatientSheetAllergy[];
  chronicConditions: string[];
  currentMedications: PatientSheetMedication[];
  recentVisits: PatientSheetVisit[];
  recentLabResults: PatientSheetLabResult[];
  queueToken?: string;
  doctor: { name: string; specialization: string };
  hospital: HeaderConfig;
}


export async function generatePatientSheet(data: PatientSheetData): Promise<Uint8Array> {
  const ctx = await createDocument({
    title: `Patient Sheet - ${data.patient.name}`,
    subject: 'Doctor Quick Summary',
  });

  ctx.header = data.hospital;

  ctx.footer = {
    text: 'Quick-reference summary — refer to full records for complete history.',
    showPageNumbers: true,
    showGeneratedAt: true,
  };

  let { page, y: startY } = addPage(ctx);
  const { bold, regular } = ctx.fonts;

  let y = startY - 40;


  page.drawText('PATIENT SUMMARY SHEET', {
    x: MARGINS.left,
    y,
    size: 16,
    font: bold,
    color: colors.primary,
  });

  if (data.queueToken) {
    drawTextRight(page, `Token: ${data.queueToken}`, y, {
      font: bold,
      size: 12,
      color: colors.primary,
    });
  }

  y -= 18;
  y = drawDivider(page, y, colors.primary, 1);
  y -= 20;


  if (data.allergies.length > 0) {
    y = drawSectionHeader(page, '⚠ Allergies', y, bold);

    for (const allergy of data.allergies) {
      y = drawText(page, `• ${allergy.allergen} — ${allergy.severity}`, MARGINS.left, y, {
        font: bold,
        size: 11,
        color: colors.danger,
      });
    }

    y -= 10;
  }


  if (data.chronicConditions.length > 0) {
    y = drawDivider(page, y, colors.tableBorder, 0.5);
    y -= 12;

    y = drawSectionHeader(page, 'Chronic Conditions', y, bold);

    for (const condition of data.chronicConditions) {
      y = drawText(page, `• ${condition}`, MARGINS.left, y, {
        font: regular,
        size: 10,
        color: colors.darkGray,
      });
    }

    y -= 10;
  }


  y = drawDivider(page, y, colors.tableBorder, 0.5);
  y -= 12;

  const colGap = 40;
  const colWidth = (page.getWidth() - MARGINS.left - MARGINS.right - colGap) / 2;

  const leftX = MARGINS.left;
  const rightX = leftX + colWidth + colGap;

  let rowY = y;

  page.drawText('Patient Info', {
    x: leftX,
    y: rowY,
    size: 12,
    font: bold,
    color: colors.primary,
  });

  rowY -= 14;

  const leftData = [
    ['Name', data.patient.name],
    ['ID', data.patient.id],
    ['Age / Gender', `${data.patient.age} yrs / ${data.patient.gender}`],
  ];

  const rightData = [
    ...(data.patient.bloodGroup ? [['Blood Group', data.patient.bloodGroup]] : []),
    ['Consulting', `Dr. ${data.doctor.name}`],
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

  y = rowY - 15;


  if (data.currentMedications.length > 0) {
    y = drawDivider(page, y, colors.tableBorder, 0.5);
    y -= 12;

    if (needsNewPage(y)) ({ page, y } = addPage(ctx));

    y = drawSectionHeader(page, 'Current Medications', y, bold);

    const columns: TableColumn[] = [
      { header: 'Medicine', width: 160 },
      { header: 'Dosage', width: 100 },
      { header: 'Frequency', width: 110 },
      { header: 'Since', width: 125 },
    ];

    const rows = data.currentMedications.map((m) => [m.name, m.dosage, m.frequency, m.since]);

    y -= 10;

    y = drawTable(page, MARGINS.left, y, {
      columns,
      rows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });
  }


  if (data.recentVisits.length > 0) {
    y = drawDivider(page, y, colors.tableBorder, 0.5);
    y -= 12;

    if (needsNewPage(y)) ({ page, y } = addPage(ctx));

    y = drawSectionHeader(page, 'Recent Visits', y, bold);

    const columns: TableColumn[] = [
      { header: 'Date', width: 90 },
      { header: 'Doctor', width: 130 },
      { header: 'Diagnosis', width: 275 },
    ];

    const rows = data.recentVisits.map((v) => [v.date, v.doctor, v.diagnosis]);

    y -= 10;

    y = drawTable(page, MARGINS.left, y, {
      columns,
      rows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });
  }


  if (data.recentLabResults.length > 0) {
    y = drawDivider(page, y, colors.tableBorder, 0.5);
    y -= 12;

    if (needsNewPage(y)) ({ page, y } = addPage(ctx));

    y = drawSectionHeader(page, 'Recent Lab Results', y, bold);

    const columns: TableColumn[] = [
      { header: 'Test', width: 150 },
      { header: 'Date', width: 90 },
      { header: 'Key Finding', width: 180 },
      { header: 'Status', width: 75, align: 'right' },
    ];

    const rows = data.recentLabResults.map((l) => [l.testName, l.date, l.keyFinding, l.status]);

    y -= 10;

    y = drawTable(page, MARGINS.left, y, {
      columns,
      rows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });
  }

  return renderToBuffer(ctx);
}
