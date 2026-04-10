import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { patientSheetService } from '../services/patient-sheet.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const createSheetSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  queueTokenId: z.string().uuid().optional(),
  content: z.record(z.any()),
});

const updateStatusSchema = z.object({
  status: z.enum(['GENERATING', 'READY', 'DELIVERED', 'VIEWED']),
});

// ── Routes ─────────────────────────────────────────────

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { doctorId, patientId, status, page, limit } = req.query;
    const result = await patientSheetService.findAll({
      doctorId: doctorId as string | undefined,
      patientId: patientId as string | undefined,
      status: status as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

// ── By Doctor (before /:id to avoid param capture) ────

router.get(
  '/doctor/:doctorId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const sheets = await patientSheetService.getByDoctor(
      req.params.doctorId,
      status as string | undefined,
    );
    res.json(sheets);
  }),
);

// ── By Patient (before /:id to avoid param capture) ───

router.get(
  '/patient/:patientId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sheets = await patientSheetService.getByPatient(req.params.patientId);
    res.json(sheets);
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sheet = await patientSheetService.findById(req.params.id);
    res.json(sheet);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('DOCTOR', 'ADMIN'),
  validate(createSheetSchema),
  asyncHandler(async (req, res) => {
    const sheet = await patientSheetService.create(req.body);
    res.status(201).json(sheet);
  }),
);

router.put(
  '/:id/status',
  requireAuth,
  requireRole('DOCTOR', 'ADMIN'),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const sheet = await patientSheetService.updateStatus(req.params.id, req.body.status);
    res.json(sheet);
  }),
);

export default router;
