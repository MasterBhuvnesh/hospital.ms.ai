import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createLogger } from '@hms/common-logging';
import medicalRecordsRoutes from './routes/medical-records.routes';
import healthRoutes from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 3009;

const logger = createLogger({
  serviceName: 'medical-records-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

app.use(cors());
app.use(express.json());

app.use('/', medicalRecordsRoutes);
app.use('/health', healthRoutes);

app.listen(PORT, () => {
  logger.info(`Medical records service running on port ${PORT}`);
});

export default app;
