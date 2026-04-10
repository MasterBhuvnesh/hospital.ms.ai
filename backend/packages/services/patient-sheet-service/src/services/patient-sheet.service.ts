import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';

const VALID_TRANSITIONS: Record<string, string[]> = {
  GENERATING: ['READY'],
  READY: ['DELIVERED'],
  DELIVERED: ['VIEWED'],
  VIEWED: [],
};

export const patientSheetService = {
  // ── PatientSheet CRUD ──────────────────────────────────

  async findAll(query: {
    doctorId?: string;
    patientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }
    if (query.patientId) {
      where.patientId = query.patientId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      prisma.patientSheet.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { generatedAt: 'desc' },
      }),
      prisma.patientSheet.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    const sheet = await prisma.patientSheet.findUnique({
      where: { id },
    });

    if (!sheet) {
      throw new AppError('Patient sheet not found', 404);
    }

    return sheet;
  },

  async create(data: {
    patientId: string;
    doctorId: string;
    appointmentId?: string;
    queueTokenId?: string;
    content: any;
  }) {
    return prisma.patientSheet.create({
      data: {
        ...data,
        status: 'GENERATING',
      },
    });
  },

  // ── Status Workflow ─────────────────────────────────

  async updateStatus(
    id: string,
    status: 'GENERATING' | 'READY' | 'DELIVERED' | 'VIEWED',
  ) {
    const sheet = await prisma.patientSheet.findUnique({ where: { id } });
    if (!sheet) {
      throw new AppError('Patient sheet not found', 404);
    }

    const allowed = VALID_TRANSITIONS[sheet.status];
    if (!allowed || !allowed.includes(status)) {
      throw new AppError(
        `Cannot transition from ${sheet.status} to ${status}`,
        400,
      );
    }

    const updateData: any = { status };
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }
    if (status === 'VIEWED') {
      updateData.viewedAt = new Date();
    }

    return prisma.patientSheet.update({
      where: { id },
      data: updateData,
    });
  },

  // ── By Doctor ──────────────────────────────────────────

  async getByDoctor(doctorId: string, status?: string) {
    const where: any = { doctorId };
    if (status) {
      where.status = status;
    }

    return prisma.patientSheet.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
    });
  },

  // ── By Patient ─────────────────────────────────────────

  async getByPatient(patientId: string) {
    return prisma.patientSheet.findMany({
      where: { patientId },
      orderBy: { generatedAt: 'desc' },
    });
  },
};
