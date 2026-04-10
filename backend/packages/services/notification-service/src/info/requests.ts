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
    {
      method: 'POST',
      path: '/notifications/send',
      description: 'Send a generic email (body: to, subject, html, text?)',
    },
    {
      method: 'POST',
      path: '/notifications/appointment-confirmation',
      description: 'Send appointment confirmation email (body: to, patientName, doctorName, dateTime, hospitalName)',
    },
    {
      method: 'POST',
      path: '/notifications/appointment-reminder',
      description: 'Send appointment reminder email (body: to, patientName, doctorName, dateTime, hospitalName)',
    },
    {
      method: 'POST',
      path: '/notifications/prescription-ready',
      description: 'Send prescription ready notification (body: to, patientName, prescriptionId)',
    },
    {
      method: 'POST',
      path: '/notifications/lab-result-ready',
      description: 'Send lab result ready notification (body: to, patientName, testName)',
    },
    {
      method: 'POST',
      path: '/notifications/welcome',
      description: 'Send welcome email for new users (body: to, name)',
    },
  ],
};
