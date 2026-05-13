import 'dotenv/config';
import express from 'express';
import { createLogger } from '@hms/common-logging';
import uploadRoutes from './routes/upload.routes';
import healthRoutes from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 3007;

const logger = createLogger({
  serviceName: 'file-uploader-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

app.use(express.json());

app.use('/', uploadRoutes);
app.use('/health', healthRoutes);

app.listen(PORT, () => {
  logger.info(`File uploader service running on port ${PORT}`);
});

export default app;
