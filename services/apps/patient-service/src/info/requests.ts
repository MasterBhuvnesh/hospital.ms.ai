export const serviceInfo = {
  service: 'patient-service',
  description: 'Patient Management Service - Patient records, registration, and history',
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
      path: '/patients',
      description: 'List all patients with user, appointments, prescriptions, and medical reports',
    },
    {
      method: 'GET',
      path: '/patients/:id',
      description: 'Get a patient by ID',
    },
    {
      method: 'POST',
      path: '/patients',
      description: 'Create a new patient profile (supports walk-in without userId)',
    },
    {
      method: 'PATCH',
      path: '/patients/:id',
      description: 'Update a patient profile',
    },
    {
      method: 'DELETE',
      path: '/patients/:id',
      description: 'Delete a patient with cascade (appointments, prescriptions, walk-in user)',
    },
  ],
};
