import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING'],
  PROCESSING: ['COMPLETED'],
  COMPLETED: ['VERIFIED'],
  VERIFIED: ['DELIVERED'],
  DELIVERED: [],
};

export const labResultService = {
  // ── LabResult CRUD ──────────────────────────────────

  async findAll(query: {
    patientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.patientId) {
      where.patientId = query.patientId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      prisma.labResult.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { values: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.labResult.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    const result = await prisma.labResult.findUnique({
      where: { id },
      include: { values: true },
    });

    if (!result) {
      throw new AppError('Lab result not found', 404);
    }

    return result;
  },

  async create(data: {
    bookingId: string;
    patientId: string;
    testId: string;
    doctorId?: string;
    technicianId?: string;
    isCritical?: boolean;
    notes?: string;
  }) {
    return prisma.labResult.create({
      data,
      include: { values: true },
    });
  },

  // ── Result Values ───────────────────────────────────

  async addValues(
    resultId: string,
    values: Array<{
      parameterName: string;
      value: string;
      unit?: string;
      normalMin?: number;
      normalMax?: number;
      isAbnormal?: boolean;
    }>,
  ) {
    const result = await prisma.labResult.findUnique({ where: { id: resultId } });
    if (!result) {
      throw new AppError('Lab result not found', 404);
    }

    const created = await prisma.resultValue.createMany({
      data: values.map((v) => ({
        resultId,
        parameterName: v.parameterName,
        value: v.value,
        unit: v.unit,
        normalMin: v.normalMin,
        normalMax: v.normalMax,
        isAbnormal: v.isAbnormal ?? false,
      })),
    });

    return prisma.labResult.findUnique({
      where: { id: resultId },
      include: { values: true },
    });
  },

  // ── Status Workflow ─────────────────────────────────

  async updateStatus(
    id: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'VERIFIED' | 'DELIVERED',
  ) {
    const result = await prisma.labResult.findUnique({ where: { id } });
    if (!result) {
      throw new AppError('Lab result not found', 404);
    }

    const allowed = VALID_TRANSITIONS[result.status];
    if (!allowed || !allowed.includes(status)) {
      throw new AppError(
        `Cannot transition from ${result.status} to ${status}`,
        400,
      );
    }

    const updateData: any = { status };
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    return prisma.labResult.update({
      where: { id },
      data: updateData,
      include: { values: true },
    });
  },

  // ── Verify ──────────────────────────────────────────

  async verify(id: string, verifiedById: string) {
    const result = await prisma.labResult.findUnique({ where: { id } });
    if (!result) {
      throw new AppError('Lab result not found', 404);
    }

    if (result.status !== 'COMPLETED') {
      throw new AppError('Only completed results can be verified', 400);
    }

    return prisma.labResult.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedById,
      },
      include: { values: true },
    });
  },

  // ── Mark Delivered ──────────────────────────────────

  async markDelivered(id: string) {
    const result = await prisma.labResult.findUnique({ where: { id } });
    if (!result) {
      throw new AppError('Lab result not found', 404);
    }

    if (result.status !== 'VERIFIED') {
      throw new AppError('Only verified results can be marked as delivered', 400);
    }

    return prisma.labResult.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
      include: { values: true },
    });
  },
};
