/**
 * Quick smoke test — generates one of each PDF template into test-output/
 * Run: cd packages/common/pdf && npx tsx test-pdf.ts
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateInvoice } from './src/templates/invoice.js';
import { generateLabReport } from './src/templates/lab-report.js';
import { generatePrescription } from './src/templates/prescription.js';
import { generatePatientSheet } from './src/templates/patient-sheet.js';
import { generatePatientRecords } from './src/templates/patient-records.js';
import type { HeaderConfig } from './src/renderer.js';

const OUT_DIR = resolve(import.meta.dirname, 'test-output');

const hospital: HeaderConfig = {
  hospitalName: 'Atelier Health Hospital',
  hospitalAddress: '123 Medical Lane, Mumbai, MH 400001',
  hospitalPhone: '+91 22 1234 5678',
  logoText: 'AH',
};

async function testInvoice() {
  const pdf = await generateInvoice({
    invoiceNumber: 'INV-2026-0042',
    date: '11 Apr 2026',
    dueDate: '25 Apr 2026',
    patient: { name: 'Rahul Sharma', id: 'PAT-1001', phone: '+91 98765 43210' },
    doctor: { name: 'Priya Mehta', specialization: 'Cardiology' },
    items: [
      { description: 'Consultation - Cardiology', type: 'Consultation', quantity: 1, unitPrice: 800, totalPrice: 800 },
      { description: 'ECG Test', type: 'Lab Test', quantity: 1, unitPrice: 500, totalPrice: 500 },
      { description: 'Lipid Profile', type: 'Lab Test', quantity: 1, unitPrice: 650, totalPrice: 650 },
      { description: 'Atorvastatin 10mg (30 tabs)', type: 'Medicine', quantity: 1, unitPrice: 245, totalPrice: 245 },
    ],
    subtotal: 2195,
    discount: 100,
    tax: 167.6,
    totalAmount: 2262.6,
    paidAmount: 2262.6,
    status: 'PAID',
    paymentMethod: 'UPI',
    hospital,
  });
  await writeFile(resolve(OUT_DIR, 'invoice.pdf'), pdf);
  console.log('  invoice.pdf');
}

async function testLabReport() {
  const pdf = await generateLabReport({
    reportId: 'LAB-2026-0088',
    date: '11 Apr 2026',
    patient: { name: 'Rahul Sharma', id: 'PAT-1001', age: 35, gender: 'Male' },
    doctor: { name: 'Priya Mehta' },
    testName: 'Complete Blood Count',
    testCode: 'CBC',
    sampleType: 'Blood (EDTA)',
    collectedAt: '11 Apr 2026, 08:30 AM',
    reportedAt: '11 Apr 2026, 02:15 PM',
    results: [
      { parameter: 'Hemoglobin', value: '14.2', unit: 'g/dL', normalRange: '13.0 - 17.0', isAbnormal: false },
      { parameter: 'WBC Count', value: '11500', unit: '/uL', normalRange: '4000 - 11000', isAbnormal: true },
      { parameter: 'RBC Count', value: '4.8', unit: 'M/uL', normalRange: '4.5 - 5.5', isAbnormal: false },
      { parameter: 'Platelet Count', value: '250000', unit: '/uL', normalRange: '150000 - 400000', isAbnormal: false },
      { parameter: 'Hematocrit', value: '42.1', unit: '%', normalRange: '38.0 - 50.0', isAbnormal: false },
    ],
    notes: 'Slightly elevated WBC count. Recommend follow-up in 2 weeks if symptoms persist.',
    technician: 'Ankit Verma',
    verifiedBy: 'Dr. Sunil Rao (Pathologist)',
    isCritical: false,
    hospital,
  });
  await writeFile(resolve(OUT_DIR, 'lab-report.pdf'), pdf);
  console.log('  lab-report.pdf');
}

async function testPrescription() {
  const pdf = await generatePrescription({
    prescriptionId: 'RX-2026-0155',
    date: '11 Apr 2026',
    patient: { name: 'Rahul Sharma', id: 'PAT-1001', age: 35, gender: 'Male' },
    doctor: {
      name: 'Priya Mehta',
      specialization: 'Cardiology',
      qualification: 'MBBS, MD (Cardiology)',
      regNumber: 'MH-12345',
    },
    diagnosis: 'Mild hyperlipidemia with borderline hypertension. No acute cardiac findings.',
    medicines: [
      { name: 'Atorvastatin 10mg', dosage: '10mg', frequency: 'Once daily (night)', duration: '30 days', quantity: 30, instructions: 'After dinner' },
      { name: 'Amlodipine 5mg', dosage: '5mg', frequency: 'Once daily (morning)', duration: '30 days', quantity: 30, instructions: 'Before breakfast' },
      { name: 'Ecosprin 75mg', dosage: '75mg', frequency: 'Once daily', duration: '30 days', quantity: 30, instructions: 'After lunch' },
    ],
    allergies: ['Penicillin', 'Sulfa drugs'],
    notes: 'Follow up after 4 weeks. Avoid high-fat meals. Regular exercise recommended.',
    hospital,
  });
  await writeFile(resolve(OUT_DIR, 'prescription.pdf'), pdf);
  console.log('  prescription.pdf');
}

async function testPatientSheet() {
  const pdf = await generatePatientSheet({
    patient: {
      name: 'Rahul Sharma',
      id: 'PAT-1001',
      age: 35,
      gender: 'Male',
      bloodGroup: 'B+',
      phone: '+91 98765 43210',
    },
    queueToken: 'A-42',
    doctor: { name: 'Priya Mehta', specialization: 'Cardiology' },
    allergies: [
      { allergen: 'Penicillin', severity: 'Severe' },
      { allergen: 'Sulfa drugs', severity: 'Moderate' },
    ],
    chronicConditions: ['Hypertension (Stage 1)', 'Mild Hyperlipidemia'],
    currentMedications: [
      { name: 'Atorvastatin 10mg', dosage: '10mg', frequency: 'Once daily', since: 'Jan 2026' },
      { name: 'Amlodipine 5mg', dosage: '5mg', frequency: 'Once daily', since: 'Feb 2026' },
    ],
    recentVisits: [
      { date: '15 Mar 2026', doctor: 'Dr. Priya Mehta', diagnosis: 'Routine follow-up, BP stable' },
      { date: '10 Feb 2026', doctor: 'Dr. Priya Mehta', diagnosis: 'Initial lipid panel review' },
    ],
    recentLabResults: [
      { testName: 'Lipid Profile', date: '10 Mar 2026', keyFinding: 'LDL 142 mg/dL (borderline high)', status: 'Completed' },
      { testName: 'CBC', date: '10 Mar 2026', keyFinding: 'All within normal range', status: 'Completed' },
    ],
    hospital,
  });
  await writeFile(resolve(OUT_DIR, 'patient-sheet.pdf'), pdf);
  console.log('  patient-sheet.pdf');
}

async function testPatientRecords() {
  const pdf = await generatePatientRecords({
    patient: {
      name: 'Rahul Sharma',
      id: 'PAT-1001',
      age: 35,
      gender: 'Male',
      bloodGroup: 'B+',
      dateOfBirth: '15 Jun 1990',
      phone: '+91 98765 43210',
      address: '42 MG Road, Andheri West, Mumbai 400058',
      emergencyContact: 'Neha Sharma (Spouse)',
      emergencyPhone: '+91 98765 43211',
    },
    allergies: [
      { allergen: 'Penicillin', severity: 'Severe', reaction: 'Anaphylaxis' },
      { allergen: 'Sulfa drugs', severity: 'Moderate', reaction: 'Skin rash' },
    ],
    medicalHistory: [
      { condition: 'Hypertension', diagnosedAt: 'Feb 2026', status: 'Active', notes: 'Stage 1, controlled with medication' },
      { condition: 'Hyperlipidemia', diagnosedAt: 'Jan 2026', status: 'Active', notes: 'Borderline, on statin therapy' },
      { condition: 'Appendectomy', diagnosedAt: 'Aug 2018', status: 'Resolved', notes: 'Laparoscopic, no complications' },
    ],
    immunizations: [
      { vaccine: 'COVID-19 (Covishield)', dose: 2, date: '15 Sep 2021', provider: 'Apollo Hospital' },
      { vaccine: 'COVID-19 Booster', dose: 3, date: '20 Mar 2022', provider: 'Apollo Hospital' },
      { vaccine: 'Influenza', dose: 1, date: '01 Oct 2025', provider: 'Atelier Health' },
    ],
    documents: [
      { name: 'ECG Report - Mar 2026', category: 'Cardiology', uploadedAt: '15 Mar 2026' },
      { name: 'Lipid Profile Report', category: 'Lab Report', uploadedAt: '10 Mar 2026' },
      { name: 'Appendectomy Discharge Summary', category: 'Surgery', uploadedAt: '20 Aug 2018' },
    ],
    hospital,
  });
  await writeFile(resolve(OUT_DIR, 'patient-records.pdf'), pdf);
  console.log('  patient-records.pdf');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Generating test PDFs...\n');

  await testInvoice();
  await testLabReport();
  await testPrescription();
  await testPatientSheet();
  await testPatientRecords();

  console.log(`\nAll 5 PDFs generated in: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
