import { Router, type Request, type Response } from 'express';
import { serviceInfo } from '../info/requests';
import {
  generatePharmacyBill,
  generateAppointmentBill,
  generatePrescriptionPdf,
  type PharmacyBillInput,
  type AppointmentBillInput,
  type PrescriptionInput,
} from '../services/pdf.service';
import {
  uploadAndSaveDocument,
  getDocumentsByType,
  getDocumentsByPatient,
  getDocumentById,
} from '../services/document.service';

const router: Router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(serviceInfo);
});

// Generate pharmacy bill → upload to Cloudinary → save URL in DB
router.post('/pdf/pharmacy-bill', async (req: Request, res: Response) => {
  try {
    const input: PharmacyBillInput = req.body;

    if (!input.billNumber || !input.patientName || !input.items || !input.grandTotal) {
      res.status(400).json({ error: 'billNumber, patientName, items, and grandTotal are required' });
      return;
    }

    const pdfBuffer = await generatePharmacyBill(input);
    const fileName = `pharmacy-bill-${input.billNumber}.pdf`;

    const document = await uploadAndSaveDocument({
      type: 'pharmacy-bill',
      referenceId: input.billNumber,
      patientId: (req.body as any).patientId,
      fileName,
      pdfBuffer,
    });

    res.status(201).json(document);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate pharmacy bill', details: error.message });
  }
});

// Generate appointment bill → upload → save
router.post('/pdf/appointment-bill', async (req: Request, res: Response) => {
  try {
    const input: AppointmentBillInput = req.body;

    if (!input.billNumber || !input.patientName || !input.doctorName || !input.grandTotal) {
      res.status(400).json({ error: 'billNumber, patientName, doctorName, and grandTotal are required' });
      return;
    }

    const pdfBuffer = await generateAppointmentBill(input);
    const fileName = `appointment-bill-${input.billNumber}.pdf`;

    const document = await uploadAndSaveDocument({
      type: 'appointment-bill',
      referenceId: input.billNumber,
      patientId: (req.body as any).patientId,
      doctorId: (req.body as any).doctorId,
      fileName,
      pdfBuffer,
    });

    res.status(201).json(document);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate appointment bill', details: error.message });
  }
});

// Generate prescription PDF → upload → save
router.post('/pdf/prescription', async (req: Request, res: Response) => {
  try {
    const input: PrescriptionInput = req.body;

    if (!input.prescriptionId || !input.patientName || !input.doctorName || !input.medicines) {
      res.status(400).json({ error: 'prescriptionId, patientName, doctorName, and medicines are required' });
      return;
    }

    const pdfBuffer = await generatePrescriptionPdf(input);
    const fileName = `prescription-${input.prescriptionId}.pdf`;

    const document = await uploadAndSaveDocument({
      type: 'prescription',
      referenceId: input.prescriptionId,
      patientId: (req.body as any).patientId,
      doctorId: (req.body as any).doctorId,
      fileName,
      pdfBuffer,
    });

    res.status(201).json(document);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate prescription PDF', details: error.message });
  }
});

// GET documents
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const { type, patientId } = req.query;

    if (patientId) {
      const docs = await getDocumentsByPatient(patientId as string);
      res.status(200).json(docs);
      return;
    }

    if (type) {
      const docs = await getDocumentsByType(type as string);
      res.status(200).json(docs);
      return;
    }

    res.status(400).json({ error: 'Provide ?type or ?patientId query param' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

router.get('/documents/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const document = await getDocumentById(req.params.id);
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.status(200).json(document);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch document', details: error.message });
  }
});

export default router;
