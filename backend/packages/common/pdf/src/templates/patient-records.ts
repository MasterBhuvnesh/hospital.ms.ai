import {
  createDocument,
  addPage,
  renderToBuffer,
  needsNewPage,
  type HeaderConfig,
} from '../renderer.js';
import {
  MARGINS,
  drawText,
  drawKeyValue,
  drawSectionHeader,
  drawTable,
  type TableColumn,
} from '../layout.js';
import { colors } from '../colors.js';

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

  let { page, y } = addPage(ctx);
  const { bold, regular } = ctx.fonts;

  // ── Title ──
  page.drawText('PATIENT MEDICAL RECORDS', {
    x: MARGINS.left,
    y,
    size: 18,
    font: bold,
    color: colors.primary,
  });
  y -= 28;

  // ── Demographics ──
  y = drawSectionHeader(page, 'Personal Information', y, bold);
  y = drawKeyValue(page, 'Name', data.patient.name, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Patient ID', data.patient.id, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Date of Birth', data.patient.dateOfBirth, MARGINS.left, y, bold, regular);
  y = drawKeyValue(page, 'Age / Gender', `${data.patient.age} yrs / ${data.patient.gender}`, MARGINS.left, y, bold, regular);
  if (data.patient.bloodGroup) {
    y = drawKeyValue(page, 'Blood Group', data.patient.bloodGroup, MARGINS.left, y, bold, regular);
  }
  if (data.patient.phone) {
    y = drawKeyValue(page, 'Phone', data.patient.phone, MARGINS.left, y, bold, regular);
  }
  if (data.patient.address) {
    y = drawKeyValue(page, 'Address', data.patient.address, MARGINS.left, y, bold, regular);
  }
  if (data.patient.emergencyContact) {
    y = drawKeyValue(page, 'Emergency Contact', `${data.patient.emergencyContact} (${data.patient.emergencyPhone ?? 'N/A'})`, MARGINS.left, y, bold, regular);
  }

  y -= 8;

  // ── Allergies ──
  if (data.allergies.length > 0) {
    y = drawSectionHeader(page, 'Allergies & Adverse Reactions', y, bold);
    const allergyColumns: TableColumn[] = [
      { header: 'Allergen', width: 180 },
      { header: 'Severity', width: 100 },
      { header: 'Reaction', width: 215.28 },
    ];
    const allergyRows = data.allergies.map((a) => [a.allergen, a.severity, a.reaction ?? '-']);
    y = drawTable(page, MARGINS.left, y, {
      columns: allergyColumns,
      rows: allergyRows,
      boldFont: bold,
      regularFont: regular,
    });
  }

  // ── Medical History ──
  if (data.medicalHistory.length > 0) {
    if (needsNewPage(y)) {
      ({ page, y } = addPage(ctx));
    }
    y = drawSectionHeader(page, 'Medical History', y, bold);
    const histColumns: TableColumn[] = [
      { header: 'Condition', width: 170 },
      { header: 'Diagnosed', width: 90 },
      { header: 'Status', width: 80 },
      { header: 'Notes', width: 155.28 },
    ];
    const histRows = data.medicalHistory.map((h) => [h.condition, h.diagnosedAt, h.status, h.notes ?? '-']);
    y = drawTable(page, MARGINS.left, y, {
      columns: histColumns,
      rows: histRows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });
  }

  // ── Immunizations ──
  if (data.immunizations.length > 0) {
    if (needsNewPage(y)) {
      ({ page, y } = addPage(ctx));
    }
    y = drawSectionHeader(page, 'Immunization Records', y, bold);
    const immColumns: TableColumn[] = [
      { header: 'Vaccine', width: 180 },
      { header: 'Dose', width: 60, align: 'right' },
      { header: 'Date', width: 120 },
      { header: 'Provider', width: 135.28 },
    ];
    const immRows = data.immunizations.map((i) => [i.vaccine, String(i.dose), i.date, i.provider ?? '-']);
    y = drawTable(page, MARGINS.left, y, {
      columns: immColumns,
      rows: immRows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });
  }

  // ── Documents List ──
  if (data.documents.length > 0) {
    if (needsNewPage(y)) {
      ({ page, y } = addPage(ctx));
    }
    y = drawSectionHeader(page, 'Uploaded Documents', y, bold);
    const docColumns: TableColumn[] = [
      { header: '#', width: 30 },
      { header: 'Document', width: 220 },
      { header: 'Category', width: 120 },
      { header: 'Uploaded', width: 125.28 },
    ];
    const docRows = data.documents.map((d, i) => [String(i + 1), d.name, d.category, d.uploadedAt]);
    y = drawTable(page, MARGINS.left, y, {
      columns: docColumns,
      rows: docRows,
      boldFont: bold,
      regularFont: regular,
      fontSize: 8,
    });
  }

  return renderToBuffer(ctx);
}
