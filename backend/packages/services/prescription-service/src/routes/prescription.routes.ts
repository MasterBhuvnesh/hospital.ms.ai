import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { prescriptionService } from '../services/prescription.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const prescriptionItemSchema = z.object({
  medicineName: z.string().min(1).max(200),
  medicineId: z.string().uuid().optional(),
  dosage: z.string().min(1).max(100),
  frequency: z.string().min(1).max(100),
  duration: z.string().min(1).max(100),
  instructions: z.string().max(500).optional(),
  quantity: z.number().int().positive(),
  isGeneric: z.boolean().optional(),
});

const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  consultationId: z.string().uuid().optional(),
  diagnosis: z.string().min(1).max(2000),
  notes: z.string().max(5000).optional(),
  items: z.array(prescriptionItemSchema).min(1),
});

const updatePrescriptionSchema = z.object({
  diagnosis: z.string().min(1).max(2000).optional(),
  notes: z.string().max(5000).nullable().optional(),
  appointmentId: z.string().uuid().nullable().optional(),
  consultationId: z.string().uuid().nullable().optional(),
});

const checkInteractionsSchema = z.object({
  drugNames: z.array(z.string().min(1)).min(2),
});

// ── Routes ─────────────────────────────────────────────

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { patientId, doctorId, status, page, limit } = req.query;
    const result = await prescriptionService.findAll({
      patientId: patientId as string | undefined,
      doctorId: doctorId as string | undefined,
      status: status as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

// ── Drug Interactions (before /:id to avoid param capture) ──

router.post(
  '/check-interactions',
  requireAuth,
  validate(checkInteractionsSchema),
  asyncHandler(async (req, res) => {
    const interactions = await prescriptionService.checkInteractions(req.body.drugNames);
    res.json(interactions);
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const prescription = await prescriptionService.findById(req.params.id);
    res.json(prescription);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('DOCTOR'),
  validate(createPrescriptionSchema),
  asyncHandler(async (req, res) => {
    const prescription = await prescriptionService.create(req.body);
    res.status(201).json(prescription);
  }),
);

router.put(
  '/:id',
  requireAuth,
  requireRole('DOCTOR'),
  validate(updatePrescriptionSchema),
  asyncHandler(async (req, res) => {
    const prescription = await prescriptionService.update(req.params.id, req.body);
    res.json(prescription);
  }),
);

router.put(
  '/:id/sign',
  requireAuth,
  requireRole('DOCTOR'),
  asyncHandler(async (req, res) => {
    const prescription = await prescriptionService.sign(req.params.id);
    res.json(prescription);
  }),
);

router.put(
  '/:id/dispense',
  requireAuth,
  requireRole('PHARMACIST'),
  asyncHandler(async (req, res) => {
    const prescription = await prescriptionService.dispense(req.params.id);
    res.json(prescription);
  }),
);

router.put(
  '/:id/cancel',
  requireAuth,
  requireRole('DOCTOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const prescription = await prescriptionService.cancel(req.params.id);
    res.json(prescription);
  }),
);

// ── Prescription Items ─────────────────────────────────

router.post(
  '/:id/items',
  requireAuth,
  requireRole('DOCTOR'),
  validate(prescriptionItemSchema),
  asyncHandler(async (req, res) => {
    const item = await prescriptionService.addItem(req.params.id, req.body);
    res.status(201).json(item);
  }),
);

router.delete(
  '/:id/items/:itemId',
  requireAuth,
  requireRole('DOCTOR'),
  asyncHandler(async (req, res) => {
    await prescriptionService.removeItem(req.params.itemId);
    res.status(204).send();
  }),
);

export default router;
