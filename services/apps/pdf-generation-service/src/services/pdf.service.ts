import PDFDocument from 'pdfkit';

export interface PharmacyBillInput {
  billNumber: string;
  date: string;
  patientName: string;
  patientPhone?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  discount?: number;
  grandTotal: number;
  paymentMethod?: string;
  pharmacyName?: string;
  pharmacyAddress?: string;
}

export interface AppointmentBillInput {
  billNumber: string;
  date: string;
  patientName: string;
  patientPhone?: string;
  doctorName: string;
  specialization: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  consultationFee: number;
  additionalCharges?: { description: string; amount: number }[];
  grandTotal: number;
  paymentMethod?: string;
  hospitalName?: string;
  hospitalAddress?: string;
}

export interface PrescriptionInput {
  prescriptionId: string;
  date: string;
  patientName: string;
  patientAge?: string;
  patientGender?: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorLicense?: string;
  diagnosis?: string;
  medicines: {
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    quantity?: number;
    notes?: string;
  }[];
  doctorNotes?: string;
  followUpDate?: string;
  hospitalName?: string;
  hospitalAddress?: string;
}

function drawHeader(doc: PDFKit.PDFDocument, title: string, orgName: string, orgAddress?: string) {
  doc.fontSize(20).font('Helvetica-Bold').text(orgName, { align: 'center' });
  if (orgAddress) {
    doc.fontSize(9).font('Helvetica').text(orgAddress, { align: 'center' });
  }
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const y = doc.page.height - 60;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  doc.fontSize(8).font('Helvetica').text('This is a computer-generated document. No signature required.', 50, y + 10, { align: 'center' });
  doc.text('Atelier Health - Hospital Management System', { align: 'center' });
}

export function generatePharmacyBill(input: PharmacyBillInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'PHARMACY BILL', input.pharmacyName || 'Atelier Health Pharmacy', input.pharmacyAddress);

    // Bill info
    doc.fontSize(10).font('Helvetica');
    doc.text(`Bill No: ${input.billNumber}`, 50, doc.y);
    doc.text(`Date: ${input.date}`, 50, doc.y, { align: 'right' });
    doc.moveDown(0.3);
    doc.text(`Patient: ${input.patientName}`);
    if (input.patientPhone) doc.text(`Phone: ${input.patientPhone}`);
    doc.moveDown(0.8);

    // Table header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('#', 50, tableTop, { width: 25 });
    doc.text('Item', 75, tableTop, { width: 200 });
    doc.text('Qty', 280, tableTop, { width: 50, align: 'center' });
    doc.text('Unit Price', 335, tableTop, { width: 80, align: 'right' });
    doc.text('Total', 430, tableTop, { width: 80, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    // Items
    doc.font('Helvetica').fontSize(9);
    input.items.forEach((item, i) => {
      const y = doc.y;
      doc.text(`${i + 1}`, 50, y, { width: 25 });
      doc.text(item.name, 75, y, { width: 200 });
      doc.text(`${item.quantity}`, 280, y, { width: 50, align: 'center' });
      doc.text(`₹${item.unitPrice.toFixed(2)}`, 335, y, { width: 80, align: 'right' });
      doc.text(`₹${item.total.toFixed(2)}`, 430, y, { width: 80, align: 'right' });
      doc.moveDown(0.5);
    });

    // Totals
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Subtotal:`, 350, doc.y, { width: 80, align: 'right', continued: true }).text(`  ₹${input.subtotal.toFixed(2)}`, { align: 'right' });
    doc.text(`Tax:`, 350, doc.y, { width: 80, align: 'right', continued: true }).text(`  ₹${input.tax.toFixed(2)}`, { align: 'right' });
    if (input.discount) {
      doc.text(`Discount:`, 350, doc.y, { width: 80, align: 'right', continued: true }).text(`  -₹${input.discount.toFixed(2)}`, { align: 'right' });
    }
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Grand Total:`, 350, doc.y, { width: 80, align: 'right', continued: true }).text(`  ₹${input.grandTotal.toFixed(2)}`, { align: 'right' });

    if (input.paymentMethod) {
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9).text(`Payment Method: ${input.paymentMethod}`);
    }

    drawFooter(doc);
    doc.end();
  });
}

