export const serviceInfo = {
  service: 'pdf-generation-service',
  description: 'PDF Generation Service - Generate, upload, and store billing PDFs for pharmacy, appointments, and prescriptions',
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
      path: '/pdf/pharmacy-bill',
      description: 'Generate pharmacy bill PDF, upload to Cloudinary, save URL in DB',
    },
    {
      method: 'POST',
      path: '/pdf/appointment-bill',
      description: 'Generate appointment bill PDF, upload to Cloudinary, save URL in DB',
    },
    {
      method: 'POST',
      path: '/pdf/prescription',
      description: 'Generate prescription PDF, upload to Cloudinary, save URL in DB',
    },
    {
      method: 'GET',
      path: '/documents',
      description: 'List documents (filter by ?type or ?patientId)',
    },
    {
      method: 'GET',
      path: '/documents/:id',
      description: 'Get a document by ID',
    },
  ],
};
