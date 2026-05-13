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
  ],
};
