import 'dotenv/config';
import { createRequire } from 'module';
/**
 * @fileoverview Realtime Service
 * @description Real-Time Service - Live updates via WebSocket
 */

import { createServer } from 'node:http';
import express, { type Express } from 'express';
import { createLogger } from '@hms/common-logging';
import { extractUser, errorHandler } from '@hms/common-middleware';
import healthRoute from './routes/health.js';
import realtimeRoutes from './routes/realtime.routes.js';
import { realtimeService } from './services/realtime.service.js';
import { serviceInfo } from './info/requests.js';
import register, { httpRequestCounter, httpRequestDurationHistogram } from './lib/metrics.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const PORT = process.env.PORT || 5017;

const logger = createLogger({
  serviceName: 'realtime-service',
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
app.use('/realtime', realtimeRoutes);

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

const server = createServer(app);
realtimeService.initialize(server);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info('Realtime service started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
    });
    logger.info(`Realtime service running on port ${PORT}`, {
      url: `http://localhost:${PORT}`,
      healthCheck: `http://localhost:${PORT}/health`,
    });
  });
}

export default app;
