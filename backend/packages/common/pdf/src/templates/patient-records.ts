import { colors } from '../colors.js';
import {
  MARGINS,
  drawDivider,
  drawSectionHeader,
  drawTable,
  drawText,
  type TableColumn,
} from '../layout.js';
import {
  addPage,
  createDocument,
  needsNewPage,
  renderToBuffer,
  type HeaderConfig,
} from '../renderer.js';

export interface MedicalHistoryEntry {
  condition: string;
  diagnosedAt: string;
  status: string;
  notes?: string;
}

export interface ImmunizationEntry {
  vaccine: string;
  dose: number;
  date: string;
  provider?: string;
}

export interface DocumentEntry {
  name: string;
  category: string;
  uploadedAt: string;
}

export interface PatientRecordsData {
  patient: {
    name: string;
    id: string;
    age: number;
    gender: string;
    bloodGroup?: string;
    dateOfBirth: string;
    phone?: string;
    address?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  };
  allergies: { allergen: string; severity: string; reaction?: string }[];
  medicalHistory: MedicalHistoryEntry[];
  immunizations: ImmunizationEntry[];
  documents: DocumentEntry[];
  hospital: HeaderConfig;
}

export async function generatePatientRecords(data: PatientRecordsData): Promise<Uint8Array> {
  const ctx = await createDocument({
    title: `Medical Records - ${data.patient.name}`,
    subject: 'Complete Patient Medical Records',
  });

  ctx.header = data.hospital;

  ctx.footer = {
    text: 'Confidential medical record — authorized access only.',
    showPageNumbers: true,
    showGeneratedAt: true,
  };

  let { page, y: startY } = addPage(ctx);
  const { bold, regular } = ctx.fonts;

  // ✅ FIX: prevent header overlap
  let y = startY - 40;

  // ─────────────────────────────
  // 🧾 TITLE
  // ─────────────────────────────

  page.drawText('PATIENT MEDICAL RECORDS', {
    x: MARGINS.left,
    y,
    size: 18,
    font: bold,
    color: colors.primary,
  });

  y -= 18;
  y = drawDivider(page, y, colors.primary, 1);
  y -= 20;

  // ─────────────────────────────
  // 📊 PERSONAL INFO (2 COLUMN)
  // ─────────────────────────────

  const colGap = 40;
  const colWidth = (page.getWidth() - MARGINS.left - MARGINS.right - colGap) / 2;

  const leftX = MARGINS.left;
  const rightX = leftX + colWidth + colGap;

  let rowY = y;

  page.drawText('Personal Information', {
    x: leftX,
    y: rowY,
    size: 12,
    font: bold,
    color: colors.primary,
  });

  rowY -= 15;

  const leftData = [
    ['Name', data.patient.name],
    ['Patient ID', data.patient.id],
    ['Date of Birth', data.patient.dateOfBirth],
    ['Age / Gender', `${data.patient.age} yrs / ${data.patient.gender}`],
  ];

  const rightData = [
    ...(data.patient.bloodGroup ? [['Blood Group', data.patient.bloodGroup]] : []),
    ...(data.patient.phone ? [['Phone', data.patient.phone]] : []),
    ...(data.patient.address ? [['Address', data.patient.address]] : []),
    ...(data.patient.emergencyContact
      ? [
          [
            'Emergency Contact',
            `${data.patient.emergencyContact} (${data.patient.emergencyPhone ?? 'N/A'})`,
          ],
        ]
      : []),
  ];

  const maxRows = Math.max(leftData.length, rightData.length);

  for (let i = 0; i < maxRows; i++) {
    if (leftData[i]) {
      drawText(page, `${leftData[i][0]}: ${leftData[i][1]}`, leftX, rowY, {
        font: regular,
        size: 10,
        maxWidth: colWidth,
      });
    }

    if (rightData[i]) {
      drawText(page, `${rightData[i][0]}: ${rightData[i][1]}`, rightX, rowY, {
        font: regular,
        size: 10,
        maxWidth: colWidth,
      });
    }

    rowY -= 14;
  }

  y = rowY - 20;

  // ─────────────────────────────
  //  ALLERGIES
  // ─────────────────────────────

  if (data.allergies.length > 0) {
    if (needsNewPage(y)) ({ page, y } = addPage(ctx));

    y = drawSectionHeader(page, 'Allergies & Adverse Reactions', y, bold);

    const columns: TableColumn[] = [
      { header: 'Allergen', width: 180 },
      { header: 'Severity', width: 100 },
      { header: 'Reaction', width: 215 },
    ];

    const rows = data.allergies.map((a) => [a.allergen, a.severity, a.reaction ?? '-']);

    y -= 10;

    y = drawTable(page, MARGINS.left, y, {
      columns,
      rows,
      boldFont: bold,
      regularFont: regular,
    });

    y -= 20;
  }

  // ─────────────────────────────
  // 🧠 MEDICAL HISTORY
  // ─────────────────────────────

  if (data.medicalHistory.length > 0) {
    if (needsNewPage(y)) ({ page, y } = addPage(ctx));

    // 🔥 extra safety spacing
    y -= 5;

    // Divider to separate sections
    y = drawDivider(page, y, colors.tableBorder, 0.5);

    // Space after divider
    y -= 15;

    // Section header
    y = drawSectionHeader(page, 'Medical History', y, bold);

    const columns: TableColumn[] = [
      { header: 'Condition', width: 170 },
      { header: 'Diagnosed', width: 90 },
      { header: 'Status', width: 80 },
      { header: 'Notes', width: 155 },
    ];

    const rows = data.medicalHistory.map((h) => [
      h.condition,
      h.diagnosedAt,
      h.status,
      h.notes ?? '-',
    ]);

    y -= 10;

    y = drawTable(page, MARGINS.left, y, {
      columns,
      rows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });

    y -= 20;
  }

  // ─────────────────────────────
  // 💉 IMMUNIZATIONS
  // ─────────────────────────────

  if (data.immunizations.length > 0) {
    if (needsNewPage(y)) ({ page, y } = addPage(ctx));

    y = drawSectionHeader(page, 'Immunization Records', y, bold);

    const columns: TableColumn[] = [
      { header: 'Vaccine', width: 180 },
      { header: 'Dose', width: 60, align: 'right' },
      { header: 'Date', width: 120 },
      { header: 'Provider', width: 135 },
    ];

    const rows = data.immunizations.map((i) => [
      i.vaccine,
      String(i.dose),
      i.date,
      i.provider ?? '-',
    ]);

    y -= 10;

    y = drawTable(page, MARGINS.left, y, {
      columns,
      rows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });

    y -= 20;
  }

  // ─────────────────────────────
  // 📄 DOCUMENTS
  // ─────────────────────────────

  if (data.documents.length > 0) {
    if (needsNewPage(y)) ({ page, y } = addPage(ctx));

    y = drawSectionHeader(page, 'Uploaded Documents', y, bold);

    const columns: TableColumn[] = [
      { header: '#', width: 30 },
      { header: 'Document', width: 220 },
      { header: 'Category', width: 120 },
      { header: 'Uploaded', width: 125 },
    ];

    const rows = data.documents.map((d, i) => [String(i + 1), d.name, d.category, d.uploadedAt]);

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
