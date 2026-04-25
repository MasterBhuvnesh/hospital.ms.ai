import client from 'prom-client';

/**
 * @fileoverview Prometheus Metrics Configuration
 * @description Standardized metrics for the consultation-service
 */

const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'consultation_',
});

// ── HTTP Metrics ──────────────────────────────────────

export const httpRequestCounter = new client.Counter({
  name: 'consultation_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDurationHistogram = new client.Histogram({
  name: 'consultation_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10], // standard buckets
  registers: [register],
});

// ── Custom Business Metrics ──────────────────────────

export const consultationCreatedCounter = new client.Counter({
  name: 'consultation_created_total',
  help: 'Total number of consultations created',
  labelNames: ['hospital_id', 'status'],
  registers: [register],
});

export const vitalsRecordedCounter = new client.Counter({
  name: 'consultation_vitals_recorded_total',
  help: 'Total number of vitals recorded',
  registers: [register],
});

export const notesAddedCounter = new client.Counter({
  name: 'consultation_notes_added_total',
  help: 'Total number of SOAP notes added',
  registers: [register],
});

export default register;
