export const serviceInfo = {
  service: 'patient-sheet-service',
  description: 'Patient Sheet Service - Auto-generate doctor summaries',
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
