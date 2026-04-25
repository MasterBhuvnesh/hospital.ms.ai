import client from 'prom-client';

/**
 * @fileoverview Prometheus Metrics Configuration
 * @description Standardized metrics for the billing-service
 */

const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'billing_',
});

// ── HTTP Metrics ──────────────────────────────────────

export const httpRequestTotal = new client.Counter({
  name: 'billing_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: 'billing_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10],
  registers: [register],
});

// ── Custom Business Metrics ──────────────────────────

export const invoiceCreatedCounter = new client.Counter({
  name: 'billing_invoices_created_total',
  help: 'Total number of invoices created',
  labelNames: ['hospital_id', 'status'],
  registers: [register],
});

export const paymentProcessedCounter = new client.Counter({
  name: 'billing_payments_processed_total',
  help: 'Total number of payments processed',
  labelNames: ['method', 'status'],
  registers: [register],
});

export const totalRevenueCounter = new client.Counter({
  name: 'billing_revenue_total',
  help: 'Total revenue processed in decimals',
  labelNames: ['hospital_id'],
  registers: [register],
});

export default register;
