import express from 'express';
import { createLogger } from '@hms/common-logging';
import patientRoutes from './routes/patient.routes';
import healthRoutes from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 3005;

const logger = createLogger({
  serviceName: 'patient-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

app.use(express.json());

app.use('/', patientRoutes);
app.use('/health', healthRoutes);

app.listen(PORT, () => {
  logger.info(`Patient service running on port ${PORT}`);
});

export default app;
