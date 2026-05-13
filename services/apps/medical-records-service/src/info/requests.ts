export const serviceInfo = {
  service: 'medical-records-service',
  description: 'Medical Records Service - Upload, store, and retrieve patient medical record PDFs',
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
      path: '/medical-records/upload',
      description: 'Upload a medical record PDF for a patient (multipart form: file + patientId)',
    },
    {
      method: 'GET',
      path: '/medical-records',
      description: 'List medical records (filter by ?patientId)',
    },
    {
      method: 'GET',
      path: '/medical-records/:id',
      description: 'Get a medical record by ID',
    },
    {
      method: 'DELETE',
      path: '/medical-records/:id',
      description: 'Delete a medical record by ID',
    },
  ],
};
