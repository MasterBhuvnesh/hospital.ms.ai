import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('./lib/prisma.js');

// We use the real service logic but mock the database calls
const { default: app } = await import('./index.js');
const { prisma } = await import('./lib/prisma.js');

// ── Test Data ──────────────────────────────────────────
const MOCK_PATIENT_ID = '770e8400-e29b-41d4-a716-446655440001';
const MOCK_HOSPITAL_ID = '880e8400-e29b-41d4-a716-446655440002';
const MOCK_INVOICE_ID = '990e8400-e29b-41d4-a716-446655440003';

const AUTH_HEADERS = {
  'x-user-id': 'admin-1',
  'x-user-email': 'admin@hms.com',
  'x-user-role': 'ADMIN',
};

const sampleInvoicePayload = {
  patientId: MOCK_PATIENT_ID,
  hospitalId: MOCK_HOSPITAL_ID,
  subtotal: 500,
  tax: 50,
  totalAmount: 550,
  items: [
    {
      type: 'CONSULTATION',
      description: 'General Physician Consultation',
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500
    }
  ]
};

// ── Integration Tests ──────────────────────────────────

describe('Billing Service - E2E Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete a full billing lifecycle: Create -> Pay -> Verify Status', async () => {
    // 1. Create Invoice
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null); // For invoice number generation
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => cb(prisma));
    vi.mocked(prisma.invoice.create).mockResolvedValue({
      id: MOCK_INVOICE_ID,
      invoiceNumber: 'INV-20260425-0001',
      status: 'DRAFT',
      paidAmount: 0,
      ...sampleInvoicePayload
    } as any);

    const createRes = await request(app)
      .post('/billing')
      .set(AUTH_HEADERS)
      .send(sampleInvoicePayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('DRAFT');
    expect(createRes.body.invoiceNumber).toContain('INV-');

    // 2. Add Payment (Full Amount)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(createRes.body);
    vi.mocked(prisma.payment.create).mockResolvedValue({
      id: 'pay-1',
      amount: 550,
      method: 'UPI',
      status: 'success'
    } as any);
    vi.mocked(prisma.invoice.update).mockResolvedValue({
      ...createRes.body,
      status: 'PAID',
      paidAmount: 550
    } as any);

    const paymentRes = await request(app)
      .post(`/billing/${MOCK_INVOICE_ID}/payments`)
      .set(AUTH_HEADERS)
      .send({
        amount: 550,
        method: 'UPI',
        transactionId: 'TXN-123456'
      });

    expect(paymentRes.status).toBe(201);
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PAID' })
      })
    );

    // 3. Verify Metrics Endpoint
    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.text).toContain('billing_invoices_created_total');
    expect(metricsRes.text).toContain('billing_payments_processed_total');
  });

  it('should reject invalid payment amounts', async () => {
    const res = await request(app)
      .post(`/billing/${MOCK_INVOICE_ID}/payments`)
      .set(AUTH_HEADERS)
      .send({
        amount: -100, // Invalid
        method: 'CASH'
      });

    expect(res.status).toBe(400); // Validation error
  });
});
