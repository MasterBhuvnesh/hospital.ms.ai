import express from 'express';
import { createLogger } from '@hms/common-logging';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 3002;

const logger = createLogger({
  serviceName: 'auth-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

app.use(express.json());

app.use('/', authRoutes);
app.use('/health', healthRoutes);

app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);
});

export default app;
