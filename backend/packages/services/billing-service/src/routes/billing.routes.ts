import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate, requireAuth, requireRole } from '@hms/common-middleware';
import { billingService } from '../services/billing.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const InvoiceStatusEnum = z.enum([
  'DRAFT',
  'PENDING',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'CANCELLED',
  'REFUNDED',
]);

const PaymentMethodEnum = z.enum([
  'CASH',
  'CARD',
  'UPI',
  'NET_BANKING',
  'WALLET',
  'INSURANCE',
]);

const InvoiceItemTypeEnum = z.enum([
  'CONSULTATION',
  'LAB_TEST',
  'MEDICINE',
  'PROCEDURE',
  'OTHER',
]);

const invoiceItemSchema = z.object({
  type: InvoiceItemTypeEnum,
  referenceId: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
});

const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  hospitalId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  subtotal: z.number().min(0),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format').optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(invoiceItemSchema).min(1),
});

const updateStatusSchema = z.object({
  status: InvoiceStatusEnum,
});

const addPaymentSchema = z.object({
  amount: z.number().positive(),
  method: PaymentMethodEnum,
  transactionId: z.string().optional(),
  gatewayResponse: z.any().optional(),
});

const requestRefundSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(1).max(1000),
});

// ── Invoice Routes ──────────────────────────────────────

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { patientId, status, page, limit } = req.query;
    const result = await billingService.findAllInvoices({
      patientId: patientId as string | undefined,
      status: status as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }),
);

router.get(
  '/patient/:patientId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invoices = await billingService.getInvoicesByPatient(req.params.patientId);
    res.json(invoices);
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invoice = await billingService.findInvoiceById(req.params.id);
    res.json(invoice);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'RECEPTIONIST'),
  validate(createInvoiceSchema),
  asyncHandler(async (req, res) => {
    const invoice = await billingService.createInvoice(req.body);
    res.status(201).json(invoice);
  }),
);

router.put(
  '/:id/status',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const invoice = await billingService.updateInvoiceStatus(req.params.id, req.body.status);
    res.json(invoice);
  }),
);

// ── Payment Routes ──────────────────────────────────────

router.post(
  '/:id/payments',
  requireAuth,
  requireRole('ADMIN', 'RECEPTIONIST'),
  validate(addPaymentSchema),
  asyncHandler(async (req, res) => {
    const payment = await billingService.addPayment(req.params.id, req.body);
    res.status(201).json(payment);
  }),
);

router.get(
  '/:id/payments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payments = await billingService.getPayments(req.params.id);
    res.json(payments);
  }),
);

// ── Refund Routes ───────────────────────────────────────

router.post(
  '/refunds',
  requireAuth,
  requireRole('ADMIN'),
  validate(requestRefundSchema),
  asyncHandler(async (req, res) => {
    const refund = await billingService.requestRefund(req.body.paymentId, {
      amount: req.body.amount,
      reason: req.body.reason,
    });
    res.status(201).json(refund);
  }),
);

export default router;
