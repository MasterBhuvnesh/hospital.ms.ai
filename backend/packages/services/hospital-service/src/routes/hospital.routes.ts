import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import {
  hospitalService,
  hospitalServiceService,
  hospitalTimingService,
  hospitalHolidayService,
} from '../services/hospital.service.js';

const router: IRouter = Router();

// ── Validation Schemas ─────────────────────────────────

const createHospitalSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  totalBeds: z.number().int().min(0).optional(),
  availableBeds: z.number().int().min(0).optional(),
  icuBeds: z.number().int().min(0).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const updateHospitalSchema = createHospitalSchema.partial();

const DayOfWeekEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

const addServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const setTimingsSchema = z.object({
  timings: z.array(
    z.object({
      dayOfWeek: DayOfWeekEnum,
      openTime: z.string().min(1),
      closeTime: z.string().min(1),
      isClosed: z.boolean().optional(),
    }),
  ).min(1),
});

const addHolidaySchema = z.object({
  date: z.coerce.date(),
  name: z.string().min(1),
});

// ── Hospital Routes ────────────────────────────────────

// GET / — list hospitals (public)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { city, state, page, limit } = req.query as Record<string, string | undefined>;
    const result = await hospitalService.findAll({
      city,
      state,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.json(result);
  }),
);

// GET /:id — single hospital with all relations (public)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const hospital = await hospitalService.findById(req.params.id);
    res.json({ data: hospital });
  }),
);

// POST / — create hospital (ADMIN)
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createHospitalSchema),
  asyncHandler(async (req, res) => {
    const hospital = await hospitalService.create(req.body);
    res.status(201).json({ data: hospital });
  }),
);

// PUT /:id — update hospital (ADMIN)
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateHospitalSchema),
  asyncHandler(async (req, res) => {
    const hospital = await hospitalService.update(req.params.id, req.body);
    res.json({ data: hospital });
  }),
);

// DELETE /:id — soft delete hospital (ADMIN)
router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await hospitalService.delete(req.params.id);
    res.json({ message: 'Hospital deleted' });
  }),
);

// ── Hospital Services (offerings) ──────────────────────

// POST /:id/services — add a service to hospital (ADMIN)
router.post(
  '/:id/services',
  requireAuth,
  requireRole('ADMIN'),
  validate(addServiceSchema),
  asyncHandler(async (req, res) => {
    const service = await hospitalServiceService.create({
      hospitalId: req.params.id,
      ...req.body,
    });
    res.status(201).json({ data: service });
  }),
);

// ── Hospital Timings ───────────────────────────────────

// POST /:id/timings — set timings for a hospital (ADMIN)
router.post(
  '/:id/timings',
  requireAuth,
  requireRole('ADMIN'),
  validate(setTimingsSchema),
  asyncHandler(async (req, res) => {
    const timings = await hospitalTimingService.bulkUpsert(
      req.params.id,
      req.body.timings,
    );
    res.status(201).json({ data: timings });
  }),
);

// ── Hospital Holidays ──────────────────────────────────

// POST /:id/holidays — add a holiday (ADMIN)
router.post(
  '/:id/holidays',
  requireAuth,
  requireRole('ADMIN'),
  validate(addHolidaySchema),
  asyncHandler(async (req, res) => {
    const holiday = await hospitalHolidayService.create({
      hospitalId: req.params.id,
      ...req.body,
    });
    res.status(201).json({ data: holiday });
  }),
);

export default router;
