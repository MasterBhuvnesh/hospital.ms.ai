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

app.use('/health', healthRoute);
app.use('/doctors', doctorRoutes);

app.get('/', (_req, res) => {
  res.json({
    ...serviceInfo,
    version: pkg.version,
  });
});

app.use((_req, res) => {
  logger.warn('Route not found', { path: _req.path, method: _req.method });
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('Doctor service started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
  logger.info(`Doctor service running on port ${PORT}`, {
    url: `http://localhost:${PORT}`,
    healthCheck: `http://localhost:${PORT}/health`,
  });
});

export default app;
