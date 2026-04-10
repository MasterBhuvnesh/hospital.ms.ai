import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '@hms/common-middleware';
import { emailService } from '../services/email.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  html: z.string().min(1),
  text: z.string().optional(),
});

const appointmentSchema = z.object({
  to: z.string().email(),
  patientName: z.string().min(1),
  doctorName: z.string().min(1),
  dateTime: z.string().min(1),
  hospitalName: z.string().min(1),
});

const prescriptionReadySchema = z.object({
  to: z.string().email(),
  patientName: z.string().min(1),
  prescriptionId: z.string().min(1),
});

const labResultReadySchema = z.object({
  to: z.string().email(),
  patientName: z.string().min(1),
  testName: z.string().min(1),
});

const welcomeSchema = z.object({
  to: z.string().email(),
  name: z.string().min(1),
});

// ── Routes ─────────────────────────────────────────────

router.post(
  '/send',
  validate(sendEmailSchema),
  asyncHandler(async (req, res) => {
    const { to, subject, html, text } = req.body;
    const messageId = await emailService.sendEmail(to, subject, html, text);
    res.status(200).json({ success: true, messageId });
  }),
);

router.post(
  '/appointment-confirmation',
  validate(appointmentSchema),
  asyncHandler(async (req, res) => {
    const { to, patientName, doctorName, dateTime, hospitalName } = req.body;
    const messageId = await emailService.sendAppointmentConfirmation(
      to,
      patientName,
      doctorName,
      dateTime,
      hospitalName,
    );
    res.status(200).json({ success: true, messageId });
  }),
);

router.post(
  '/appointment-reminder',
  validate(appointmentSchema),
  asyncHandler(async (req, res) => {
    const { to, patientName, doctorName, dateTime, hospitalName } = req.body;
    const messageId = await emailService.sendAppointmentReminder(
      to,
      patientName,
      doctorName,
      dateTime,
      hospitalName,
    );
    res.status(200).json({ success: true, messageId });
  }),
);

router.post(
  '/prescription-ready',
  validate(prescriptionReadySchema),
  asyncHandler(async (req, res) => {
    const { to, patientName, prescriptionId } = req.body;
    const messageId = await emailService.sendPrescriptionReady(
      to,
      patientName,
      prescriptionId,
    );
    res.status(200).json({ success: true, messageId });
  }),
);

router.post(
  '/lab-result-ready',
  validate(labResultReadySchema),
  asyncHandler(async (req, res) => {
    const { to, patientName, testName } = req.body;
    const messageId = await emailService.sendLabResultReady(
      to,
      patientName,
      testName,
    );
    res.status(200).json({ success: true, messageId });
  }),
);

router.post(
  '/welcome',
  validate(welcomeSchema),
  asyncHandler(async (req, res) => {
    const { to, name } = req.body;
    const messageId = await emailService.sendWelcome(to, name);
    res.status(200).json({ success: true, messageId });
  }),
);

export default router;
