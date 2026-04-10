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

// Parse JSON for non-proxied routes only
app.use('/health', healthRoute);

app.get('/', (_req, res) => {
  res.json({
    ...serviceInfo,
    version: pkg.version,
  });
});

// Apply JWT verification to all proxied routes
app.use(gatewayAuth);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  logger.http('→ incoming', {
    method: req.method,
    path: req.path,
    userId: req.headers['x-user-id'] || 'anonymous',
  });
  res.on('finish', () => {
    logger.http('← response', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
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

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`, {
    url: `http://localhost:${PORT}`,
  });
});

export default app;
