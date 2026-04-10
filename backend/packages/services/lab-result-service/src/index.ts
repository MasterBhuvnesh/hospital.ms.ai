import 'dotenv/config';
import { createRequire } from 'module';
/**
 * @fileoverview Lab Result Service
 * @description Lab Result Service - Test result processing and delivery
 */

import express, { type Express } from 'express';
import { createLogger } from '@hms/common-logging';
import healthRoute from './routes/health.js';
import { serviceInfo } from './info/requests.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const PORT = process.env.PORT || 5011;

const logger = createLogger({
  serviceName: 'lab-result-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

const app: Express = express();

app.use(express.json());

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

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  logger.info('Lab result service started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
  logger.info(`Lab result service running on port ${PORT}`, {
    url: `http://localhost:${PORT}`,
    healthCheck: `http://localhost:${PORT}/health`,
  });
});

export default app;
