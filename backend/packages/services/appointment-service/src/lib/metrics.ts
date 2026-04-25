import client from 'prom-client';

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'appointment_',
});

export const httpRequestCounter = new client.Counter({
  name: 'appointment_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDurationHistogram = new client.Histogram({
  name: 'appointment_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10],
  registers: [register],
});

export const appointmentCreatedCounter = new client.Counter({
  name: 'appointment_created_total',
  help: 'Total number of appointments created',
  labelNames: ['hospital_id', 'status'],
  registers: [register],
});

export default register;
