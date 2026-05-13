export const serviceInfo = {
  service: 'file-uploader-service',
  description: 'File Upload Service - Upload files to Cloudinary and return URLs',
  routes: [
    {
      method: 'GET',
      path: '/',
      description: 'Service information and available routes',
    },
    {
      method: 'GET',
      path: '/health',
      description: 'Health check — returns service liveness and status',
    },
    {
      method: 'POST',
      path: '/upload',
      description: 'Upload a single file to Cloudinary (multipart/form-data, field: "file")',
    },
    {
      method: 'POST',
      path: '/upload/multiple',
      description: 'Upload multiple files to Cloudinary (multipart/form-data, field: "files", max 5)',
    },
    {
      method: 'DELETE',
      path: '/upload/:publicId',
      description: 'Delete a file from Cloudinary by public ID',
    },
  ],
};
