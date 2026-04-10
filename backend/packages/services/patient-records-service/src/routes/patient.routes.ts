import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { patientService } from '../services/patient.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const BloodGroupEnum = z.enum([
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
]);

const createPatientSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  gender: z.string().min(1).max(50),
  bloodGroup: BloodGroupEnum.optional(),
  address: z.string().max(500).optional(),
  emergencyContact: z.string().max(200).optional(),
  emergencyPhone: z.string().max(20).optional(),
});

const updatePatientSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format').optional(),
  gender: z.string().min(1).max(50).optional(),
  bloodGroup: BloodGroupEnum.optional(),
  address: z.string().max(500).nullable().optional(),
  emergencyContact: z.string().max(200).nullable().optional(),
  emergencyPhone: z.string().max(20).nullable().optional(),
});

const addAllergySchema = z.object({
  allergen: z.string().min(1).max(200),
  severity: z.string().min(1).max(50),
  reaction: z.string().max(500).optional(),
});

const addMedicalHistorySchema = z.object({
  condition: z.string().min(1).max(500),
  diagnosedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format').optional(),
  status: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

const addDocumentSchema = z.object({
  fileName: z.string().min(1).max(500),
  fileType: z.string().min(1).max(100),
  fileSize: z.number().int().positive(),
  s3Key: z.string().min(1),
  category: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

const addImmunizationSchema = z.object({
  vaccineName: z.string().min(1).max(200),
  doseNumber: z.number().int().min(1),
  givenAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  nextDueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format').optional(),
  provider: z.string().max(200).optional(),
});

const grantAccessSchema = z.object({
  doctorId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
});

// ── Patient Routes ────────────────────────────────────────

// GET /patients — paginated list (ADMIN, DOCTOR)
router.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await patientService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

// GET /patients/me — get own patient profile (PATIENT)
router.get(
  '/me',
  requireAuth,
  requireRole('PATIENT'),
  asyncHandler(async (req, res) => {
    const patient = await patientService.findByUserId(req.user!.userId);
    res.json(patient);
  }),
);

// GET /patients/:id — get by ID (ADMIN, DOCTOR)
router.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const patient = await patientService.findById(req.params.id);
    res.json(patient);
  }),
);

// POST /patients — create (any auth user)
router.post(
  '/',
  requireAuth,
  validate(createPatientSchema),
  asyncHandler(async (req, res) => {
    const patient = await patientService.create(req.body);
    res.status(201).json(patient);
  }),
);

// PUT /patients/:id — update (ADMIN or own)
router.put(
  '/:id',
  requireAuth,
  validate(updatePatientSchema),
  asyncHandler(async (req, res) => {
    const patient = await patientService.update(req.params.id, req.body);
    res.json(patient);
  }),
);

// ── Allergies ─────────────────────────────────────────────

// POST /patients/:id/allergies — add allergy
router.post(
  '/:id/allergies',
  requireAuth,
  validate(addAllergySchema),
  asyncHandler(async (req, res) => {
    const allergy = await patientService.addAllergy(req.params.id, req.body);
    res.status(201).json(allergy);
  }),
);

// DELETE /patients/:id/allergies/:allergyId — remove allergy
router.delete(
  '/:id/allergies/:allergyId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await patientService.removeAllergy(req.params.allergyId);
    res.status(204).send();
  }),
);

// ── Medical History ───────────────────────────────────────

// POST /patients/:id/medical-history — add history entry
router.post(
  '/:id/medical-history',
  requireAuth,
  validate(addMedicalHistorySchema),
  asyncHandler(async (req, res) => {
    const history = await patientService.addMedicalHistory(req.params.id, req.body);
    res.status(201).json(history);
  }),
);

// ── Documents ─────────────────────────────────────────────

// POST /patients/:id/documents — add document metadata
router.post(
  '/:id/documents',
  requireAuth,
  validate(addDocumentSchema),
  asyncHandler(async (req, res) => {
    const document = await patientService.addDocument(req.params.id, req.body);
    res.status(201).json(document);
  }),
);

// ── Immunizations ─────────────────────────────────────────

// POST /patients/:id/immunizations — add immunization
router.post(
  '/:id/immunizations',
  requireAuth,
  validate(addImmunizationSchema),
  asyncHandler(async (req, res) => {
    const immunization = await patientService.addImmunization(req.params.id, req.body);
    res.status(201).json(immunization);
  }),
);

// ── Record Access ─────────────────────────────────────────

// POST /patients/:id/access — grant doctor access
router.post(
  '/:id/access',
  requireAuth,
  validate(grantAccessSchema),
  asyncHandler(async (req, res) => {
    const access = await patientService.grantAccess(
      req.params.id,
      req.body.doctorId,
      req.body.expiresAt,
    );
    res.status(201).json(access);
  }),
);

// DELETE /patients/:id/access/:doctorId — revoke access
router.delete(
  '/:id/access/:doctorId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await patientService.revokeAccess(req.params.id, req.params.doctorId);
    res.status(204).send();
  }),
);

export default router;
