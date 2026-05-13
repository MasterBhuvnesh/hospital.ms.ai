export const serviceInfo = {
  service: 'message-service',
  description: 'Message Service - Notifications, alerts, and communication management',
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
