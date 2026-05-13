import FormData from 'form-data';
import { prisma } from '@hms/common-db';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'medical-records-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://localhost:3007';

interface UploadResponse {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  resourceType: string;
  size: number;
  originalName: string;
}

export async function uploadMedicalRecord(patientId: string, file: { buffer: Buffer; originalname: string }) {
  logger.info('Uploading medical record', { patientId, fileName: file.originalname });

  let resolvedPatientId = patientId;
  const profile = await prisma.patientProfile.findUnique({ where: { userId: patientId } });
  if (profile) resolvedPatientId = profile.id;

  const form = new FormData();
  form.append('file', file.buffer, { filename: file.originalname, contentType: 'application/pdf' });
  form.append('folder', 'hms');

  const response = await fetch(`${FILE_UPLOADER_URL}/upload`, {
    method: 'POST',
    body: form.getBuffer(),
    headers: form.getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('File upload failed', { status: response.status, error });
    throw new Error(`File upload failed: ${error}`);
  }

  const uploadResult = (await response.json()) as UploadResponse;

  logger.info('File uploaded, saving record to database', { publicId: uploadResult.publicId });

  const record = await prisma.medicalRecord.create({
    data: {
      patientId: resolvedPatientId,
      fileName: file.originalname,
      url: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
    },
  });

  logger.info('Medical record saved', { id: record.id });
  return record;
}

export async function getMedicalRecordsByPatient(patientId: string) {
  let resolvedId = patientId;
  const profile = await prisma.patientProfile.findUnique({ where: { userId: patientId } });
  if (profile) resolvedId = profile.id;

  return prisma.medicalRecord.findMany({
    where: { patientId: resolvedId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMedicalRecordById(id: string) {
  return prisma.medicalRecord.findUnique({ where: { id } });
}

export async function deleteMedicalRecord(id: string) {
  const record = await prisma.medicalRecord.findUnique({ where: { id } });
  if (!record) return null;

  // Delete from Cloudinary via file-uploader-service
  try {
    await fetch(`${FILE_UPLOADER_URL}/upload/${record.publicId}`, { method: 'DELETE' });
  } catch (err) {
    logger.error('Failed to delete file from Cloudinary', { publicId: record.publicId, error: err });
  }

  await prisma.medicalRecord.delete({ where: { id } });
  logger.info('Medical record deleted', { id });
  return record;
}
