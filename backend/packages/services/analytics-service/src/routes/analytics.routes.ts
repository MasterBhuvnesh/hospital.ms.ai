import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { analyticsService } from '../services/analytics.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const upsertDailyMetricSchema = z.object({
  hospitalId: z.string().uuid().optional(),
  date: z.string().date(),
  totalPatients: z.number().int().min(0).optional(),
  totalConsultations: z.number().int().min(0).optional(),
  totalAppointments: z.number().int().min(0).optional(),
  noShows: z.number().int().min(0).optional(),
  avgWaitTimeMins: z.number().min(0).optional(),
  avgConsultMins: z.number().min(0).optional(),
  revenue: z.number().min(0).optional(),
});

const upsertDoctorMetricSchema = z.object({
  doctorId: z.string().uuid(),
  hospitalId: z.string().uuid().optional(),
  date: z.string().date(),
  patientsSeen: z.number().int().min(0).optional(),
  avgConsultMins: z.number().min(0).optional(),
  avgRating: z.number().min(0).max(5).optional(),
  revenue: z.number().min(0).optional(),
});

const upsertQueueStatSchema = z.object({
  hospitalId: z.string().uuid(),
  doctorId: z.string().uuid().optional(),
  date: z.string().date(),
  hour: z.number().int().min(0).max(23),
  tokensIssued: z.number().int().min(0).optional(),
  avgWaitMins: z.number().min(0).optional(),
  peakQueueSize: z.number().int().min(0).optional(),
});

// ── Daily Metrics ──────────────────────────────────────

router.get(
  '/daily',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { hospitalId, startDate, endDate, page, limit } = req.query;
    const result = await analyticsService.getDailyMetrics({
      hospitalId: hospitalId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.post(
  '/daily',
  requireAuth,
  requireRole('ADMIN'),
  validate(upsertDailyMetricSchema),
  asyncHandler(async (req, res) => {
    const metric = await analyticsService.upsertDailyMetric(req.body);
    res.status(201).json(metric);
  }),
);

// ── Doctor Metrics ─────────────────────────────────────

router.get(
  '/doctors',
  requireAuth,
  requireRole('ADMIN', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const { doctorId, hospitalId, startDate, endDate, page, limit } = req.query;
    const result = await analyticsService.getDoctorMetrics({
      doctorId: doctorId as string | undefined,
      hospitalId: hospitalId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.post(
  '/doctors',
  requireAuth,
  requireRole('ADMIN'),
  validate(upsertDoctorMetricSchema),
  asyncHandler(async (req, res) => {
    const metric = await analyticsService.upsertDoctorMetric(req.body);
    res.status(201).json(metric);
  }),
);

// ── Queue Stats ────────────────────────────────────────

router.get(
  '/queue-stats',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { hospitalId, doctorId, startDate, endDate, page, limit } = req.query;
    const result = await analyticsService.getQueueStats({
      hospitalId: hospitalId as string | undefined,
      doctorId: doctorId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.post(
  '/queue-stats',
  requireAuth,
  requireRole('ADMIN'),
  validate(upsertQueueStatSchema),
  asyncHandler(async (req, res) => {
    const stat = await analyticsService.upsertQueueStat(req.body);
    res.status(201).json(stat);
  }),
);

// ── Dashboard ──────────────────────────────────────────

router.get(
  '/dashboard/:hospitalId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { hospitalId } = req.params;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const summary = await analyticsService.getDashboardSummary(hospitalId, date);
    res.json(summary);
  }),
);

export default router;
