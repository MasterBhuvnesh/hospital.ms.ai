import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../lib/metrics.js', () => ({
  httpRequestDuration: { startTimer: vi.fn(() => vi.fn()) },
  httpRequestTotal: { inc: vi.fn() },
  register: { contentType: 'text/plain', metrics: vi.fn() },
}));

const { prisma } = await import('../lib/prisma.js');
const { createTestApp } = await import('../test-helpers/app.js');

const app = createTestApp();

// ── Helpers ────────────────────────────────────────────
const NOW = new Date();

function adminHeaders() {
  return {
    'x-user-id': 'user-1',
    'x-user-email': 'admin@hospital.com',
    'x-user-role': 'ADMIN',
  };
}

function doctorHeaders() {
  return {
    'x-user-id': 'doc-1',
    'x-user-email': 'dr@hospital.com',
    'x-user-role': 'DOCTOR',
  };
}

function patientHeaders() {
  return {
    'x-user-id': 'pat-1',
    'x-user-email': 'patient@example.com',
    'x-user-role': 'PATIENT',
  };
}

// ── Daily Metrics ─────────────────────────────────────

describe('Analytics Routes', () => {
  describe('GET /v1/analytics/daily', () => {
    it('should return daily metrics for admin', async () => {
      vi.mocked(prisma.dailyMetric.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dailyMetric.count).mockResolvedValue(0);

      const res = await request(app).get('/v1/analytics/daily').set(adminHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/v1/analytics/daily');

      expect(res.status).toBe(401);
    });

    it('should reject non-admin role', async () => {
      const res = await request(app).get('/v1/analytics/daily').set(patientHeaders());

      expect(res.status).toBe(403);
    });
  });

  describe('POST /v1/analytics/daily', () => {
    it('should upsert daily metric', async () => {
      vi.mocked(prisma.dailyMetric.upsert).mockResolvedValue({
        id: 'dm-1',
        date: NOW,
        totalPatients: 50,
      } as any);

      const res = await request(app)
        .post('/v1/analytics/daily')
        .set(adminHeaders())
        .send({ date: '2025-01-15', totalPatients: 50 });

      expect(res.status).toBe(201);
    });

    it('should reject invalid date', async () => {
      const res = await request(app)
        .post('/v1/analytics/daily')
        .set(adminHeaders())
        .send({ date: 'not-a-date' });

      expect(res.status).toBe(400);
    });

    it('should reject negative totalPatients', async () => {
      const res = await request(app)
        .post('/v1/analytics/daily')
        .set(adminHeaders())
        .send({ date: '2025-01-15', totalPatients: -1 });

      expect(res.status).toBe(400);
    });
  });

  // ── Doctor Metrics ──────────────────────────────────

  describe('GET /v1/analytics/doctors', () => {
    it('should allow admin access', async () => {
      vi.mocked(prisma.doctorDailyMetric.findMany).mockResolvedValue([]);
      vi.mocked(prisma.doctorDailyMetric.count).mockResolvedValue(0);

      const res = await request(app).get('/v1/analytics/doctors').set(adminHeaders());

      expect(res.status).toBe(200);
    });

    it('should allow doctor access', async () => {
      vi.mocked(prisma.doctorDailyMetric.findMany).mockResolvedValue([]);
      vi.mocked(prisma.doctorDailyMetric.count).mockResolvedValue(0);

      const res = await request(app).get('/v1/analytics/doctors').set(doctorHeaders());

      expect(res.status).toBe(200);
    });

    it('should reject patient access', async () => {
      const res = await request(app).get('/v1/analytics/doctors').set(patientHeaders());

      expect(res.status).toBe(403);
    });
  });

  describe('POST /v1/analytics/doctors', () => {
    it('should upsert doctor metric', async () => {
      vi.mocked(prisma.doctorDailyMetric.upsert).mockResolvedValue({
        id: 'ddm-1',
        doctorId: 'doc-1',
        patientsSeen: 15,
      } as any);

      const res = await request(app)
        .post('/v1/analytics/doctors')
        .set(adminHeaders())
        .send({ doctorId: '00000000-0000-4000-a000-000000000001', date: '2025-01-15', patientsSeen: 15 });

      expect(res.status).toBe(201);
    });

    it('should reject missing doctorId', async () => {
      const res = await request(app)
        .post('/v1/analytics/doctors')
        .set(adminHeaders())
        .send({ date: '2025-01-15' });

      expect(res.status).toBe(400);
    });
  });

  // ── Queue Stats ─────────────────────────────────────

  describe('GET /v1/analytics/queue-stats', () => {
    it('should return queue stats for admin', async () => {
      vi.mocked(prisma.queueStat.findMany).mockResolvedValue([]);
      vi.mocked(prisma.queueStat.count).mockResolvedValue(0);

      const res = await request(app).get('/v1/analytics/queue-stats').set(adminHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('should reject doctor access', async () => {
      const res = await request(app).get('/v1/analytics/queue-stats').set(doctorHeaders());

      expect(res.status).toBe(403);
    });
  });

  describe('POST /v1/analytics/queue-stats', () => {
    it('should upsert queue stat', async () => {
      vi.mocked(prisma.queueStat.upsert).mockResolvedValue({
        id: 'qs-1',
        hospitalId: 'hosp-1',
        hour: 10,
      } as any);

      const res = await request(app)
        .post('/v1/analytics/queue-stats')
        .set(adminHeaders())
        .send({
          hospitalId: '00000000-0000-4000-a000-000000000001',
          date: '2025-01-15',
          hour: 10,
          tokensIssued: 20,
        });

      expect(res.status).toBe(201);
    });

    it('should reject invalid hour', async () => {
      const res = await request(app)
        .post('/v1/analytics/queue-stats')
        .set(adminHeaders())
        .send({
          hospitalId: '00000000-0000-4000-a000-000000000001',
          date: '2025-01-15',
          hour: 25,
        });

      expect(res.status).toBe(400);
    });
  });

  // ── Dashboard ───────────────────────────────────────

  describe('GET /v1/analytics/dashboard/:hospitalId', () => {
    it('should return dashboard summary', async () => {
      vi.mocked(prisma.dailyMetric.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.doctorDailyMetric.findMany).mockResolvedValue([]);
      vi.mocked(prisma.queueStat.findMany).mockResolvedValue([]);

      const res = await request(app)
        .get('/v1/analytics/dashboard/00000000-0000-4000-a000-000000000001')
        .set(adminHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hospitalId');
      expect(res.body).toHaveProperty('daily');
      expect(res.body).toHaveProperty('doctors');
      expect(res.body).toHaveProperty('queue');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/v1/analytics/dashboard/hosp-1');

      expect(res.status).toBe(401);
    });
  });

  // ── 404 ─────────────────────────────────────────────

  describe('404', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/v1/analytics/unknown');

      expect(res.status).toBe(404);
    });
  });
});
