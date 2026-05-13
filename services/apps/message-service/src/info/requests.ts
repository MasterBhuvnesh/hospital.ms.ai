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
    {
      method: 'GET',
      path: '/messages',
      description: 'List messages (supports ?userId and ?otherUserId query params)',
    },
    {
      method: 'GET',
      path: '/messages/:id',
      description: 'Get a message by ID',
    },
    {
      method: 'POST',
      path: '/messages',
      description: 'Send a new message (requires senderId, receiverId, content)',
    },
    {
      method: 'PATCH',
      path: '/messages/:id/read',
      description: 'Mark a message as read',
    },
    {
      method: 'DELETE',
      path: '/messages/:id',
      description: 'Delete a message by ID',
    },
  ],
};
