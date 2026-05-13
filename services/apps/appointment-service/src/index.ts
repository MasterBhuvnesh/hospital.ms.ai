import 'dotenv/config';
import express from 'express';
import { createLogger } from '@hms/common-logging';
import appointmentRoutes from './routes/appointment.routes';
import healthRoutes from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 3001;

const logger = createLogger({
  serviceName: 'appointment-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

app.use(express.json());

app.use('/', appointmentRoutes);
app.use('/health', healthRoutes);

app.listen(PORT, () => {
  logger.info(`Appointment service running on port ${PORT}`);
});

export default app;
