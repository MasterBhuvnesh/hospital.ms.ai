import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { pharmacyService } from '../services/pharmacy.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const orderItemSchema = z.object({
  medicineId: z.string().uuid(),
  medicineName: z.string().min(1).max(200),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const createOrderSchema = z.object({
  patientId: z.string().uuid(),
  prescriptionId: z.string().uuid().optional(),
  hospitalId: z.string().uuid().optional(),
  deliveryType: z.enum(['PICKUP', 'HOME_DELIVERY']).optional(),
  deliveryAddress: z.string().max(500).optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  invoiceId: z.string().uuid().optional(),
  items: z.array(orderItemSchema).min(1),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
  ]),
});

const cancelOrderSchema = z.object({
  reason: z.string().max(1000).optional(),
});

// ── Routes ─────────────────────────────────────────────

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { patientId, status, page, limit } = req.query;
    const result = await pharmacyService.findAll({
      patientId: patientId as string | undefined,
      status: status as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

// ── Patient orders (before /:id to avoid param capture) ──

router.get(
  '/patient/:patientId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await pharmacyService.getByPatient(req.params.patientId);
    res.json(orders);
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await pharmacyService.findById(req.params.id);
    res.json(order);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('PHARMACIST', 'ADMIN'),
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const order = await pharmacyService.create(req.body);
    res.status(201).json(order);
  }),
);

router.put(
  '/:id/status',
  requireAuth,
  requireRole('PHARMACIST', 'ADMIN'),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const order = await pharmacyService.updateStatus(req.params.id, req.body.status);
    res.json(order);
  }),
);

router.put(
  '/:id/cancel',
  requireAuth,
  requireRole('PHARMACIST', 'ADMIN'),
  validate(cancelOrderSchema),
  asyncHandler(async (req, res) => {
    const order = await pharmacyService.cancel(req.params.id, req.body.reason);
    res.json(order);
  }),
);

export default router;
