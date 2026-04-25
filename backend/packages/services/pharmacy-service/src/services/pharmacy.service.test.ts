import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../lib/metrics.js', () => ({
  orderCreatedCounter: { inc: vi.fn() },
  orderStatusUpdateCounter: { inc: vi.fn() },
  default: { contentType: 'text/plain', metrics: vi.fn() },
}));

const { prisma } = await import('../lib/prisma.js');
const { pharmacyService } = await import('./pharmacy.service.js');
const { orderCreatedCounter, orderStatusUpdateCounter } = await import('../lib/metrics.js');

// ── Helpers ────────────────────────────────────────────
const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';

function fakeOrder(overrides = {}) {
  return {
    id: MOCK_ID,
    patientId: MOCK_ID,
    status: 'PENDING',
    deliveryType: 'PICKUP',
    totalAmount: 100,
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('pharmacyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order and increment metrics', async () => {
      const data = {
        patientId: MOCK_ID,
        items: [{ medicineId: MOCK_ID, medicineName: 'Paracetamol', quantity: 2, unitPrice: 10 }],
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => cb(prisma));
      vi.mocked(prisma.pharmacyOrder.create).mockResolvedValue(fakeOrder({ deliveryType: 'PICKUP', status: 'PENDING' }) as any);

      const result = await pharmacyService.create(data as any);

      expect(prisma.pharmacyOrder.create).toHaveBeenCalled();
      expect(orderCreatedCounter.inc).toHaveBeenCalledWith({
        delivery_type: 'PICKUP',
        status: 'PENDING',
      });
      expect(result.id).toBe(MOCK_ID);
    });

    it('should throw error if home delivery address is missing', async () => {
      const data = {
        patientId: MOCK_ID,
        deliveryType: 'HOME_DELIVERY',
        items: [],
      };

      await expect(pharmacyService.create(data as any)).rejects.toThrow('Delivery address is required');
    });
  });

  describe('updateStatus', () => {
    it('should update status and increment metrics', async () => {
      const mockOrder = fakeOrder({ status: 'PENDING' });
      vi.mocked(prisma.pharmacyOrder.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.pharmacyOrder.update).mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' } as any);

      await pharmacyService.updateStatus(MOCK_ID, 'CONFIRMED');

      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CONFIRMED' },
        })
      );
      expect(orderStatusUpdateCounter.inc).toHaveBeenCalledWith({ status: 'CONFIRMED' });
    });

    it('should throw error for invalid transition', async () => {
      const mockOrder = fakeOrder({ status: 'DELIVERED' });
      vi.mocked(prisma.pharmacyOrder.findUnique).mockResolvedValue(mockOrder as any);

      await expect(pharmacyService.updateStatus(MOCK_ID, 'PENDING' as any)).rejects.toThrow('Cannot transition');
    });
  });
});
