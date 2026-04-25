import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../services/consultation.service.js', () => ({
  consultationService: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    addNote: vi.fn(),
    updateNote: vi.fn(),
    recordVitals: vi.fn(),
  },
}));

// Import app and service
const { default: app } = await import('../index.js');
const { consultationService } = await import('../services/consultation.service.js');

// ── Helpers ────────────────────────────────────────────
const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';
const AUTH_HEADERS = {
  'x-user-id': MOCK_ID,
  'x-user-email': 'doctor@hms.com',
  'x-user-role': 'DOCTOR',
};

const sampleConsultation = {
  id: MOCK_ID,
  patientId: MOCK_ID,
  doctorId: MOCK_ID,
  hospitalId: MOCK_ID,
  status: 'WAITING',
  createdAt: new Date().toISOString(),
};

// ── Tests ──────────────────────────────────────────────

describe('Consultation Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /consultations', () => {
    it('should return 200 and a list of consultations', async () => {
      vi.mocked(consultationService.findAll).mockResolvedValue({
        data: [sampleConsultation],
        total: 1,
        page: 1,
        limit: 20,
      } as any);

      const response = await request(app)
        .get('/consultations')
        .set(AUTH_HEADERS);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(MOCK_ID);
    });

    it('should return 401 if no auth headers', async () => {
      const response = await request(app).get('/consultations');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /consultations/:id', () => {
    it('should return 200 and a consultation detail', async () => {
      vi.mocked(consultationService.findById).mockResolvedValue(sampleConsultation as any);

      const response = await request(app)
        .get(`/consultations/${MOCK_ID}`)
        .set(AUTH_HEADERS);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(MOCK_ID);
    });
  });

  describe('POST /consultations', () => {
    it('should create a consultation and return 201', async () => {
      const payload = {
        patientId: MOCK_ID,
        doctorId: MOCK_ID,
        hospitalId: MOCK_ID,
      };
      vi.mocked(consultationService.create).mockResolvedValue({ ...sampleConsultation, ...payload } as any);

      const response = await request(app)
        .post('/consultations')
        .set(AUTH_HEADERS)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.patientId).toBe(MOCK_ID);
    });

    it('should return 400 for invalid payload (Zod validation)', async () => {
      const response = await request(app)
        .post('/consultations')
        .set(AUTH_HEADERS)
        .send({ patientId: 'invalid-uuid' });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /consultations/:id/status', () => {
    it('should update status and return 200', async () => {
      vi.mocked(consultationService.updateStatus).mockResolvedValue({ ...sampleConsultation, status: 'WITH_DOCTOR' } as any);

      const response = await request(app)
        .put(`/consultations/${MOCK_ID}/status`)
        .set(AUTH_HEADERS)
        .send({ status: 'WITH_DOCTOR' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('WITH_DOCTOR');
    });
  });

  describe('POST /consultations/:id/notes', () => {
    it('should add a note and return 201', async () => {
      const notePayload = { subjective: 'Patient reports headache' };
      vi.mocked(consultationService.addNote).mockResolvedValue({ id: 'note-1', ...notePayload } as any);

      const response = await request(app)
        .post(`/consultations/${MOCK_ID}/notes`)
        .set(AUTH_HEADERS)
        .send(notePayload);

      expect(response.status).toBe(201);
      expect(response.body.subjective).toBe(notePayload.subjective);
    });
  });

  describe('POST /consultations/:id/vitals', () => {
    it('should record vitals and return 201', async () => {
      const vitalsPayload = { temperature: 37.5, bloodPressureSystolic: 120, bloodPressureDiastolic: 80 };
      vi.mocked(consultationService.recordVitals).mockResolvedValue({ id: 'vital-1', ...vitalsPayload } as any);

      const response = await request(app)
        .post(`/consultations/${MOCK_ID}/vitals`)
        .set(AUTH_HEADERS)
        .send(vitalsPayload);

      expect(response.status).toBe(201);
      expect(response.body.temperature).toBe(vitalsPayload.temperature);
    });
  });
});
