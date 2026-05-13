import { Router, type Request, type Response } from 'express';
import { serviceInfo } from '../info/requests';
import {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} from '../services/patient.service';

const router: Router = Router();

// GET / - Service info
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(serviceInfo);
});

// GET /patients - List all patients
router.get('/patients', async (_req: Request, res: Response) => {
  try {
    const patients = await getAllPatients();
    res.status(200).json(patients);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch patients', details: error.message });
  }
});

// GET /patients/:id - Get patient by ID
router.get('/patients/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const patient = await getPatientById(req.params.id);
    res.status(200).json(patient);
  } catch (error: any) {
    if (error.message === 'Patient not found') {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch patient', details: error.message });
  }
});

// POST /patients - Create patient (supports walk-in)
router.post('/patients', async (req: Request, res: Response) => {
  try {
    const { userId, firstName, lastName, dob, gender, phone, vitals } = req.body;

    if (!firstName || !lastName || !dob || !gender) {
      return res.status(400).json({ error: 'firstName, lastName, dob, and gender are required' });
    }

    const patient = await createPatient({
      userId,
      firstName,
      lastName,
      dob,
      gender,
      phone,
      vitals,
    });

    res.status(201).json(patient);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create patient', details: error.message });
  }
});

// PATCH /patients/:id - Update patient
router.patch('/patients/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { firstName, lastName, dob, gender, phone, vitals } = req.body;
    const patient = await updatePatient(req.params.id, { firstName, lastName, dob, gender, phone, vitals });
    res.status(200).json(patient);
  } catch (error: any) {
    if (error.message === 'Patient not found') {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update patient', details: error.message });
  }
});

// DELETE /patients/:id - Delete patient with cascade
router.delete('/patients/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const result = await deletePatient(req.params.id);
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message === 'Patient not found') {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete patient', details: error.message });
  }
});

export default router;
