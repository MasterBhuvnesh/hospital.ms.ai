import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../services/appointment.service.js', () => ({
  appointmentService: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    cancel: vi.fn(),
  },
}));

const { default: app } = await import('../index.js');
const { appointmentService } = await import('../services/appointment.service.js');

const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';
const AUTH_HEADERS = {
  'x-user-id': MOCK_ID,
  'x-user-email': 'doctor@hms.com',
  'x-user-role': 'DOCTOR',
};

describe('Appointment Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /appointments', () => {
    it('should return 200 and list', async () => {
      vi.mocked(appointmentService.findAll).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as any);
      const res = await request(app).get('/appointments').set(AUTH_HEADERS);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /appointments', () => {
    it('should return 201 on success', async () => {
      const payload = {
        patientId: MOCK_ID,
        doctorId: MOCK_ID,
        hospitalId: MOCK_ID,
        appointmentDate: '2025-01-01',
        slotTime: '10:00',
      };
      vi.mocked(appointmentService.create).mockResolvedValue({ id: MOCK_ID, ...payload } as any);
      const res = await request(app).post('/appointments').set(AUTH_HEADERS).send(payload);
      expect(res.status).toBe(201);
    });
  });
});
