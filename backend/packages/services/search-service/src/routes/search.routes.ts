import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@hms/common-middleware';
import { searchService } from '../services/search.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const searchDoctorsSchema = z.object({
  name: z.string().optional(),
  specialization: z.string().optional(),
  hospitalId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const searchHospitalsSchema = z.object({
  name: z.string().optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const searchMedicinesSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const searchLabTestsSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// ── Public Routes ──────────────────────────────────────

router.get(
  '/doctors',
  asyncHandler(async (req, res) => {
    const query = searchDoctorsSchema.parse(req.query);
    const result = await searchService.searchDoctors(query);
    res.json(result);
  }),
);

router.get(
  '/hospitals',
  asyncHandler(async (req, res) => {
    const query = searchHospitalsSchema.parse(req.query);
    const result = await searchService.searchHospitals(query);
    res.json(result);
  }),
);

router.get(
  '/medicines',
  asyncHandler(async (req, res) => {
    const query = searchMedicinesSchema.parse(req.query);
    const result = await searchService.searchMedicines(query);
    res.json(result);
  }),
);

router.get(
  '/lab-tests',
  asyncHandler(async (req, res) => {
    const query = searchLabTestsSchema.parse(req.query);
    const result = await searchService.searchLabTests(query);
    res.json(result);
  }),
);

export default router;
