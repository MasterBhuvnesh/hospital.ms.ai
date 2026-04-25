import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../lib/metrics.js', () => ({
  invoiceCreatedCounter: { inc: vi.fn() },
  paymentProcessedCounter: { inc: vi.fn() },
  totalRevenueCounter: { inc: vi.fn() },
  default: { contentType: 'text/plain', metrics: vi.fn() },
}));

const { prisma } = await import('../lib/prisma.js');
const { billingService } = await import('./billing.service.js');
const { invoiceCreatedCounter, paymentProcessedCounter, totalRevenueCounter } = await import('../lib/metrics.js');

// ── Helpers ────────────────────────────────────────────
const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';

function fakeInvoice(overrides = {}) {
  return {
    id: MOCK_ID,
    invoiceNumber: 'INV-20250101-0001',
    patientId: MOCK_ID,
    hospitalId: MOCK_ID,
    totalAmount: 100,
    paidAmount: 0,
    status: 'DRAFT',
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('billingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should create an invoice and increment metric', async () => {
      const data = {
        patientId: MOCK_ID,
        hospitalId: MOCK_ID,
        subtotal: 100,
        totalAmount: 100,
        items: [{ type: 'CONSULTATION', description: 'General', unitPrice: 100, totalPrice: 100 }],
      };

      vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => cb(prisma));
      vi.mocked(prisma.invoice.create).mockResolvedValue(fakeInvoice(data) as any);

      const result = await billingService.createInvoice(data);

      expect(prisma.invoice.create).toHaveBeenCalled();
      expect(invoiceCreatedCounter.inc).toHaveBeenCalledWith({
        hospital_id: MOCK_ID,
        status: 'DRAFT',
      });
      expect(result.invoiceNumber).toBeDefined();
    });
  });

  describe('addPayment', () => {
    it('should process payment and increment metrics', async () => {
      const mockInv = fakeInvoice();
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInv as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => cb(prisma));
      vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'pay-1', amount: 50, method: 'CASH' } as any);

      await billingService.addPayment(MOCK_ID, { amount: 50, method: 'CASH' });

      expect(paymentProcessedCounter.inc).toHaveBeenCalledWith({
        method: 'CASH',
        status: 'success',
      });
      expect(totalRevenueCounter.inc).toHaveBeenCalledWith(
        { hospital_id: MOCK_ID },
        50
      );
    });
  });
});
