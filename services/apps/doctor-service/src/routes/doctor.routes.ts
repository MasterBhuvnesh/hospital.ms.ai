import { Router, type Request, type Response } from 'express';
import { serviceInfo } from '../info/requests';
import {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from '../services/doctor.service';

const router: Router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(serviceInfo);
});

router.get('/doctors', async (_req: Request, res: Response) => {
  try {
    const doctors = await getAllDoctors();
    res.status(200).json(doctors);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/doctors/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const doctor = await getDoctorById(req.params.id);
    res.status(200).json(doctor);
  } catch (error: any) {
    if (error.message === 'Doctor not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.post('/doctors', async (req: Request, res: Response) => {
  try {
    const { userId, firstName, lastName, specialization, licenseNumber, phone } = req.body;

    if (!userId || !firstName || !lastName || !licenseNumber) {
      res.status(400).json({
        error: 'Missing required fields: userId, firstName, lastName, licenseNumber',
      });
      return;
    }

    const doctor = await createDoctor({
      userId,
      firstName,
      lastName,
      specialization,
      licenseNumber,
      phone,
    });
    res.status(201).json(doctor);
  } catch (error: any) {
    if (error.message === 'Doctor profile already exists for this user') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.patch('/doctors/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { firstName, lastName, specialization, licenseNumber, phone } = req.body;

    const doctor = await updateDoctor(req.params.id, {
      firstName,
      lastName,
      specialization,
      licenseNumber,
      phone,
    });
    res.status(200).json(doctor);
  } catch (error: any) {
    if (error.message === 'Doctor not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.delete('/doctors/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const result = await deleteDoctor(req.params.id);
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message === 'Doctor not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
