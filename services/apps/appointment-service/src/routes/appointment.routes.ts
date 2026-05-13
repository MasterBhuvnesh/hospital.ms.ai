import { Router, type Request, type Response } from 'express';
import { serviceInfo } from '../info/requests';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../services/appointment.service';

const router: Router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(serviceInfo);
});

router.get('/appointments', async (req: Request, res: Response) => {
  try {
    const patientId = req.query.patientId as string | undefined;
    const doctorId = req.query.doctorId as string | undefined;
    const appointments = await getAppointments(patientId, doctorId);
    res.status(200).json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch appointments', details: error.message });
  }
});

router.get('/appointments/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const appointment = await getAppointmentById(req.params.id);
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    res.status(200).json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch appointment', details: error.message });
  }
});

router.post('/appointments', async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, date, time, slot, type, notes, fee, status } = req.body;
    if (!patientId || !doctorId || !date) {
      res.status(400).json({ error: 'patientId, doctorId, and date are required' });
      return;
    }
    const appointment = await createAppointment({ patientId, doctorId, date, time, slot, type, notes, fee, status });
    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create appointment', details: error.message });
  }
});

router.put('/appointments/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }
    const appointment = await updateAppointment(req.params.id, { status });
    res.status(200).json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update appointment', details: error.message });
  }
});

router.delete('/appointments/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await deleteAppointment(req.params.id);
    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete appointment', details: error.message });
  }
});

export default router;
