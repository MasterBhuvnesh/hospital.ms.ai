import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { labTestService } from '../services/lab-test.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const createLabTestSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(100),
  price: z.number().positive(),
  preparationInstructions: z.string().max(2000).optional(),
  durationHours: z.number().int().min(1),
  sampleType: z.string().min(1).max(100),
});

const updateLabTestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().min(1).max(50).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().min(1).max(100).optional(),
  price: z.number().positive().optional(),
  preparationInstructions: z.string().max(2000).nullable().optional(),
  durationHours: z.number().int().min(1).optional(),
  sampleType: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

const createBookingSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid().optional(),
  testId: z.string().uuid(),
  hospitalId: z.string().uuid().optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format').optional(),
  collectionType: z.enum(['LAB_VISIT', 'HOME_COLLECTION']).optional(),
  collectionAddress: z.string().max(500).optional(),
});

const updateBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

const createPackageSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().positive(),
  discount: z.number().min(0).max(100).optional(),
  testIds: z.array(z.string().uuid()).min(1),
});

// ── Public LabTest Routes ─────────────────────────────

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, page, limit } = req.query;
    const result = await labTestService.findAllTests({
      category: category as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.get(
  '/packages',
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await labTestService.findAllPackages({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.get(
  '/bookings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { patientId, status, page, limit } = req.query;
    const result = await labTestService.findAllBookings({
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
  asyncHandler(async (req, res) => {
    const test = await labTestService.findTestById(req.params.id);
    res.json(test);
  }),
);

// ── Admin LabTest CRUD ────────────────────────────────

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createLabTestSchema),
  asyncHandler(async (req, res) => {
    const test = await labTestService.createTest(req.body);
    res.status(201).json(test);
  }),
);

router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateLabTestSchema),
  asyncHandler(async (req, res) => {
    const test = await labTestService.updateTest(req.params.id, req.body);
    res.json(test);
  }),
);

// ── Booking Routes ────────────────────────────────────

router.post(
  '/bookings',
  requireAuth,
  validate(createBookingSchema),
  asyncHandler(async (req, res) => {
    const booking = await labTestService.createBooking(req.body);
    res.status(201).json(booking);
  }),
);

router.put(
  '/bookings/:id/status',
  requireAuth,
  requireRole('LAB_TECHNICIAN', 'ADMIN'),
  validate(updateBookingStatusSchema),
  asyncHandler(async (req, res) => {
    const booking = await labTestService.updateBookingStatus(req.params.id, req.body.status);
    res.json(booking);
  }),
);

// ── Package Routes ────────────────────────────────────

router.post(
  '/packages',
  requireAuth,
  requireRole('ADMIN'),
  validate(createPackageSchema),
  asyncHandler(async (req, res) => {
    const pkg = await labTestService.createPackage(req.body);
    res.status(201).json(pkg);
  }),
);

export default router;
