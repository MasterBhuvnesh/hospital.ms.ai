import { Router, type Request, type Response } from 'express';
import { createLogger } from '@hms/common-logging';

const router: Router = Router();

const logger = createLogger({
  serviceName: 'auth-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

router.get('/', (_req: Request, res: Response) => {
  const startTime = Date.now();

  logger.info('Health check requested', {
    path: '/health',
    method: 'GET',
    timestamp: new Date().toISOString(),
  });

  const health = {
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };

  const responseTime = Date.now() - startTime;

  logger.info('Health check completed', {
    status: health.status,
    responseTime: `${responseTime}ms`,
    uptime: health.uptime,
  });

  res.status(200).json(health);
});

export default router;
