import 'dotenv/config';
import { createRequire } from 'module';
/**
 * @fileoverview API Gateway
 * @description API Gateway - Single entry point for all client requests
 */

import express, { type Express } from 'express';
import { createLogger } from '@hms/common-logging';
import { errorHandler } from '@hms/common-middleware';
import healthRoute from './routes/health.js';
import { serviceInfo } from './info/requests.js';
import { gatewayAuth } from './middleware/auth.js';
import { proxyTo } from './proxy/index.js';
import { SERVICES } from './config/services.js';
import register, { httpRequestDuration, httpRequestTotal } from './lib/metrics.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const PORT = process.env.PORT || 4000;

const logger = createLogger({
  serviceName: 'api-gateway',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

const app: Express = express();

// ── Infrastructure routes ───────────────────────────
app.use('/health', healthRoute);

app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (_req, res) => {
  res.json({
    ...serviceInfo,
    version: pkg.version,
  });
});

// ── Middleware ──────────────────────────────────────

// Apply JWT verification to all proxied routes
app.use(gatewayAuth);

// Logging & metrics middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const end = typeof httpRequestDuration.startTimer === 'function' ? httpRequestDuration.startTimer() : null;

  logger.http('→ incoming', {
    method: req.method,
    path: req.path,
    userId: req.headers['x-user-id'] || 'anonymous',
  });

  res.on('finish', () => {
    const responseTime = (Date.now() - startTime) / 1000;
    const labels = { method: req.method, route: req.path, status_code: res.statusCode };
    
    if (end) end(labels);
    httpRequestTotal.inc(labels);

    logger.http('← response', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Math.round(responseTime * 1000),
    });
  });
  next();
});

// Route prefixes → services
app.use('/auth', proxyTo(SERVICES.identity));
app.use('/doctors', proxyTo(SERVICES.doctor));
app.use('/hospitals', proxyTo(SERVICES.hospital));
app.use('/search', proxyTo(SERVICES.search));
app.use('/appointments', proxyTo(SERVICES.appointment));
app.use('/queue', proxyTo(SERVICES.queue));
app.use('/patients', proxyTo(SERVICES.patientRecords));
app.use('/consultations', proxyTo(SERVICES.consultation));
app.use('/prescriptions', proxyTo(SERVICES.prescription));
app.use('/lab-tests', proxyTo(SERVICES.labTest));
app.use('/lab-results', proxyTo(SERVICES.labResult));
app.use('/pharmacy', proxyTo(SERVICES.pharmacy));
app.use('/inventory', proxyTo(SERVICES.inventory));
app.use('/billing', proxyTo(SERVICES.billing));
app.use('/patient-sheets', proxyTo(SERVICES.patientSheet));
app.use('/analytics', proxyTo(SERVICES.analytics));

// 404 for unmatched routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`, {
      url: `http://localhost:${PORT}`,
    });
  });
}

export default app;
