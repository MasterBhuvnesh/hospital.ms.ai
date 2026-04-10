import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { doctorService } from '../services/doctor.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const DayOfWeekEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

const createDoctorSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  specialization: z.string().min(1).max(200),
  qualification: z.string().min(1).max(200),
  experienceYears: z.number().int().min(0),
  fees: z.number().positive(),
  hospitalId: z.string().uuid().optional(),
  bio: z.string().max(2000).optional(),
  profileImageUrl: z.string().url().optional(),
});

const updateDoctorSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  specialization: z.string().min(1).max(200).optional(),
  qualification: z.string().min(1).max(200).optional(),
  experienceYears: z.number().int().min(0).optional(),
  fees: z.number().positive().optional(),
  hospitalId: z.string().uuid().nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
});

const setScheduleSchema = z.object({
  dayOfWeek: DayOfWeekEnum,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format'),
  slotDuration: z.number().int().min(5).max(120).optional(),
  isAvailable: z.boolean().optional(),
});

const updateScheduleSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format').optional(),
  slotDuration: z.number().int().min(5).max(120).optional(),
  isAvailable: z.boolean().optional(),
});

const recordAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  checkInTime: z.string().datetime().optional(),
  checkOutTime: z.string().datetime().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY']),
});

const requestLeaveSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  type: z.enum(['SICK', 'VACATION', 'PERSONAL', 'EMERGENCY']),
  reason: z.string().max(1000).optional(),
});

const updateLeaveStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

// ── Public Routes ──────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { specialization, hospitalId, page, limit } = req.query;
    const result = await doctorService.findAll({
      specialization: specialization as string | undefined,
      hospitalId: hospitalId as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doctor = await doctorService.findById(req.params.id);
    res.json(doctor);
  }),
);

router.get(
  '/:id/schedule',
  asyncHandler(async (req, res) => {
    const schedules = await doctorService.getSchedule(req.params.id);
    res.json(schedules);
  }),
);

// ── Doctor CRUD (Auth Required) ────────────────────────

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createDoctorSchema),
  asyncHandler(async (req, res) => {
    const doctor = await doctorService.create(req.body);
    res.status(201).json(doctor);
  }),
);

router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'DOCTOR'),
  validate(updateDoctorSchema),
  asyncHandler(async (req, res) => {
    const doctor = await doctorService.update(req.params.id, req.body);
    res.json(doctor);
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await doctorService.delete(req.params.id);
    res.status(204).send();
  }),
);

// ── Schedule Management (Auth Required) ────────────────

router.post(
  '/:id/schedule',
  requireAuth,
  requireRole('ADMIN', 'DOCTOR'),
  validate(setScheduleSchema),
  asyncHandler(async (req, res) => {
    const schedule = await doctorService.setSchedule(req.params.id, req.body);
    res.status(201).json(schedule);
  }),
);

router.put(
  '/:id/schedule/:scheduleId',
  requireAuth,
  requireRole('ADMIN', 'DOCTOR'),
  validate(updateScheduleSchema),
  asyncHandler(async (req, res) => {
    const schedule = await doctorService.updateSchedule(
      req.params.id,
      req.params.scheduleId,
      req.body,
    );
    res.json(schedule);
  }),
);

// ── Attendance (Auth Required) ─────────────────────────

router.post(
  '/:id/attendance',
  requireAuth,
  requireRole('ADMIN', 'DOCTOR'),
  validate(recordAttendanceSchema),
  asyncHandler(async (req, res) => {
    const attendance = await doctorService.recordAttendance(req.params.id, req.body);
    res.status(201).json(attendance);
  }),
);

router.get(
  '/:id/attendance',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, page, limit } = req.query;
    const result = await doctorService.getAttendance(req.params.id, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

// ── Leaves (Auth Required) ─────────────────────────────

router.post(
  '/:id/leaves',
  requireAuth,
  requireRole('DOCTOR'),
  validate(requestLeaveSchema),
  asyncHandler(async (req, res) => {
    const leave = await doctorService.requestLeave(req.params.id, req.body);
    res.status(201).json(leave);
  }),
);

router.get(
  '/:id/leaves',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query;
    const result = await doctorService.getLeaves(req.params.id, {
      status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.put(
  '/:id/leaves/:leaveId',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateLeaveStatusSchema),
  asyncHandler(async (req, res) => {
    const leave = await doctorService.updateLeaveStatus(
      req.params.id,
      req.params.leaveId,
      req.body.status,
    );
    res.json(leave);
  }),
);

export default router;
