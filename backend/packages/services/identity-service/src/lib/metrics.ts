import client from 'prom-client';

client.collectDefaultMetrics({ prefix: 'identity_' });

export const httpRequestDuration = new client.Histogram({
  name: 'identity_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const httpRequestTotal = new client.Counter({
  name: 'identity_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
});

export const loginAttempts = new client.Counter({
  name: 'identity_login_attempts_total',
  help: 'Total login attempts',
  labelNames: ['status'] as const,
});

export const registrations = new client.Counter({
  name: 'identity_registrations_total',
  help: 'Total user registrations',
  labelNames: ['role'] as const,
});

export const register = client.register;
