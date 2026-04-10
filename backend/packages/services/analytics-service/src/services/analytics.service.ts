import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';

export const analyticsService = {
  // ── Daily Metrics ────────────────────────────────────

  async getDailyMetrics(query: {
    hospitalId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.hospitalId) {
      where.hospitalId = query.hospitalId;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      prisma.dailyMetric.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.dailyMetric.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async upsertDailyMetric(data: {
    hospitalId?: string;
    date: string;
    totalPatients?: number;
    totalConsultations?: number;
    totalAppointments?: number;
    noShows?: number;
    avgWaitTimeMins?: number;
    avgConsultMins?: number;
    revenue?: number;
  }) {
    const dateVal = new Date(data.date);

    return prisma.dailyMetric.upsert({
      where: {
        hospitalId_date: {
          hospitalId: data.hospitalId ?? '',
          date: dateVal,
        },
      },
      update: {
        totalPatients: data.totalPatients,
        totalConsultations: data.totalConsultations,
        totalAppointments: data.totalAppointments,
        noShows: data.noShows,
        avgWaitTimeMins: data.avgWaitTimeMins,
        avgConsultMins: data.avgConsultMins,
        revenue: data.revenue,
      },
      create: {
        hospitalId: data.hospitalId,
        date: dateVal,
        totalPatients: data.totalPatients ?? 0,
        totalConsultations: data.totalConsultations ?? 0,
        totalAppointments: data.totalAppointments ?? 0,
        noShows: data.noShows ?? 0,
        avgWaitTimeMins: data.avgWaitTimeMins,
        avgConsultMins: data.avgConsultMins,
        revenue: data.revenue ?? 0,
      },
    });
  },

  // ── Doctor Daily Metrics ─────────────────────────────

  async getDoctorMetrics(query: {
    doctorId?: string;
    hospitalId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }
    if (query.hospitalId) {
      where.hospitalId = query.hospitalId;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      prisma.doctorDailyMetric.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.doctorDailyMetric.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async upsertDoctorMetric(data: {
    doctorId: string;
    hospitalId?: string;
    date: string;
    patientsSeen?: number;
    avgConsultMins?: number;
    avgRating?: number;
    revenue?: number;
  }) {
    const dateVal = new Date(data.date);

    return prisma.doctorDailyMetric.upsert({
      where: {
        doctorId_hospitalId_date: {
          doctorId: data.doctorId,
          hospitalId: data.hospitalId ?? '',
          date: dateVal,
        },
      },
      update: {
        patientsSeen: data.patientsSeen,
        avgConsultMins: data.avgConsultMins,
        avgRating: data.avgRating,
        revenue: data.revenue,
      },
      create: {
        doctorId: data.doctorId,
        hospitalId: data.hospitalId,
        date: dateVal,
        patientsSeen: data.patientsSeen ?? 0,
        avgConsultMins: data.avgConsultMins,
        avgRating: data.avgRating,
        revenue: data.revenue ?? 0,
      },
    });
  },

  // ── Queue Stats ──────────────────────────────────────

  async getQueueStats(query: {
    hospitalId?: string;
    doctorId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.hospitalId) {
      where.hospitalId = query.hospitalId;
    }
    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      prisma.queueStat.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ date: 'desc' }, { hour: 'desc' }],
      }),
      prisma.queueStat.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async upsertQueueStat(data: {
    hospitalId: string;
    doctorId?: string;
    date: string;
    hour: number;
    tokensIssued?: number;
    avgWaitMins?: number;
    peakQueueSize?: number;
  }) {
    const dateVal = new Date(data.date);

    return prisma.queueStat.upsert({
      where: {
        hospitalId_doctorId_date_hour: {
          hospitalId: data.hospitalId,
          doctorId: data.doctorId ?? '',
          date: dateVal,
          hour: data.hour,
        },
      },
      update: {
        tokensIssued: data.tokensIssued,
        avgWaitMins: data.avgWaitMins,
        peakQueueSize: data.peakQueueSize,
      },
      create: {
        hospitalId: data.hospitalId,
        doctorId: data.doctorId,
        date: dateVal,
        hour: data.hour,
        tokensIssued: data.tokensIssued ?? 0,
        avgWaitMins: data.avgWaitMins,
        peakQueueSize: data.peakQueueSize ?? 0,
      },
    });
  },

  // ── Dashboard Summary ────────────────────────────────

  async getDashboardSummary(hospitalId: string, date: string) {
    const dateVal = new Date(date);

    const [dailyMetric, doctorMetrics, queueStats] = await Promise.all([
      prisma.dailyMetric.findUnique({
        where: {
          hospitalId_date: {
            hospitalId,
            date: dateVal,
          },
        },
      }),
      prisma.doctorDailyMetric.findMany({
        where: { hospitalId, date: dateVal },
        orderBy: { patientsSeen: 'desc' },
      }),
      prisma.queueStat.findMany({
        where: { hospitalId, date: dateVal },
        orderBy: [{ hour: 'asc' }],
      }),
    ]);

    const totalTokensIssued = queueStats.reduce((sum, q) => sum + q.tokensIssued, 0);
    const peakQueue = queueStats.reduce((max, q) => Math.max(max, q.peakQueueSize), 0);

    return {
      date,
      hospitalId,
      daily: dailyMetric,
      doctors: doctorMetrics,
      queue: {
        stats: queueStats,
        totalTokensIssued,
        peakQueueSize: peakQueue,
      },
    };
  },
};
