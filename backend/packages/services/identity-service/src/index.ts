import 'dotenv/config';
import { createRequire } from 'module';

import express, { Router, type Express } from 'express';
import { createLogger } from '@hms/common-logging';
import { errorHandler } from '@hms/common-middleware';
import healthRoute from './routes/health.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { serviceInfo } from './info/requests.js';
import { register, httpRequestDuration, httpRequestTotal } from './lib/metrics.js';
import { prisma } from './lib/prisma.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const PORT = process.env.PORT || 5001;

const logger = createLogger({
  serviceName: 'identity-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

const app: Express = express();

app.use(express.json());

// ── Request logging & metrics ────────────────────────
app.use((req, res, next) => {
  const startTime = Date.now();
  const end = typeof httpRequestDuration.startTimer === 'function' ? httpRequestDuration.startTimer() : null;

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
v1.use('/auth', authRoutes);
v1.use('/admin', adminRoutes);
app.use('/v1', v1);

// ── 404 & error handler ─────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    logger.info(`Identity service running on port ${PORT}`, {
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
}

export default app;
