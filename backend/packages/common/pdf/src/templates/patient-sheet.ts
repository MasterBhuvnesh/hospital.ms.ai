import {
  createDocument,
  addPage,
  renderToBuffer,
  needsNewPage,
  type HeaderConfig,
} from '../renderer.js';
import {
  MARGINS,
  CONTENT_WIDTH,
  drawText,
  drawKeyValue,
  drawSectionHeader,
  drawTable,
  type TableColumn,
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
  notes?: string;
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
    phone?: string;
    emergencyContact?: string;
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
    subject: 'Patient Summary for Doctor Review',
  });

  ctx.header = data.hospital;
  ctx.footer = {
    text: 'Quick-reference summary — refer to full records for complete history.',
    showPageNumbers: true,
    showGeneratedAt: true,
  };

  let { page, y } = addPage(ctx);
  const { bold, regular } = ctx.fonts;

  // ── Title ──
  page.drawText('PATIENT SUMMARY SHEET', {
    x: MARGINS.left,
    y,
    size: 16,
    font: bold,
    color: colors.primary,
  });

  if (data.queueToken) {
    // Token badge (right side)
    const tokenText = `Token: ${data.queueToken}`;
    const tokenWidth = bold.widthOfTextAtSize(tokenText, 14);
    const badgeX = MARGINS.left + CONTENT_WIDTH - tokenWidth - 16;
    page.drawRectangle({
      x: badgeX,
      y: y - 6,
      width: tokenWidth + 16,
      height: 24,
      color: colors.primary,
    });
    page.drawText(tokenText, {
      x: badgeX + 8,
      y: y - 1,
      size: 14,
      font: bold,
      color: colors.white,
    });
  }

  y -= 28;

  // ── Patient Demographics ──
  y = drawSectionHeader(page, 'Patient', y, bold);
  y = drawKeyValue(page, 'Name', data.patient.name, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'ID', data.patient.id, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Age / Gender', `${data.patient.age} yrs / ${data.patient.gender}`, MARGINS.left, y, bold, regular);
  if (data.patient.bloodGroup) {
    y = drawKeyValue(page, 'Blood Group', data.patient.bloodGroup, MARGINS.left, y, bold, regular);
  }
  y = drawKeyValue(page, 'Consulting', `Dr. ${data.doctor.name} (${data.doctor.specialization})`, MARGINS.left, y, bold, regular);

  y -= 6;

  // ── Allergies (highlighted) ──
  if (data.allergies.length > 0) {
    y = drawSectionHeader(page, 'Allergies', y, bold);
    page.drawRectangle({
      x: MARGINS.left,
      y: y - (data.allergies.length * 14) - 4,
      width: CONTENT_WIDTH,
      height: data.allergies.length * 14 + 4,
      color: colors.danger,
      opacity: 0.08,
    });
    for (const allergy of data.allergies) {
      y = drawText(page, `• ${allergy.allergen} — ${allergy.severity}`, MARGINS.left + 4, y, {
        font: bold,
        size: 9,
        color: colors.danger,
      });
    }
    y -= 6;
  }

  // ── Chronic Conditions ──
  if (data.chronicConditions.length > 0) {
    y = drawSectionHeader(page, 'Chronic Conditions', y, bold);
    for (const condition of data.chronicConditions) {
      y = drawText(page, `• ${condition}`, MARGINS.left + 4, y, {
        font: regular,
        size: 9,
        color: colors.darkGray,
      });
    }
    y -= 6;
  }

  // ── Current Medications ──
  if (data.currentMedications.length > 0) {
    if (needsNewPage(y)) {
      ({ page, y } = addPage(ctx));
    }
    y = drawSectionHeader(page, 'Current Medications', y, bold);
    const medColumns: TableColumn[] = [
      { header: 'Medicine', width: 160 },
      { header: 'Dosage', width: 100 },
      { header: 'Frequency', width: 110 },
      { header: 'Since', width: 125.28 },
    ];
    const medRows = data.currentMedications.map((m) => [m.name, m.dosage, m.frequency, m.since]);
    y = drawTable(page, MARGINS.left, y, {
      columns: medColumns,
      rows: medRows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });
  }

  // ── Recent Visits ──
  if (data.recentVisits.length > 0) {
    if (needsNewPage(y)) {
      ({ page, y } = addPage(ctx));
    }
    y = drawSectionHeader(page, 'Recent Visits', y, bold);
    const visitColumns: TableColumn[] = [
      { header: 'Date', width: 90 },
      { header: 'Doctor', width: 130 },
      { header: 'Diagnosis', width: 275.28 },
    ];
    const visitRows = data.recentVisits.map((v) => [v.date, v.doctor, v.diagnosis]);
    y = drawTable(page, MARGINS.left, y, {
      columns: visitColumns,
      rows: visitRows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });
  }

  // ── Recent Lab Results ──
  if (data.recentLabResults.length > 0) {
    if (needsNewPage(y)) {
      ({ page, y } = addPage(ctx));
    }
    y = drawSectionHeader(page, 'Recent Lab Results', y, bold);
    const labColumns: TableColumn[] = [
      { header: 'Test', width: 150 },
      { header: 'Date', width: 90 },
      { header: 'Key Finding', width: 180 },
      { header: 'Status', width: 75.28, align: 'right' },
    ];
    const labRows = data.recentLabResults.map((l) => [l.testName, l.date, l.keyFinding, l.status]);
    y = drawTable(page, MARGINS.left, y, {
      columns: labColumns,
      rows: labRows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });
  }

  return renderToBuffer(ctx);
}
