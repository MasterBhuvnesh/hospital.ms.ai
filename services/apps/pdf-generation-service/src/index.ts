import 'dotenv/config';
import express from 'express';
import { createLogger } from '@hms/common-logging';
import pdfRoutes from './routes/pdf.routes';
import healthRoutes from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 3008;

const logger = createLogger({
  serviceName: 'pdf-generation-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

app.use(express.json());

app.use('/', pdfRoutes);
app.use('/health', healthRoutes);

app.listen(PORT, () => {
  logger.info(`PDF generation service running on port ${PORT}`);
});

export default app;
