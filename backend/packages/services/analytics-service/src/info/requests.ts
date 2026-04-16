export const serviceInfo = {
  service: 'analytics-service',
  description: 'Analytics Service - Reports and insights',
  routes: [
    // Infrastructure
    { method: 'GET', path: '/', description: 'Service information and available routes' },
    { method: 'GET', path: '/health', description: 'Full health check with database ping' },
    { method: 'GET', path: '/health/live', description: 'Liveness probe (k8s)' },
    { method: 'GET', path: '/health/ready', description: 'Readiness probe (k8s)' },
    { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },

    // Daily metrics
    { method: 'GET', path: '/v1/analytics/daily', description: 'Get daily metrics (admin)' },
    { method: 'POST', path: '/v1/analytics/daily', description: 'Upsert daily metric (admin)' },

    // Doctor metrics
    { method: 'GET', path: '/v1/analytics/doctors', description: 'Get doctor metrics (admin/doctor)' },
    { method: 'POST', path: '/v1/analytics/doctors', description: 'Upsert doctor metric (admin)' },

    // Queue stats
    { method: 'GET', path: '/v1/analytics/queue-stats', description: 'Get queue stats (admin)' },
    { method: 'POST', path: '/v1/analytics/queue-stats', description: 'Upsert queue stat (admin)' },

    // Dashboard
    { method: 'GET', path: '/v1/analytics/dashboard/:hospitalId', description: 'Dashboard summary (admin)' },
  ],
};
