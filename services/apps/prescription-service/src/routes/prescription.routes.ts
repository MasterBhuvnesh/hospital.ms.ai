import { Router, type Request, type Response } from 'express';
import { serviceInfo } from '../info/requests';
import { prescriptionService } from '../services/prescription.service';
import { createLogger } from '@hms/common-logging';

const router: Router = Router();

const logger = createLogger({
  serviceName: 'prescription-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

// GET / - Service info
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(serviceInfo);
});

// GET /prescriptions - List prescriptions with optional filters
router.get('/prescriptions', async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId } = req.query as {
      patientId?: string;
      doctorId?: string;
    };

    const prescriptions = await prescriptionService.findAll({
      patientId,
      doctorId,
    });

    res.status(200).json(prescriptions);
  } catch (error) {
    logger.error('Error fetching prescriptions', { error });
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

// GET /prescriptions/:id - Get prescription by ID
router.get('/prescriptions/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const prescription = await prescriptionService.findById(req.params.id);

    if (!prescription) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }

    res.status(200).json(prescription);
  } catch (error) {
    logger.error('Error fetching prescription', { error });
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
});

// POST /prescriptions - Create prescription
router.post('/prescriptions', async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, medicineId, medicineName, dose, frequency, duration, diagnosis, doctorNotes, instructions, quantity, status } = req.body;

    if (!patientId || !doctorId) {
      res.status(400).json({
        error: 'patientId and doctorId are required',
      });
      return;
    }

    if (!medicineId && !medicineName) {
      res.status(400).json({
        error: 'Either medicineId or medicineName is required',
      });
      return;
    }

    const prescription = await prescriptionService.create({
      patientId,
      doctorId,
      medicineId,
      medicineName,
      dose,
      frequency,
      duration,
      diagnosis,
      doctorNotes,
      instructions,
      quantity,
      status,
    });

    res.status(201).json(prescription);
  } catch (error) {
    logger.error('Error creating prescription', { error });
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

// PATCH /prescriptions/:id - Update prescription
router.patch('/prescriptions/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const data = req.body;

    const existing = await prescriptionService.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }

    const prescription = await prescriptionService.update(req.params.id, data);
    res.status(200).json(prescription);
  } catch (error) {
    logger.error('Error updating prescription', { error });
    res.status(500).json({ error: 'Failed to update prescription' });
  }
});

// DELETE /prescriptions/:id - Delete prescription
router.delete('/prescriptions/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const existing = await prescriptionService.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }

    await prescriptionService.delete(req.params.id);
    res.status(200).json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    logger.error('Error deleting prescription', { error });
    res.status(500).json({ error: 'Failed to delete prescription' });
  }
});

export default router;
