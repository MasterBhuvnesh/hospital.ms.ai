export const serviceInfo = {
  service: 'prescription-service',
  description: 'Prescription Management Service - Prescriptions, medications, and pharmacy management',
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
      method: 'GET',
      path: '/prescriptions',
      description: 'List all prescriptions (supports ?patientId and ?doctorId query filters)',
    },
    {
      method: 'GET',
      path: '/prescriptions/:id',
      description: 'Get a prescription by ID',
    },
    {
      method: 'POST',
      path: '/prescriptions',
      description: 'Create a new prescription',
    },
    {
      method: 'PATCH',
      path: '/prescriptions/:id',
      description: 'Update an existing prescription',
    },
    {
      method: 'DELETE',
      path: '/prescriptions/:id',
      description: 'Delete a prescription',
    },
  ],
};
