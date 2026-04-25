import client from 'prom-client';

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'inventory_',
});

export const httpRequestDuration = new client.Histogram({
  name: 'inventory_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: 'inventory_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export { register };
export default register;
