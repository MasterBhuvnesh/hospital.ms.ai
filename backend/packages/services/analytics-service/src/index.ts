import 'dotenv/config';
import { createRequire } from 'module';
/**
 * @fileoverview Analytics Service
 * @description Analytics Service - Reports and insights
 */

import express, { Router, type Express } from 'express';
import { createLogger } from '@hms/common-logging';
import { extractUser, errorHandler } from '@hms/common-middleware';
import healthRoute from './routes/health.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { serviceInfo } from './info/requests.js';
import { register, httpRequestDuration, httpRequestTotal } from './lib/metrics.js';
import { prisma } from './lib/prisma.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const PORT = process.env.PORT || 5018;

const logger = createLogger({
  serviceName: 'analytics-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

const app: Express = express();

app.use(express.json());
app.use(extractUser);

// ── Request logging & metrics ────────────────────────
app.use((req, res, next) => {
  const startTime = Date.now();
  const end = httpRequestDuration.startTimer();

  logger.http('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.on('finish', () => {
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    end(labels);
    httpRequestTotal.inc(labels);

    logger.http('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${Date.now() - startTime}ms`,
    });
  });

  next();
});

// ── Infrastructure routes (no version prefix) ───────
app.use('/health', healthRoute);

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/', (_req, res) => {
  res.json({ ...serviceInfo, version: pkg.version });
});

// ── API v1 ───────────────────────────────────────────
const v1 = Router();
v1.use('/analytics', analyticsRoutes);
app.use('/v1', v1);

// ── 404 & error handler ─────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

// ── Start server ────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Analytics service running on port ${PORT}`, {
    url: `http://localhost:${PORT}`,
    healthCheck: `http://localhost:${PORT}/health`,
    api: `http://localhost:${PORT}/v1`,
    metrics: `http://localhost:${PORT}/metrics`,
  });
});

// ── Graceful shutdown ───────────────────────────────
function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