export function generateAppointmentBill(input: AppointmentBillInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'APPOINTMENT BILL', input.hospitalName || 'Atelier Health Hospital', input.hospitalAddress);

    // Bill info
    doc.fontSize(10).font('Helvetica');
    doc.text(`Bill No: ${input.billNumber}`, 50, doc.y);
    doc.text(`Date: ${input.date}`, 50, doc.y, { align: 'right' });
    doc.moveDown(0.8);

    // Patient & Doctor info side by side
    doc.font('Helvetica-Bold').text('Patient Details');
    doc.font('Helvetica').fontSize(9);
    doc.text(`Name: ${input.patientName}`);
    if (input.patientPhone) doc.text(`Phone: ${input.patientPhone}`);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(10).text('Doctor Details');
    doc.font('Helvetica').fontSize(9);
    doc.text(`Doctor: ${input.doctorName}`);
    doc.text(`Specialization: ${input.specialization}`);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(10).text('Appointment Details');
    doc.font('Helvetica').fontSize(9);
    doc.text(`Date: ${input.appointmentDate}`);
    doc.text(`Time: ${input.appointmentTime}`);
    doc.text(`Type: ${input.appointmentType}`);
    doc.moveDown(0.8);

    // Charges table
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Description', 50, doc.y, { width: 350 });
    doc.text('Amount', 430, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(9);
    doc.text('Consultation Fee', 50, doc.y, { width: 350 });
    doc.text(`₹${input.consultationFee.toFixed(2)}`, 430, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
    doc.moveDown(0.5);

    if (input.additionalCharges) {
      input.additionalCharges.forEach((charge) => {
        doc.text(charge.description, 50, doc.y, { width: 350 });
        doc.text(`₹${charge.amount.toFixed(2)}`, 430, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
        doc.moveDown(0.5);
      });
    }

    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Total: ₹${input.grandTotal.toFixed(2)}`, { align: 'right' });

    if (input.paymentMethod) {
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9).text(`Payment Method: ${input.paymentMethod}`);
    }

    drawFooter(doc);
    doc.end();
  });
}

export function generatePrescriptionPdf(input: PrescriptionInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'PRESCRIPTION', input.hospitalName || 'Atelier Health Hospital', input.hospitalAddress);

    // Prescription meta
    doc.fontSize(9).font('Helvetica');
    doc.text(`Prescription ID: ${input.prescriptionId}`, 50, doc.y);
    doc.text(`Date: ${input.date}`, 50, doc.y, { align: 'right' });
    doc.moveDown(0.8);

    // Doctor info
    doc.font('Helvetica-Bold').fontSize(10).text(`Dr. ${input.doctorName}`);
    doc.font('Helvetica').fontSize(9);
    doc.text(`${input.doctorSpecialization}`);
    if (input.doctorLicense) doc.text(`License: ${input.doctorLicense}`);
    doc.moveDown(0.5);

    // Patient info
    doc.font('Helvetica-Bold').fontSize(10).text('Patient:');
    doc.font('Helvetica').fontSize(9);
    let patientLine = input.patientName;
    if (input.patientAge) patientLine += ` | Age: ${input.patientAge}`;
    if (input.patientGender) patientLine += ` | ${input.patientGender}`;
    doc.text(patientLine);
    doc.moveDown(0.5);

    // Diagnosis
    if (input.diagnosis) {
      doc.font('Helvetica-Bold').fontSize(10).text('Diagnosis:');
      doc.font('Helvetica').fontSize(9).text(input.diagnosis);
      doc.moveDown(0.5);
    }

    // Rx symbol
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(16).text('℞', 50, doc.y);
    doc.moveDown(0.5);

    // Medicines table
    doc.font('Helvetica-Bold').fontSize(9);
    const tableTop = doc.y;
    doc.text('#', 50, tableTop, { width: 20 });
    doc.text('Medicine', 75, tableTop, { width: 150 });
    doc.text('Dose', 230, tableTop, { width: 70 });
    doc.text('Frequency', 305, tableTop, { width: 80 });
    doc.text('Duration', 390, tableTop, { width: 70 });
    doc.text('Qty', 465, tableTop, { width: 40, align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(9);
    input.medicines.forEach((med, i) => {
      const y = doc.y;
      doc.text(`${i + 1}`, 50, y, { width: 20 });
      doc.text(med.name, 75, y, { width: 150 });
      doc.text(med.dose, 230, y, { width: 70 });
      doc.text(med.frequency, 305, y, { width: 80 });
      doc.text(med.duration, 390, y, { width: 70 });
      doc.text(`${med.quantity || '-'}`, 465, y, { width: 40, align: 'center' });
      doc.moveDown(0.3);
      if (med.notes) {
        doc.fontSize(8).fillColor('#555555').text(`  Note: ${med.notes}`, 75);
        doc.fillColor('#000000').fontSize(9);
      }
      doc.moveDown(0.3);
    });

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Doctor notes
    if (input.doctorNotes) {
      doc.font('Helvetica-Bold').fontSize(10).text('Notes:');
      doc.font('Helvetica').fontSize(9).text(input.doctorNotes);
      doc.moveDown(0.5);
    }

    // Follow-up
    if (input.followUpDate) {
      doc.font('Helvetica-Bold').fontSize(9).text(`Follow-up Date: ${input.followUpDate}`);
    }

    // Doctor signature area
    doc.moveDown(2);
    doc.font('Helvetica').fontSize(9);
    doc.text('_________________________', 380, doc.y, { align: 'right' });
    doc.text(`Dr. ${input.doctorName}`, 380, doc.y, { align: 'right' });

    drawFooter(doc);
    doc.end();
  });
}
