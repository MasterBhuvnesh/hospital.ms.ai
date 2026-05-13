export const serviceInfo = {
  service: 'appointment-service',
  description: 'Appointment Management Service - Scheduling, booking, and appointment tracking',
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
      path: '/appointments',
      description: 'List appointments (supports ?patientId and ?doctorId query params)',
    },
    {
      method: 'GET',
      path: '/appointments/:id',
      description: 'Get appointment by ID',
    },
    {
      method: 'POST',
      path: '/appointments',
      description: 'Create a new appointment',
    },
    {
      method: 'PUT',
      path: '/appointments/:id',
      description: 'Update appointment status',
    },
    {
      method: 'DELETE',
      path: '/appointments/:id',
      description: 'Delete an appointment',
    },
  ],
};
