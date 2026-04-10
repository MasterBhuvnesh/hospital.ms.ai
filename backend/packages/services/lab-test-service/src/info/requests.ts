export const serviceInfo = {
  service: 'lab-test-service',
  description: 'Lab Test Management Service - Diagnostic test workflow',
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
