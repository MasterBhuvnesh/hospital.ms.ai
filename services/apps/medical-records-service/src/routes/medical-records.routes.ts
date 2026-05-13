import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { serviceInfo } from '../info/requests';
import {
  uploadMedicalRecord,
  getMedicalRecordsByPatient,
  getMedicalRecordById,
  deleteMedicalRecord,
} from '../services/medical-records.service';

const router: Router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(serviceInfo);
});

router.post('/medical-records/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const patientId = req.body.patientId as string;

    if (!patientId) {
      res.status(400).json({ error: 'patientId is required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file provided. Use field name "file"' });
      return;
    }

    const record = await uploadMedicalRecord(patientId, req.file);
    res.status(201).json(record);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to upload medical record', details: error.message });
  }
});

router.get('/medical-records', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      res.status(400).json({ error: 'patientId query param is required' });
      return;
    }

    const records = await getMedicalRecordsByPatient(patientId as string);
    res.status(200).json(records);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch medical records', details: error.message });
  }
});

router.get('/medical-records/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const record = await getMedicalRecordById(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Medical record not found' });
      return;
    }
    res.status(200).json(record);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch medical record', details: error.message });
  }
});

router.delete('/medical-records/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const record = await deleteMedicalRecord(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Medical record not found' });
      return;
    }
    res.status(200).json({ message: 'Medical record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete medical record', details: error.message });
  }
});

export default router;
