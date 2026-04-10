import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { appointmentService } from '../services/appointment.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const AppointmentStatusEnum = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

const AppointmentTypeEnum = z.enum(['ONLINE', 'WALK_IN', 'FOLLOW_UP', 'EMERGENCY']);

const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  hospitalId: z.string().uuid(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format').optional(),
  type: AppointmentTypeEnum.optional(),
  reason: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

const updateStatusSchema = z.object({
  status: AppointmentStatusEnum,
  notes: z.string().max(2000).optional(),
});

const cancelAppointmentSchema = z.object({
  reason: z.string().min(1).max(1000),
});

const addToWaitlistSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  hospitalId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  priority: z.number().int().min(0).optional(),
});

// ── Appointment Routes ────────────────────────────────────

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { patientId, doctorId, hospitalId, status, date, page, limit } = req.query;
    const result = await appointmentService.findAll({
      patientId: patientId as string | undefined,
      doctorId: doctorId as string | undefined,
      hospitalId: hospitalId as string | undefined,
      status: status as string | undefined,
      date: date as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.get(
  '/doctor/:doctorId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!date) {
      res.status(400).json({ error: 'date query parameter is required' });
      return;
    }
    const appointments = await appointmentService.getByDoctor(
      req.params.doctorId,
      date as string,
    );
    res.json(appointments);
  }),
);

router.get(
  '/patient/:patientId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const appointments = await appointmentService.getByPatient(req.params.patientId);
    res.json(appointments);
  }),
);

router.get(
  '/waitlist/:doctorId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!date) {
      res.status(400).json({ error: 'date query parameter is required' });
      return;
    }
    const entries = await appointmentService.getWaitlist(
      req.params.doctorId,
      date as string,
    );
    res.json(entries);
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.findById(req.params.id);
    res.json(appointment);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('PATIENT', 'RECEPTIONIST', 'ADMIN'),
  validate(createAppointmentSchema),
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.create(req.body);
    res.status(201).json(appointment);
  }),
);

router.put(
  '/:id/status',
  requireAuth,
  requireRole('DOCTOR', 'ADMIN', 'RECEPTIONIST'),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.updateStatus(
      req.params.id,
      req.body.status,
      req.body.notes,
    );
    res.json(appointment);
  }),
);

router.put(
  '/:id/cancel',
  requireAuth,
  requireRole('PATIENT', 'ADMIN', 'RECEPTIONIST'),
  validate(cancelAppointmentSchema),
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.cancel(req.params.id, req.body.reason);
    res.json(appointment);
  }),
);

// ── Waitlist Routes ───────────────────────────────────────

router.post(
  '/waitlist',
  requireAuth,
  validate(addToWaitlistSchema),
  asyncHandler(async (req, res) => {
    const entry = await appointmentService.addToWaitlist(req.body);
    res.status(201).json(entry);
  }),
);

router.delete(
  '/waitlist/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await appointmentService.removeFromWaitlist(req.params.id);
    res.status(204).send();
  }),
);

export default router;
