import FormData from 'form-data';
import { prisma } from '@hms/common-db';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'pdf-generation-service',
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

export interface SaveDocumentInput {
  type: 'pharmacy-bill' | 'appointment-bill' | 'prescription';
  referenceId?: string;
  patientId?: string;
  doctorId?: string;
  fileName: string;
  pdfBuffer: Buffer;
}

export async function uploadAndSaveDocument(input: SaveDocumentInput) {
  const { type, referenceId, patientId, doctorId, fileName, pdfBuffer } = input;

  logger.info('Uploading PDF to file-uploader-service', { type, fileName });

  const form = new FormData();
  form.append('file', pdfBuffer, { filename: fileName, contentType: 'application/pdf' });
  form.append('folder', `hms/documents/${type}`);

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

  logger.info('PDF uploaded, saving to database', { publicId: uploadResult.publicId });

  const document = await prisma.generatedDocument.create({
    data: {
      type,
      referenceId: referenceId || null,
      patientId: patientId || null,
      doctorId: doctorId || null,
      url: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      fileName,
    },
  });

  logger.info('Document saved to database', { id: document.id, url: document.url });

  return {
    id: document.id,
    type: document.type,
    url: document.url,
    publicId: document.publicId,
    fileName: document.fileName,
    createdAt: document.createdAt,
  };
}

export async function getDocumentsByType(type: string) {
  return prisma.generatedDocument.findMany({
    where: { type },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDocumentsByPatient(patientId: string) {
  return prisma.generatedDocument.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDocumentById(id: string) {
  return prisma.generatedDocument.findUnique({ where: { id } });
}
