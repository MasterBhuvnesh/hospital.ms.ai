import { describe, it, expect, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../lib/metrics.js', () => ({
  httpRequestDuration: { startTimer: vi.fn(() => vi.fn()) },
  httpRequestTotal: { inc: vi.fn() },
  register: { contentType: 'text/plain', metrics: vi.fn() },
}));

const { prisma } = await import('../lib/prisma.js');
const { analyticsService } = await import('./analytics.service.js');

// ── Helpers ────────────────────────────────────────────
const NOW = new Date();

function fakeDailyMetric(overrides = {}) {
  return {
    id: 'dm-1',
    hospitalId: 'hosp-1',
    date: NOW,
    totalPatients: 100,
    totalConsultations: 80,
    totalAppointments: 60,
    noShows: 5,
    avgWaitTimeMins: 12.5,
    avgConsultMins: 10.0,
    revenue: 30000,
    createdAt: NOW,
    ...overrides,
  };
}

function fakeDoctorMetric(overrides = {}) {
  return {
    id: 'ddm-1',
    doctorId: 'doc-1',
    hospitalId: 'hosp-1',
    date: NOW,
    patientsSeen: 20,
    avgConsultMins: 12.0,
    avgRating: 4.5,
    revenue: 8000,
    createdAt: NOW,
    ...overrides,
  };
}

