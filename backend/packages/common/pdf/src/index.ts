// ── Core ──
export {
  createDocument,
  addPage,
  renderToBuffer,
  needsNewPage,
  type PdfContext,
  type DocumentMeta,
  type HeaderConfig,
  type FooterConfig,
} from './renderer.js';

export { embedFonts, type HmsFonts } from './fonts.js';
export { colors } from './colors.js';
export {
  A4,
  MARGINS,
  CONTENT_WIDTH,
  drawText,
  drawTextRight,
  drawKeyValue,
  drawDivider,
  drawTable,
  drawSectionHeader,
  type TextOptions,
  type TableColumn,
  type TableOptions,
} from './layout.js';

// ── Templates ──
export { generateInvoice, type InvoiceData, type InvoiceItem } from './templates/invoice.js';
export { generateLabReport, type LabReportData, type LabResultValue } from './templates/lab-report.js';
export { generatePrescription, type PrescriptionData, type PrescriptionMedicine } from './templates/prescription.js';
export { generatePatientSheet, type PatientSheetData } from './templates/patient-sheet.js';
export { generatePatientRecords, type PatientRecordsData } from './templates/patient-records.js';
