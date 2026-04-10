export const serviceInfo = {
  service: 'notification-service',
  description: 'Notification Service - Email notifications',
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
