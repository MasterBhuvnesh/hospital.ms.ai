import express, { Router, type Express } from 'express';
import { extractUser, errorHandler } from '@hms/common-middleware';
import analyticsRoutes from '../routes/analytics.routes.js';

export function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(extractUser);

  const v1 = Router();
  v1.use('/analytics', analyticsRoutes);
  app.use('/v1', v1);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  app.use(errorHandler);

  return app;
}
