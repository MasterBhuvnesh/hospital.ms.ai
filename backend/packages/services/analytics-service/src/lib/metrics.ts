import client from 'prom-client';

const PREFIX = 'analytics';

client.collectDefaultMetrics({ prefix: `${PREFIX}_` });

export const httpRequestDuration = new client.Histogram({
  name: `${PREFIX}_http_request_duration_seconds`,
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const httpRequestTotal = new client.Counter({
  name: `${PREFIX}_http_requests_total`,
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
});

export const register = client.register;
