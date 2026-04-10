export const serviceInfo = {
  service: 'calling-service',
  description: 'Calling Service - Voice calls using elevenlabs',
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
