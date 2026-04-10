import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { departmentService } from '../services/hospital.service.js';

// mergeParams: true so we can access :hospitalId from the parent router
const router: IRouter = Router({ mergeParams: true });

// ── Validation Schemas ─────────────────────────────────

const createDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  headDoctorId: z.string().uuid().optional(),
  floor: z.string().optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

// ── Department Routes ──────────────────────────────────

// GET / — list departments of a hospital (public)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as Record<string, string | undefined>;
    const result = await departmentService.findByHospital(req.params.hospitalId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.json(result);
  }),
);

// POST / — create department (ADMIN)
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createDepartmentSchema),
  asyncHandler(async (req, res) => {
    const department = await departmentService.create({
      hospitalId: req.params.hospitalId,
      ...req.body,
    });
    res.status(201).json({ data: department });
  }),
);

// PUT /:id — update department (ADMIN)
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateDepartmentSchema),
  asyncHandler(async (req, res) => {
    const department = await departmentService.update(req.params.id, req.body);
    res.json({ data: department });
  }),
);

// DELETE /:id — soft delete department (ADMIN)
router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await departmentService.delete(req.params.id);
    res.json({ message: 'Department deleted' });
  }),
);

export default router;
