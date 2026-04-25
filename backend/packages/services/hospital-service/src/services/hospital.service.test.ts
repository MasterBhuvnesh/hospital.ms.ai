import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');

const { prisma } = await import('../lib/prisma.js');
const { hospitalService } = await import('./hospital.service.js');

// ── Helpers ────────────────────────────────────────────
const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';

function fakeHospital(overrides = {}) {
  return {
    id: MOCK_ID,
    name: 'General Hospital',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    pincode: '10001',
    phone: '1234567890',
    isActive: true,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('hospitalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a hospital', async () => {
      const data = {
        name: 'General Hospital',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        pincode: '10001',
        phone: '1234567890',
      };

      vi.mocked(prisma.hospital.create).mockResolvedValue(fakeHospital(data) as any);

      const result = await hospitalService.create(data as any);

      expect(prisma.hospital.create).toHaveBeenCalledWith({ data });
      expect(result.id).toBe(MOCK_ID);
    });
  });

  describe('findById', () => {
    it('should find a hospital by id', async () => {
      vi.mocked(prisma.hospital.findUnique).mockResolvedValue(fakeHospital() as any);

      const result = await hospitalService.findById(MOCK_ID);

      expect(prisma.hospital.findUnique).toHaveBeenCalledWith({
        where: { id: MOCK_ID },
        include: { departments: true, services: true, timings: true, holidays: true },
      });
      expect(result.id).toBe(MOCK_ID);
    });

    it('should throw if hospital not found', async () => {
      vi.mocked(prisma.hospital.findUnique).mockResolvedValue(null);
      await expect(hospitalService.findById(MOCK_ID)).rejects.toThrow('Hospital not found');
    });
  });
});
