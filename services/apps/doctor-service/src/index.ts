import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createLogger } from '@hms/common-logging';
import doctorRoutes from './routes/doctor.routes';
import healthRoutes from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 3003;

const logger = createLogger({
  serviceName: 'doctor-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

app.use(cors());
app.use(express.json());

app.use('/', doctorRoutes);
app.use('/health', healthRoutes);

app.listen(PORT, () => {
  logger.info(`Doctor service running on port ${PORT}`);
});

export default app;
