import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { labResultService } from '../services/lab-result.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const createResultSchema = z.object({
  bookingId: z.string().uuid(),
  patientId: z.string().uuid(),
  testId: z.string().uuid(),
  doctorId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  isCritical: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const addValuesSchema = z.object({
  values: z.array(
    z.object({
      parameterName: z.string().min(1).max(200),
      value: z.string().min(1),
      unit: z.string().max(50).optional(),
      normalMin: z.number().optional(),
      normalMax: z.number().optional(),
      isAbnormal: z.boolean().optional(),
    }),
  ).min(1),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'VERIFIED', 'DELIVERED']),
});

// ── Routes ─────────────────────────────────────────────

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { patientId, status, page, limit } = req.query;
    const result = await labResultService.findAll({
      patientId: patientId as string | undefined,
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
    const result = await labResultService.findById(req.params.id);
    res.json(result);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('LAB_TECHNICIAN'),
  validate(createResultSchema),
  asyncHandler(async (req, res) => {
    const result = await labResultService.create(req.body);
    res.status(201).json(result);
  }),
);

router.post(
  '/:id/values',
  requireAuth,
  requireRole('LAB_TECHNICIAN'),
  validate(addValuesSchema),
  asyncHandler(async (req, res) => {
    const result = await labResultService.addValues(req.params.id, req.body.values);
    res.json(result);
  }),
);

router.put(
  '/:id/status',
  requireAuth,
  requireRole('LAB_TECHNICIAN', 'ADMIN'),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const result = await labResultService.updateStatus(req.params.id, req.body.status);
    res.json(result);
  }),
);

router.put(
  '/:id/verify',
  requireAuth,
  requireRole('DOCTOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const result = await labResultService.verify(req.params.id, req.user!.userId);
    res.json(result);
  }),
);

router.put(
  '/:id/deliver',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await labResultService.markDelivered(req.params.id);
    res.json(result);
  }),
);

export default router;
