import 'dotenv/config';
import { createRequire } from 'module';
/**
 * @fileoverview Notification Service
 * @description Notification Service - Email notifications
 */

import express, { type Express } from 'express';
import { createLogger } from '@hms/common-logging';
import { extractUser, errorHandler } from '@hms/common-middleware';
import healthRoute from './routes/health.js';
import notificationRoutes from './routes/notification.routes.js';
import { serviceInfo } from './info/requests.js';
import register, { httpRequestCounter, httpRequestDurationHistogram } from './lib/metrics.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const PORT = process.env.PORT || 5015;

const logger = createLogger({
  serviceName: 'notification-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

const app: Express = express();

app.use(express.json());
app.use(extractUser);

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = (Date.now() - startTime) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    httpRequestDurationHistogram.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      responseTime,
    );
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
app.use('/notifications', notificationRoutes);

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
    logger.info('Notification service started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
    });
    logger.info(`Notification service running on port ${PORT}`, {
      url: `http://localhost:${PORT}`,
      healthCheck: `http://localhost:${PORT}/health`,
    });
  });
}

export default app;
