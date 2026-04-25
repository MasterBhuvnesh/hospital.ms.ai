import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../services/hospital.service.js', () => ({
  hospitalService: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

const { default: app } = await import('../index.js');
const { hospitalService } = await import('../services/hospital.service.js');

const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';
const AUTH_HEADERS = {
  'x-user-id': MOCK_ID,
  'x-user-email': 'admin@hms.com',
  'x-user-role': 'ADMIN',
};

describe('Hospital Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /hospitals', () => {
    it('should return 200 and list', async () => {
      vi.mocked(hospitalService.findAll).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as any);
      const res = await request(app).get('/hospitals').set(AUTH_HEADERS);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /hospitals', () => {
    it('should return 201 on success', async () => {
      const payload = {
        name: 'General Hospital',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        pincode: '10001',
        phone: '1234567890',
      };
      vi.mocked(hospitalService.create).mockResolvedValue({ id: MOCK_ID, ...payload } as any);
      const res = await request(app).post('/hospitals').set(AUTH_HEADERS).send(payload);
      expect(res.status).toBe(201);
    });
  });
});
