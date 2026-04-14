export const serviceInfo = {
  service: 'notification-service',
  description: 'Notification Service - Email notifications',
  routes: [
    { method: 'GET', path: '/', description: 'Service information and available routes' },
    { method: 'GET', path: '/health', description: 'Health check — returns service liveness and status' },
    { method: 'POST', path: '/notifications/send', description: 'Send a generic email' },
    { method: 'POST', path: '/notifications/email-verification', description: 'Send email verification link' },
    { method: 'POST', path: '/notifications/password-reset', description: 'Send password reset link' },
    { method: 'POST', path: '/notifications/welcome', description: 'Send welcome email for new users' },
    { method: 'POST', path: '/notifications/appointment-confirmation', description: 'Send appointment confirmation' },
    { method: 'POST', path: '/notifications/appointment-reminder', description: 'Send appointment reminder' },
    { method: 'POST', path: '/notifications/prescription-ready', description: 'Send prescription ready notification' },
    { method: 'POST', path: '/notifications/lab-result-ready', description: 'Send lab result ready notification' },
  ],
};
