import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '@hms/common-middleware';
import { whatsappService } from '../services/whatsapp.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const sendMessageSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  message: z.string().min(1, 'Message is required'),
});

const appointmentConfirmationSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  doctorName: z.string().min(1, 'Doctor name is required'),
  dateTime: z.string().min(1, 'Date and time is required'),
  hospitalName: z.string().min(1, 'Hospital name is required'),
});

const appointmentReminderSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  doctorName: z.string().min(1, 'Doctor name is required'),
  dateTime: z.string().min(1, 'Date and time is required'),
  hospitalName: z.string().min(1, 'Hospital name is required'),
});

const queueUpdateSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  tokenNumber: z.string().min(1, 'Token number is required'),
  position: z.number().int().min(0, 'Position must be a non-negative integer'),
  doctorName: z.string().min(1, 'Doctor name is required'),
});

const prescriptionReadySchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  prescriptionId: z.string().min(1, 'Prescription ID is required'),
});

const labResultReadySchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  testName: z.string().min(1, 'Test name is required'),
});

// ── Routes ─────────────────────────────────────────────

// POST /messages/send — generic text message
router.post(
  '/send',
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const { phone, message } = req.body;
    const result = whatsappService.sendMessage(phone, message);
    res.status(200).json(result);
  }),
);

// POST /messages/appointment-confirmation
router.post(
  '/appointment-confirmation',
  validate(appointmentConfirmationSchema),
  asyncHandler(async (req, res) => {
    const { phone, patientName, doctorName, dateTime, hospitalName } = req.body;
    const result = whatsappService.sendAppointmentConfirmation(
      phone,
      patientName,
      doctorName,
      dateTime,
      hospitalName,
    );
    res.status(200).json(result);
  }),
);

// POST /messages/appointment-reminder
router.post(
  '/appointment-reminder',
  validate(appointmentReminderSchema),
  asyncHandler(async (req, res) => {
    const { phone, patientName, doctorName, dateTime, hospitalName } = req.body;
    const result = whatsappService.sendAppointmentReminder(
      phone,
      patientName,
      doctorName,
      dateTime,
      hospitalName,
    );
    res.status(200).json(result);
  }),
);

// POST /messages/queue-update
router.post(
  '/queue-update',
  validate(queueUpdateSchema),
  asyncHandler(async (req, res) => {
    const { phone, patientName, tokenNumber, position, doctorName } = req.body;
    const result = whatsappService.sendQueueUpdate(
      phone,
      patientName,
      tokenNumber,
      position,
      doctorName,
    );
    res.status(200).json(result);
  }),
);

// POST /messages/prescription-ready
router.post(
  '/prescription-ready',
  validate(prescriptionReadySchema),
  asyncHandler(async (req, res) => {
    const { phone, patientName, prescriptionId } = req.body;
    const result = whatsappService.sendPrescriptionReady(phone, patientName, prescriptionId);
    res.status(200).json(result);
  }),
);

// POST /messages/lab-result-ready
router.post(
  '/lab-result-ready',
  validate(labResultReadySchema),
  asyncHandler(async (req, res) => {
    const { phone, patientName, testName } = req.body;
    const result = whatsappService.sendLabResultReady(phone, patientName, testName);
    res.status(200).json(result);
  }),
);

export default router;
