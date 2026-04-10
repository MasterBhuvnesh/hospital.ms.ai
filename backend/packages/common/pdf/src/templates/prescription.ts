import { colors } from '../colors.js';
import { CONTENT_WIDTH, MARGINS } from '../layout.js';
import { addPage, createDocument, renderToBuffer } from '../renderer.js';

export async function generatePrescription(data: any): Promise<Uint8Array> {
  const ctx = await createDocument({
    title: `Prescription - ${data.patient.name}`,
  });

  ctx.header = data.hospital;

  const { page, y: startY } = addPage(ctx);
  const { bold, regular } = ctx.fonts;

  let y = startY;
  y -= 15;

  page.drawText('PRESCRIPTION', {
    x: MARGINS.left,
    y,
    size: 20,
    font: bold,
    color: colors.primary,
  });

  page.drawText(`Rx No: ${data.prescriptionId}`, {
    x: MARGINS.left + CONTENT_WIDTH - 120,
    y,
    size: 9,
    font: regular,
    color: colors.gray,
  });

  y -= 30;

  const leftX = MARGINS.left;
  const rightX = MARGINS.left + CONTENT_WIDTH / 2 + 20;

  let leftY = y;
  let rightY = y;

  page.drawText('Prescribing Doctor', {
    x: leftX,
    y: leftY,
    size: 11,
    font: bold,
    color: colors.primary,
  });

  page.drawLine({
    start: { x: leftX, y: leftY - 2 },
    end: { x: leftX + CONTENT_WIDTH / 2 - 10, y: leftY - 2 },
    thickness: 1,
    color: colors.primary,
  });

  leftY -= 16;

  page.drawText(`Dr. ${data.doctor.name}`, { x: leftX, y: leftY, size: 10, font: bold });
  leftY -= 14;

  page.drawText(data.doctor.specialization, { x: leftX, y: leftY, size: 9, font: regular });
  leftY -= 12;

  page.drawText(data.doctor.qualification, { x: leftX, y: leftY, size: 9, font: regular });
  leftY -= 12;

  if (data.doctor.regNumber) {
    page.drawText(`Reg No: ${data.doctor.regNumber}`, {
      x: leftX,
      y: leftY,
      size: 8,
      font: regular,
      color: colors.gray,
    });
    leftY -= 12;
  }

  page.drawText('Patient Information', {
    x: rightX,
    y: rightY,
    size: 11,
    font: bold,
    color: colors.primary,
  });

  page.drawLine({
    start: { x: rightX, y: rightY - 2 },
    end: { x: rightX + CONTENT_WIDTH / 2 - 10, y: rightY - 2 },
    thickness: 1,
    color: colors.primary,
  });

  rightY -= 16;

  page.drawText(data.patient.name, { x: rightX, y: rightY, size: 10, font: bold });
  rightY -= 14;

  page.drawText(`ID: ${data.patient.id}`, { x: rightX, y: rightY, size: 9, font: regular });
  rightY -= 12;

  page.drawText(`${data.patient.age} yrs / ${data.patient.gender}`, {
    x: rightX,
    y: rightY,
    size: 9,
    font: regular,
  });
  rightY -= 12;

  page.drawText(`Date: ${data.date}`, {
    x: rightX,
    y: rightY,
    size: 9,
    font: regular,
  });
  rightY -= 12;

  y = Math.min(leftY, rightY) - 20;

  if (data.allergies?.length) {
    page.drawRectangle({
      x: MARGINS.left,
      y: y - 18,
      width: CONTENT_WIDTH,
      height: 20,
      color: colors.warning,
      opacity: 0.15,
    });

    page.drawText(`ALLERGIES: ${data.allergies.join(', ')}`, {
      x: MARGINS.left + 6,
      y: y - 14,
      size: 9,
      font: bold,
      color: colors.danger,
    });

    y -= 30;
  }

  y -= 15;
  page.drawText('Diagnosis', {
    x: MARGINS.left,
    y,
    size: 11,
    font: bold,
    color: colors.primary,
  });

  y -= 14;

  page.drawText(data.diagnosis, {
    x: MARGINS.left,
    y,
    size: 10,
    font: regular,
  });

  y -= 20;

  page.drawText('Medicines', {
    x: MARGINS.left,
    y,
    size: 11,
    font: bold,
    color: colors.primary,
  });

  y -= 14;

  const startX = MARGINS.left;

  const colX = [
    startX,
    startX + 30,
    startX + 160,
    startX + 230,
    startX + 320,
    startX + 390,
    startX + 440,
  ];

  const headers = ['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Qty', 'Instructions'];

  headers.forEach((h, i) => {
    page.drawText(h, {
      x: colX[i],
      y,
      size: 8,
      font: bold,
    });
  });

  y -= 12;

  data.medicines.forEach((m: any, i: number) => {
    const row = [
      String(i + 1),
      m.name,
      m.dosage,
      m.frequency,
      m.duration,
      String(m.quantity),
      m.instructions || '-',
    ];

    row.forEach((cell, j) => {
      page.drawText(cell, {
        x: colX[j],
        y,
        size: 8,
        font: regular,
      });
    });

    y -= 14;
  });

  y -= 10;

  if (data.notes) {
    page.drawText('Additional Notes', {
      x: MARGINS.left,
      y,
      size: 11,
      font: bold,
      color: colors.primary,
    });

    y -= 14;

    page.drawText(data.notes, {
      x: MARGINS.left,
      y,
      size: 9,
      font: regular,
    });

    y -= 20;
  }

  page.drawLine({
    start: { x: MARGINS.left, y },
    end: { x: MARGINS.left + 200, y },
    thickness: 1,
    color: colors.gray,
  });

  y -= 14;

  page.drawText(`Dr. ${data.doctor.name}`, {
    x: MARGINS.left,
    y,
    size: 11,
    font: bold,
  });

  y -= 12;

  page.drawText('Signature / Digital Stamp', {
    x: MARGINS.left,
    y,
    size: 8,
    font: regular,
    color: colors.gray,
  });

  return renderToBuffer(ctx);
}