function fakeQueueStat(overrides = {}) {
  return {
    id: 'qs-1',
    hospitalId: 'hosp-1',
    doctorId: null,
    date: NOW,
    hour: 10,
    tokensIssued: 15,
    avgWaitMins: 12.0,
    peakQueueSize: 8,
    createdAt: NOW,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('analyticsService', () => {
  // ── getDailyMetrics ─────────────────────────────────
  describe('getDailyMetrics', () => {
    it('should return paginated daily metrics', async () => {
      vi.mocked(prisma.dailyMetric.findMany).mockResolvedValue([fakeDailyMetric()] as any);
      vi.mocked(prisma.dailyMetric.count).mockResolvedValue(1);

      const result = await analyticsService.getDailyMetrics({});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by hospitalId', async () => {
      vi.mocked(prisma.dailyMetric.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dailyMetric.count).mockResolvedValue(0);

      await analyticsService.getDailyMetrics({ hospitalId: 'hosp-1' });

      expect(prisma.dailyMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ hospitalId: 'hosp-1' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      vi.mocked(prisma.dailyMetric.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dailyMetric.count).mockResolvedValue(0);

      await analyticsService.getDailyMetrics({ startDate: '2025-01-01', endDate: '2025-01-31' });

      expect(prisma.dailyMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
        }),
      );
    });

    it('should respect custom page and limit', async () => {
      vi.mocked(prisma.dailyMetric.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dailyMetric.count).mockResolvedValue(0);

      const result = await analyticsService.getDailyMetrics({ page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(prisma.dailyMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // ── upsertDailyMetric ──────────────────────────────
  describe('upsertDailyMetric', () => {
    it('should upsert a daily metric', async () => {
      const metric = fakeDailyMetric();
      vi.mocked(prisma.dailyMetric.upsert).mockResolvedValue(metric as any);

      const result = await analyticsService.upsertDailyMetric({
        hospitalId: 'hosp-1',
        date: '2025-01-15',
        totalPatients: 100,
      });

      expect(prisma.dailyMetric.upsert).toHaveBeenCalled();
      expect(result.totalPatients).toBe(100);
    });

    it('should default hospitalId to empty string in where clause', async () => {
      vi.mocked(prisma.dailyMetric.upsert).mockResolvedValue(fakeDailyMetric() as any);

      await analyticsService.upsertDailyMetric({ date: '2025-01-15' });

      expect(prisma.dailyMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { hospitalId_date: { hospitalId: '', date: expect.any(Date) } },
        }),
      );
    });

    it('should default numeric fields to 0 on create', async () => {
      vi.mocked(prisma.dailyMetric.upsert).mockResolvedValue(fakeDailyMetric() as any);

      await analyticsService.upsertDailyMetric({ date: '2025-01-15' });

      expect(prisma.dailyMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            totalPatients: 0,
            totalConsultations: 0,
            totalAppointments: 0,
            noShows: 0,
            revenue: 0,
          }),
        }),
      );
    });
  });

  // ── getDoctorMetrics ────────────────────────────────
  describe('getDoctorMetrics', () => {
    it('should return paginated doctor metrics', async () => {
      vi.mocked(prisma.doctorDailyMetric.findMany).mockResolvedValue([fakeDoctorMetric()] as any);
      vi.mocked(prisma.doctorDailyMetric.count).mockResolvedValue(1);

      const result = await analyticsService.getDoctorMetrics({});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by doctorId and hospitalId', async () => {
      vi.mocked(prisma.doctorDailyMetric.findMany).mockResolvedValue([]);
      vi.mocked(prisma.doctorDailyMetric.count).mockResolvedValue(0);

      await analyticsService.getDoctorMetrics({ doctorId: 'doc-1', hospitalId: 'hosp-1' });

      expect(prisma.doctorDailyMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ doctorId: 'doc-1', hospitalId: 'hosp-1' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      vi.mocked(prisma.doctorDailyMetric.findMany).mockResolvedValue([]);
      vi.mocked(prisma.doctorDailyMetric.count).mockResolvedValue(0);

      await analyticsService.getDoctorMetrics({ startDate: '2025-01-01' });

      expect(prisma.doctorDailyMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ date: { gte: expect.any(Date) } }),
        }),
      );
    });
  });

  // ── upsertDoctorMetric ─────────────────────────────
  describe('upsertDoctorMetric', () => {
    it('should upsert a doctor metric', async () => {
      const metric = fakeDoctorMetric();
      vi.mocked(prisma.doctorDailyMetric.upsert).mockResolvedValue(metric as any);

      const result = await analyticsService.upsertDoctorMetric({
        doctorId: 'doc-1',
        date: '2025-01-15',
        patientsSeen: 20,
      });

      expect(prisma.doctorDailyMetric.upsert).toHaveBeenCalled();
      expect(result.patientsSeen).toBe(20);
    });

    it('should default hospitalId to empty string in where clause', async () => {
      vi.mocked(prisma.doctorDailyMetric.upsert).mockResolvedValue(fakeDoctorMetric() as any);

      await analyticsService.upsertDoctorMetric({ doctorId: 'doc-1', date: '2025-01-15' });

      expect(prisma.doctorDailyMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            doctorId_hospitalId_date: {
              doctorId: 'doc-1',
              hospitalId: '',
              date: expect.any(Date),
            },
          },
        }),
      );
    });
  });

  // ── getQueueStats ───────────────────────────────────
  describe('getQueueStats', () => {
    it('should return paginated queue stats', async () => {
      vi.mocked(prisma.queueStat.findMany).mockResolvedValue([fakeQueueStat()] as any);
      vi.mocked(prisma.queueStat.count).mockResolvedValue(1);

      const result = await analyticsService.getQueueStats({});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by hospitalId and doctorId', async () => {
      vi.mocked(prisma.queueStat.findMany).mockResolvedValue([]);
      vi.mocked(prisma.queueStat.count).mockResolvedValue(0);

      await analyticsService.getQueueStats({ hospitalId: 'hosp-1', doctorId: 'doc-1' });

      expect(prisma.queueStat.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ hospitalId: 'hosp-1', doctorId: 'doc-1' }),
        }),
      );
    });
  });

  // ── upsertQueueStat ─────────────────────────────────
  describe('upsertQueueStat', () => {
    it('should upsert a queue stat', async () => {
      const stat = fakeQueueStat();
      vi.mocked(prisma.queueStat.upsert).mockResolvedValue(stat as any);

      const result = await analyticsService.upsertQueueStat({
        hospitalId: 'hosp-1',
        date: '2025-01-15',
        hour: 10,
        tokensIssued: 15,
      });

      expect(prisma.queueStat.upsert).toHaveBeenCalled();
      expect(result.tokensIssued).toBe(15);
    });

    it('should default doctorId to empty string in where clause', async () => {
      vi.mocked(prisma.queueStat.upsert).mockResolvedValue(fakeQueueStat() as any);

      await analyticsService.upsertQueueStat({
        hospitalId: 'hosp-1',
        date: '2025-01-15',
        hour: 10,
      });

      expect(prisma.queueStat.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            hospitalId_doctorId_date_hour: {
              hospitalId: 'hosp-1',
              doctorId: '',
              date: expect.any(Date),
              hour: 10,
            },
          },
        }),
      );
    });
  });

  // ── getDashboardSummary ─────────────────────────────
  describe('getDashboardSummary', () => {
    it('should return aggregated dashboard data', async () => {
      vi.mocked(prisma.dailyMetric.findUnique).mockResolvedValue(fakeDailyMetric() as any);
      vi.mocked(prisma.doctorDailyMetric.findMany).mockResolvedValue([fakeDoctorMetric()] as any);
      vi.mocked(prisma.queueStat.findMany).mockResolvedValue([
        fakeQueueStat({ tokensIssued: 10, peakQueueSize: 5 }),
        fakeQueueStat({ id: 'qs-2', hour: 11, tokensIssued: 20, peakQueueSize: 12 }),
      ] as any);

      const result = await analyticsService.getDashboardSummary('hosp-1', '2025-01-15');

      expect(result.hospitalId).toBe('hosp-1');
      expect(result.daily).toBeDefined();
      expect(result.doctors).toHaveLength(1);
      expect(result.queue.totalTokensIssued).toBe(30);
      expect(result.queue.peakQueueSize).toBe(12);
    });

    it('should handle no data gracefully', async () => {
      vi.mocked(prisma.dailyMetric.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.doctorDailyMetric.findMany).mockResolvedValue([]);
      vi.mocked(prisma.queueStat.findMany).mockResolvedValue([]);

      const result = await analyticsService.getDashboardSummary('hosp-1', '2025-01-15');

      expect(result.daily).toBeNull();
      expect(result.doctors).toHaveLength(0);
      expect(result.queue.totalTokensIssued).toBe(0);
      expect(result.queue.peakQueueSize).toBe(0);
    });
  });
});
