export const serviceInfo = {
  service: 'doctor-service',
  description: 'Doctor Management Service - Doctor profiles, attendance, and availability',
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
      path: '/doctors',
      description: 'List all doctors in UI-friendly format',
    },
    {
      method: 'GET',
      path: '/doctors/:id',
      description: 'Get a single doctor profile by ID',
    },
    {
      method: 'POST',
      path: '/doctors',
      description: 'Create a new doctor profile',
    },
    {
      method: 'PATCH',
      path: '/doctors/:id',
      description: 'Update an existing doctor profile',
    },
    {
      method: 'DELETE',
      path: '/doctors/:id',
      description: 'Delete a doctor profile',
    },
  ],
};
