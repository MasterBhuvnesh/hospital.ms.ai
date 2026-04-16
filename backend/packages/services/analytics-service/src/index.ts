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

app.use((req, res, next) => {
  const startTime = Date.now();

  logger.http('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.http('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    });
  });

  next();
});

// ── Infrastructure routes (no version prefix) ───────
app.use('/health', healthRoute);

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

app.listen(PORT, () => {
  logger.info('Analytics service started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
  logger.info(`Analytics service running on port ${PORT}`, {
    url: `http://localhost:${PORT}`,
    healthCheck: `http://localhost:${PORT}/health`,
  });
});

export default app;
