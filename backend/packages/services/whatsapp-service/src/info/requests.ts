export const serviceInfo = {
  service: 'whatsapp-service',
  description: 'Whatsapp Service - Whatsapp notifications',
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
      path: '/messages/send',
      description: 'Send a generic WhatsApp text message',
    },
    {
      method: 'POST',
      path: '/messages/appointment-confirmation',
      description: 'Send an appointment confirmation WhatsApp message',
    },
    {
      method: 'POST',
      path: '/messages/appointment-reminder',
      description: 'Send an appointment reminder WhatsApp message',
    },
    {
      method: 'POST',
      path: '/messages/queue-update',
      description: 'Send a queue position update WhatsApp message',
    },
    {
      method: 'POST',
      path: '/messages/prescription-ready',
      description: 'Send a prescription ready WhatsApp notification',
    },
    {
      method: 'POST',
      path: '/messages/lab-result-ready',
      description: 'Send a lab result ready WhatsApp notification',
    },
  ],
};
