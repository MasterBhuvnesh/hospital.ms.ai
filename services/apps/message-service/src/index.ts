import 'dotenv/config';
import express from 'express';
import { createLogger } from '@hms/common-logging';
import messageRoutes from './routes/message.routes';
import healthRoutes from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 3004;

const logger = createLogger({
  serviceName: 'message-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

app.use(express.json());

app.use('/', messageRoutes);
app.use('/health', healthRoutes);

app.listen(PORT, () => {
  logger.info(`Message service running on port ${PORT}`);
});

export default app;
