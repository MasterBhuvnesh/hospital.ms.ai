import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import path from 'path';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'file-uploader-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico', '.pdf'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'];

function getResourceType(filename: string): 'image' | 'video' | 'raw' {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  return 'raw';
}

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  resourceType: string;
  size: number;
  originalName: string;
}

export async function uploadFile(
  fileBuffer: Buffer,
  originalName: string,
  folder: string = 'hms'
): Promise<UploadResult> {
  logger.info('Uploading file to Cloudinary', { originalName, folder });

  const resourceType = getResourceType(originalName);

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `${Date.now()}-${path.parse(originalName).name}`,
        access_mode: 'public',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!);
      }
    );
    stream.end(fileBuffer);
  });

  logger.info('File uploaded successfully', { publicId: result.public_id, url: result.secure_url });

  return {
    url: result.url,
    secureUrl: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    resourceType: result.resource_type,
    size: result.bytes,
    originalName,
  };
}

export async function uploadMultipleFiles(
  files: { buffer: Buffer; originalName: string }[],
  folder: string = 'hms'
): Promise<UploadResult[]> {
  logger.info('Uploading multiple files', { count: files.length, folder });

  const results = await Promise.all(
    files.map((file) => uploadFile(file.buffer, file.originalName, folder))
  );

  return results;
}

export async function deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<{ result: string }> {
  logger.info('Deleting file from Cloudinary', { publicId, resourceType });

  const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

  logger.info('File deletion result', { publicId, result: result.result });

  return { result: result.result };
}
