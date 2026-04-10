import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { queueService } from '../services/queue.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const generateTokenSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  hospitalId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  queueType: z.enum(['OPD', 'EMERGENCY', 'FOLLOW_UP']).optional(),
  priority: z.enum(['NORMAL', 'ELDERLY', 'PREGNANT', 'DISABLED', 'EMERGENCY']).optional(),
});

const callNextSchema = z.object({
  doctorId: z.string().uuid(),
  hospitalId: z.string().uuid(),
});

const updateStatusSchema = z.object({
  status: z.enum(['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED']),
});

const upsertConfigSchema = z.object({
  hospitalId: z.string().uuid(),
  doctorId: z.string().uuid(),
  tokenPrefix: z.string().min(1).max(10).optional(),
  avgConsultationMins: z.number().int().min(1).max(120).optional(),
  maxQueueSize: z.number().int().min(1).max(500).optional(),
  notifyBeforePositions: z.number().int().min(1).max(20).optional(),
});

// ── Public Routes ──────────────────────────────────────

// Get token status + estimated wait (must be before /:doctorId/:hospitalId)
router.get(
  '/token/:tokenId',
  asyncHandler(async (req, res) => {
    const token = await queueService.getTokenStatus(req.params.tokenId);
    res.json(token);
  }),
);

// Get config (must be before /:doctorId/:hospitalId)
router.get(
  '/config/:hospitalId/:doctorId',
  asyncHandler(async (req, res) => {
    const config = await queueService.getConfig(req.params.hospitalId, req.params.doctorId);
    if (!config) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    res.json(config);
  }),
);

// Get live queue for a doctor at a hospital
router.get(
  '/:doctorId/:hospitalId',
  asyncHandler(async (req, res) => {
    const queue = await queueService.getQueue(req.params.doctorId, req.params.hospitalId);
    res.json(queue);
  }),
);

// ── Protected Routes ───────────────────────────────────

// Generate new token
router.post(
  '/token',
  requireAuth,
  requireRole('RECEPTIONIST', 'ADMIN'),
  validate(generateTokenSchema),
  asyncHandler(async (req, res) => {
    const token = await queueService.generateToken(req.body);
    res.status(201).json(token);
  }),
);

// Call next patient
router.post(
  '/call-next',
  requireAuth,
  requireRole('DOCTOR'),
  validate(callNextSchema),
  asyncHandler(async (req, res) => {
    const token = await queueService.callNext(req.body.doctorId, req.body.hospitalId);
    res.json(token);
  }),
);

// Update token status
router.put(
  '/:tokenId/status',
  requireAuth,
  requireRole('DOCTOR', 'ADMIN'),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const token = await queueService.updateStatus(req.params.tokenId, req.body.status);
    res.json(token);
  }),
);

// Skip token
router.put(
  '/:tokenId/skip',
  requireAuth,
  requireRole('DOCTOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const token = await queueService.skipToken(req.params.tokenId);
    res.json(token);
  }),
);

// Complete token
router.put(
  '/:tokenId/complete',
  requireAuth,
  requireRole('DOCTOR'),
  asyncHandler(async (req, res) => {
    const token = await queueService.completeToken(req.params.tokenId);
    res.json(token);
  }),
);

// Upsert config
router.put(
  '/config',
  requireAuth,
  requireRole('ADMIN'),
  validate(upsertConfigSchema),
  asyncHandler(async (req, res) => {
    const config = await queueService.upsertConfig(req.body);
    res.json(config);
  }),
);

export default router;
