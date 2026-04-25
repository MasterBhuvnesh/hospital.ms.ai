import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../services/pharmacy.service.js', () => ({
  pharmacyService: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

const { default: app } = await import('../index.js');
const { pharmacyService } = await import('../services/pharmacy.service.js');

const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';
const AUTH_HEADERS = {
  'x-user-id': MOCK_ID,
  'x-user-email': 'pharmacist@hms.com',
  'x-user-role': 'PHARMACIST',
};

describe('Pharmacy Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /pharmacy', () => {
    it('should return 200 and list', async () => {
      vi.mocked(pharmacyService.findAll).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as any);
      const res = await request(app).get('/pharmacy').set(AUTH_HEADERS);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /pharmacy', () => {
    it('should return 201 on success', async () => {
      const payload = {
        patientId: MOCK_ID,
        items: [{ medicineId: MOCK_ID, medicineName: 'Paracetamol', quantity: 2, unitPrice: 10 }],
      };
      vi.mocked(pharmacyService.create).mockResolvedValue({ id: MOCK_ID, ...payload } as any);
      const res = await request(app).post('/pharmacy').set(AUTH_HEADERS).send(payload);
      expect(res.status).toBe(201);
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app).post('/pharmacy').set(AUTH_HEADERS).send({ patientId: 'invalid' });
      expect(res.status).toBe(400);
    });
  });
});
