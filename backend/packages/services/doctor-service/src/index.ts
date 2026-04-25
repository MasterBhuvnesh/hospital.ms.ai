import 'dotenv/config';
import { createRequire } from 'module';
/**
 * @fileoverview Doctor Service
 * @description Doctor Management Service - Doctor profiles, attendance, and availability
 */

import express, { type Express } from 'express';
import { createLogger } from '@hms/common-logging';
import { extractUser, errorHandler } from '@hms/common-middleware';
import healthRoute from './routes/health.js';
import doctorRoutes from './routes/doctor.routes.js';
import { serviceInfo } from './info/requests.js';
import register, { httpRequestTotal, httpRequestDuration } from './lib/metrics.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const PORT = process.env.PORT || 5002;

const logger = createLogger({
  serviceName: 'doctor-service',
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
  const end = typeof httpRequestDuration.startTimer === 'function' ? httpRequestDuration.startTimer() : null;

  logger.http('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.on('finish', () => {
    const responseTime = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    
    if (end) end(labels);
    httpRequestTotal.inc(labels);

    logger.http('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${Math.round(responseTime * 1000)}ms`,
    });
  });

  next();
});

app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/health', healthRoute);
app.use('/doctors', doctorRoutes);

app.get('/', (_req, res) => {
  res.json({
    ...serviceInfo,
    version: pkg.version,
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Doctor service running on port ${PORT}`, {
      url: `http://localhost:${PORT}`,
      healthCheck: `http://localhost:${PORT}/health`,
    });
  });
}

export default app;
