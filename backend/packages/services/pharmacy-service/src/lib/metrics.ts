import client from 'prom-client';

/**
 * @fileoverview Prometheus Metrics Configuration
 * @description Standardized metrics for the pharmacy-service
 */

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'pharmacy_',
});

// ── HTTP Metrics ──────────────────────────────────────

export const httpRequestCounter = new client.Counter({
  name: 'pharmacy_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDurationHistogram = new client.Histogram({
  name: 'pharmacy_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10],
  registers: [register],
});

// ── Custom Business Metrics ──────────────────────────

export const orderCreatedCounter = new client.Counter({
  name: 'pharmacy_orders_created_total',
  help: 'Total number of pharmacy orders created',
  labelNames: ['delivery_type', 'status'],
  registers: [register],
});

export const orderStatusUpdateCounter = new client.Counter({
  name: 'pharmacy_order_status_updates_total',
  help: 'Total number of order status updates',
  labelNames: ['status'],
  registers: [register],
});

export default register;
