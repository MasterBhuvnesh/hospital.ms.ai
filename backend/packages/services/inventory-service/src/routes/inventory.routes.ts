import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { inventoryService } from '../services/inventory.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const createMedicineSchema = z.object({
  name: z.string().min(1).max(200),
  genericName: z.string().min(1).max(200),
  manufacturer: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  unitPrice: z.number().positive(),
  requiresPrescription: z.boolean().optional(),
});

const updateMedicineSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  genericName: z.string().min(1).max(200).optional(),
  manufacturer: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  unitPrice: z.number().positive().optional(),
  requiresPrescription: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const addBatchSchema = z.object({
  batchNumber: z.string().min(1).max(100),
  quantity: z.number().int().positive(),
  costPrice: z.number().positive(),
  expiryDate: z.string().min(1),
  vendorId: z.string().uuid().optional(),
});

const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().min(1).max(50),
  address: z.string().max(500).optional(),
});

const updateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1).max(50).optional(),
  address: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

const purchaseOrderItemSchema = z.object({
  medicineId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const createOrderSchema = z.object({
  vendorId: z.string().uuid(),
  items: z.array(purchaseOrderItemSchema).min(1),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ORDERED', 'SHIPPED', 'RECEIVED', 'CANCELLED']),
});

// ── Medicine Routes ──────────────────────────────────────

router.get(
  '/medicines',
  asyncHandler(async (req, res) => {
    const { name, category, isActive, page, limit } = req.query;
    const result = await inventoryService.findAllMedicines({
      name: name as string | undefined,
      category: category as string | undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.get(
  '/medicines/:id',
  asyncHandler(async (req, res) => {
    const medicine = await inventoryService.findMedicineById(req.params.id);
    res.json(medicine);
  }),
);

router.post(
  '/medicines',
  requireAuth,
  requireRole('ADMIN', 'PHARMACIST'),
  validate(createMedicineSchema),
  asyncHandler(async (req, res) => {
    const medicine = await inventoryService.createMedicine(req.body);
    res.status(201).json(medicine);
  }),
);

router.put(
  '/medicines/:id',
  requireAuth,
  requireRole('ADMIN', 'PHARMACIST'),
  validate(updateMedicineSchema),
  asyncHandler(async (req, res) => {
    const medicine = await inventoryService.updateMedicine(req.params.id, req.body);
    res.json(medicine);
  }),
);

// ── Stock Batch Routes ───────────────────────────────────

router.post(
  '/medicines/:id/batches',
  requireAuth,
  requireRole('ADMIN', 'PHARMACIST'),
  validate(addBatchSchema),
  asyncHandler(async (req, res) => {
    const batch = await inventoryService.addBatch({
      medicineId: req.params.id,
      ...req.body,
    });
    res.status(201).json(batch);
  }),
);

router.get(
  '/medicines/:id/stock',
  requireAuth,
  asyncHandler(async (req, res) => {
    const stock = await inventoryService.getStock(req.params.id);
    res.json(stock);
  }),
);

// ── Vendor Routes ────────────────────────────────────────

router.get(
  '/vendors',
  requireAuth,
  requireRole('ADMIN', 'PHARMACIST'),
  asyncHandler(async (req, res) => {
    const { name, isActive, page, limit } = req.query;
    const result = await inventoryService.findAllVendors({
      name: name as string | undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.post(
  '/vendors',
  requireAuth,
  requireRole('ADMIN'),
  validate(createVendorSchema),
  asyncHandler(async (req, res) => {
    const vendor = await inventoryService.createVendor(req.body);
    res.status(201).json(vendor);
  }),
);

router.put(
  '/vendors/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateVendorSchema),
  asyncHandler(async (req, res) => {
    const vendor = await inventoryService.updateVendor(req.params.id, req.body);
    res.json(vendor);
  }),
);

// ── Purchase Order Routes ────────────────────────────────

router.get(
  '/purchase-orders',
  requireAuth,
  requireRole('ADMIN', 'PHARMACIST'),
  asyncHandler(async (req, res) => {
    const { vendorId, status, page, limit } = req.query;
    const result = await inventoryService.findAllOrders({
      vendorId: vendorId as string | undefined,
      status: status as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.post(
  '/purchase-orders',
  requireAuth,
  requireRole('ADMIN'),
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const order = await inventoryService.createOrder(req.body);
    res.status(201).json(order);
  }),
);

router.put(
  '/purchase-orders/:id/status',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const order = await inventoryService.updateOrderStatus(req.params.id, req.body.status);
    res.json(order);
  }),
);

// ── Alert Routes ─────────────────────────────────────────

router.get(
  '/alerts',
  requireAuth,
  requireRole('ADMIN', 'PHARMACIST'),
  asyncHandler(async (req, res) => {
    const { medicineId, alertType, isResolved, page, limit } = req.query;
    const result = await inventoryService.getAlerts({
      medicineId: medicineId as string | undefined,
      alertType: alertType as string | undefined,
      isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.put(
  '/alerts/:id/resolve',
  requireAuth,
  requireRole('ADMIN', 'PHARMACIST'),
  asyncHandler(async (req, res) => {
    const alert = await inventoryService.resolveAlert(req.params.id);
    res.json(alert);
  }),
);

export default router;
