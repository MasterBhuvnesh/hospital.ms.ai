import express from 'express';
import { createLogger } from '@hms/common-logging';
import prescriptionRoutes from './routes/prescription.routes';
import healthRoutes from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 3006;

const logger = createLogger({
  serviceName: 'prescription-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

app.use(express.json());

app.use('/', prescriptionRoutes);
app.use('/health', healthRoutes);

app.listen(PORT, () => {
  logger.info(`Prescription service running on port ${PORT}`);
});

export default app;
