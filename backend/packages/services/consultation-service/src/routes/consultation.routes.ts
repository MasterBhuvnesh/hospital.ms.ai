import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { consultationService } from '../services/consultation.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const ConsultationStatusEnum = z.enum(['WAITING', 'WITH_DOCTOR', 'COMPLETED', 'CANCELLED']);

const createConsultationSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  hospitalId: z.string().uuid(),
  isPriority: z.boolean().optional(),
});

const updateStatusSchema = z.object({
  status: ConsultationStatusEnum,
});

const addNoteSchema = z.object({
  subjective: z.string().max(5000).optional(),
  objective: z.string().max(5000).optional(),
  assessment: z.string().max(5000).optional(),
  plan: z.string().max(5000).optional(),
  additionalNotes: z.string().max(5000).optional(),
});

const updateNoteSchema = z.object({
  subjective: z.string().max(5000).optional(),
  objective: z.string().max(5000).optional(),
  assessment: z.string().max(5000).optional(),
  plan: z.string().max(5000).optional(),
  additionalNotes: z.string().max(5000).optional(),
});

const recordVitalsSchema = z.object({
  temperature: z.number().min(30).max(45).optional(),
  bloodPressureSystolic: z.number().int().min(50).max(300).optional(),
  bloodPressureDiastolic: z.number().int().min(20).max(200).optional(),
  heartRate: z.number().int().min(20).max(300).optional(),
  respiratoryRate: z.number().int().min(5).max(60).optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  weight: z.number().min(0.5).max(500).optional(),
  height: z.number().min(20).max(300).optional(),
});

// ── List & Detail (Auth Required) ─────────────────────

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { doctorId, patientId, hospitalId, status, page, limit } = req.query;
    const result = await consultationService.findAll({
      doctorId: doctorId as string | undefined,
      patientId: patientId as string | undefined,
      hospitalId: hospitalId as string | undefined,
      status: status as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const consultation = await consultationService.findById(req.params.id);
    res.json(consultation);
  }),
);

// ── Create Consultation ───────────────────────────────

router.post(
  '/',
  requireAuth,
  requireRole('DOCTOR', 'ADMIN', 'RECEPTIONIST'),
  validate(createConsultationSchema),
  asyncHandler(async (req, res) => {
    const consultation = await consultationService.create(req.body);
    res.status(201).json(consultation);
  }),
);

// ── Update Status ─────────────────────────────────────

router.put(
  '/:id/status',
  requireAuth,
  requireRole('DOCTOR'),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const consultation = await consultationService.updateStatus(req.params.id, req.body.status);
    res.json(consultation);
  }),
);

// ── SOAP Notes ────────────────────────────────────────

router.post(
  '/:id/notes',
  requireAuth,
  requireRole('DOCTOR'),
  validate(addNoteSchema),
  asyncHandler(async (req, res) => {
    const note = await consultationService.addNote(req.params.id, req.body);
    res.status(201).json(note);
  }),
);

router.put(
  '/:id/notes/:noteId',
  requireAuth,
  requireRole('DOCTOR'),
  validate(updateNoteSchema),
  asyncHandler(async (req, res) => {
    const note = await consultationService.updateNote(req.params.noteId, req.body);
    res.json(note);
  }),
);

// ── Vitals ────────────────────────────────────────────

router.post(
  '/:id/vitals',
  requireAuth,
  requireRole('DOCTOR', 'LAB_TECHNICIAN'),
  validate(recordVitalsSchema),
  asyncHandler(async (req, res) => {
    const vital = await consultationService.recordVitals(req.params.id, req.body);
    res.status(201).json(vital);
  }),
);

export default router;
