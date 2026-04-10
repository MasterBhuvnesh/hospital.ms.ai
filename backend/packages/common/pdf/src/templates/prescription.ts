import {
  createDocument,
  addPage,
  renderToBuffer,
  type HeaderConfig,
} from '../renderer.js';
import {
  MARGINS,
  CONTENT_WIDTH,
  drawText,
  drawKeyValue,
  drawSectionHeader,
  drawTable,
  drawDivider,
  type TableColumn,
} from '../layout.js';
import { colors } from '../colors.js';

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
}

export interface PrescriptionData {
  prescriptionId: string;
  date: string;
  patient: {
    name: string;
    id: string;
    age: number;
    gender: string;
  };
  doctor: {
    name: string;
    specialization: string;
    qualification: string;
    regNumber?: string;
  };
  diagnosis: string;
  medicines: PrescriptionMedicine[];
  allergies?: string[];
  notes?: string;
  hospital: HeaderConfig;
}

export async function generatePrescription(data: PrescriptionData): Promise<Uint8Array> {
  const ctx = await createDocument({
    title: `Prescription - ${data.patient.name}`,
    subject: 'Medical Prescription',
  });

  ctx.header = data.hospital;
  ctx.footer = {
    text: 'Valid for 30 days from date of issue unless otherwise specified.',
    showPageNumbers: true,
    showGeneratedAt: true,
  };

  const { page, y: startY } = addPage(ctx);
  const { bold, regular } = ctx.fonts;
  let y = startY;

  // ── Rx Header ──
  page.drawText('℞', {
    x: MARGINS.left,
    y,
    size: 28,
    font: bold,
    color: colors.primary,
  });
  page.drawText('PRESCRIPTION', {
    x: MARGINS.left + 35,
    y: y + 2,
    size: 18,
    font: bold,
    color: colors.primary,
  });
  y -= 30;

  // ── Doctor Info (left) ──
  y = drawSectionHeader(page, 'Prescribing Doctor', y, bold);
  y = drawKeyValue(page, 'Doctor', `Dr. ${data.doctor.name}`, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Specialization', data.doctor.specialization, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Qualification', data.doctor.qualification, MARGINS.left, y, bold, regular);
  if (data.doctor.regNumber) {
    y = drawKeyValue(page, 'Reg. No', data.doctor.regNumber, MARGINS.left, y, bold, regular);
  }
  y -= 6;

  // ── Patient Info ──
  y = drawSectionHeader(page, 'Patient Information', y, bold);
  y = drawKeyValue(page, 'Name', data.patient.name, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Patient ID', data.patient.id, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Age / Gender', `${data.patient.age} yrs / ${data.patient.gender}`, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Date', data.date, MARGINS.left, y, bold, regular);

  // Allergy warning
  if (data.allergies && data.allergies.length > 0) {
    y -= 6;
    page.drawRectangle({
      x: MARGINS.left,
      y: y - 16,
      width: CONTENT_WIDTH,
      height: 20,
      color: colors.warning,
      opacity: 0.15,
    });
    drawText(page, `⚠ ALLERGIES: ${data.allergies.join(', ')}`, MARGINS.left + 4, y - 12, {
      font: bold,
      size: 9,
      color: colors.danger,
    });
    y -= 28;
  }

  y -= 6;

  // ── Diagnosis ──
  y = drawSectionHeader(page, 'Diagnosis', y, bold);
  y = drawText(page, data.diagnosis, MARGINS.left, y, { font: regular, size: 10, color: colors.darkGray });
  y -= 10;

  // ── Medicines Table ──
  y = drawSectionHeader(page, 'Medicines', y, bold);

  const columns: TableColumn[] = [
    { header: '#', width: 25 },
    { header: 'Medicine', width: 150 },
    { header: 'Dosage', width: 80 },
    { header: 'Frequency', width: 80 },
    { header: 'Duration', width: 70 },
    { header: 'Qty', width: 40, align: 'right' },
    { header: 'Instructions', width: 50.28 },
  ];

  const rows = data.medicines.map((m, i) => [
    String(i + 1),
    m.name,
    m.dosage,
    m.frequency,
    m.duration,
    String(m.quantity),
    m.instructions ?? '-',
  ]);

  y = drawTable(page, MARGINS.left, y, {
    columns,
    rows,
    boldFont: bold,
    regularFont: regular,
    fontSize: 8,
  });

  // ── Notes ──
  if (data.notes) {
    y -= 5;
    y = drawSectionHeader(page, 'Additional Notes', y, bold);
    y = drawText(page, data.notes, MARGINS.left, y, { font: regular, size: 9, color: colors.gray });
  }

  // ── Signature line ──
  y -= 40;
  drawDivider(page, y, colors.darkGray, 0.5);
  y -= 4;
  drawText(page, `Dr. ${data.doctor.name}`, MARGINS.left, y, { font: bold, size: 10, color: colors.darkGray });
  y -= 14;
  drawText(page, 'Signature / Digital Verification', MARGINS.left, y, { font: regular, size: 8, color: colors.lightGray });

  return renderToBuffer(ctx);
}
