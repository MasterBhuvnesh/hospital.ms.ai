import 'dotenv/config';
import { createRequire } from 'module';

import express, { type Express } from 'express';
import { createLogger } from '@hms/common-logging';
import { errorHandler } from '@hms/common-middleware';
import healthRoute from './routes/health.js';
import authRoutes from './routes/auth.routes.js';
import { serviceInfo } from './info/requests.js';

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

app.use((req, res, next) => {
  const startTime = Date.now();

  logger.http('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.on('finish', () => {
    logger.http('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${Date.now() - startTime}ms`,
    });
  });

  next();
});

app.use('/health', healthRoute);
app.use('/auth', authRoutes);

app.get('/', (_req, res) => {
  res.json({ ...serviceInfo, version: pkg.version });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`, {
    url: `http://localhost:${PORT}`,
    healthCheck: `http://localhost:${PORT}/health`,
  });
});

export default app;
