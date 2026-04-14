import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, AppError } from '@hms/common-middleware';
import { adminService } from '../services/admin.service.js';
import { authenticate } from '../middleware/auth.js';
import type { Request, Response, NextFunction } from 'express';

const router: IRouter = Router();

// ── Role guard (admin only) ─────────────────────────
function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new AppError('Authentication required', 401);
  if (req.user.role !== 'ADMIN') throw new AppError('Admin access required', 403);
  next();
}

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ── Schemas ──────────────────────────────────────────

const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z
    .enum(['PATIENT', 'DOCTOR', 'ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST'])
    .optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST']),
});

const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

const updateRoleSchema = z.object({
  role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST']),
});

// ── Routes ───────────────────────────────────────────

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const query = listUsersSchema.parse(req.query);
    const result = await adminService.listUsers(query);
    res.json({ data: result });
  }),
);

router.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await adminService.getUser(req.params.id);
    res.json({ data: user });
  }),
);

router.post(
  '/users',
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await adminService.createUser(req.body);
    res.status(201).json({ data: user });
  }),
);

router.patch(
  '/users/:id/status',
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const user = await adminService.updateUserStatus(req.params.id, req.body.isActive);
    res.json({ data: user });
  }),
);

router.patch(
  '/users/:id/role',
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const user = await adminService.updateUserRole(req.params.id, req.body.role);
    res.json({ data: user });
  }),
);

router.post(
  '/users/:id/unlock',
  asyncHandler(async (req, res) => {
    const user = await adminService.unlockUser(req.params.id);
    res.json({ data: user });
  }),
);

export default router;
