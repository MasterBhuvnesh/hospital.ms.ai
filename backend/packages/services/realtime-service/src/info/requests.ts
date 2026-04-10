export const serviceInfo = {
  service: 'realtime-service',
  description: 'Real-Time Service - Live updates via WebSocket',
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
      method: 'POST',
      path: '/realtime/emit',
      description: 'Emit an event to all clients subscribed to a specific channel',
    },
    {
      method: 'POST',
      path: '/realtime/broadcast',
      description: 'Broadcast an event to all connected WebSocket clients',
    },
    {
      method: 'GET',
      path: '/realtime/stats',
      description: 'Get WebSocket connection statistics (connected clients, active channels)',
    },
  ],
};
