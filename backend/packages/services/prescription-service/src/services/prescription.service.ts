import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';

export const prescriptionService = {
  // ── Prescription CRUD ──────────────────────────────────

  async findAll(query: {
    patientId?: string;
    doctorId?: string;
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
    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prescription.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    return prescription;
  },

  async create(data: {
    patientId: string;
    doctorId: string;
    appointmentId?: string;
    consultationId?: string;
    diagnosis: string;
    notes?: string;
    items: {
      medicineName: string;
      medicineId?: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
      quantity: number;
      isGeneric?: boolean;
    }[];
  }) {
    const { items, ...prescriptionData } = data;

    return prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.create({
        data: {
          ...prescriptionData,
          items: {
            create: items,
          },
        },
        include: { items: true },
      });

      return prescription;
    });
  },

  async update(
    id: string,
    data: {
      diagnosis?: string;
      notes?: string;
      appointmentId?: string;
      consultationId?: string;
    },
  ) {
    const prescription = await prisma.prescription.findUnique({ where: { id } });
    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }
    if (prescription.status !== 'DRAFT') {
      throw new AppError('Only DRAFT prescriptions can be updated', 400);
    }

    return prisma.prescription.update({
      where: { id },
      data,
      include: { items: true },
    });
  },

  async sign(id: string) {
    const prescription = await prisma.prescription.findUnique({ where: { id } });
    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }
    if (prescription.status !== 'DRAFT') {
      throw new AppError('Only DRAFT prescriptions can be signed', 400);
    }

    return prisma.prescription.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
      },
      include: { items: true },
    });
  },

  async dispense(id: string) {
    const prescription = await prisma.prescription.findUnique({ where: { id } });
    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }
    if (prescription.status !== 'SIGNED') {
      throw new AppError('Only SIGNED prescriptions can be dispensed', 400);
    }

    return prisma.prescription.update({
      where: { id },
      data: { status: 'DISPENSED' },
      include: { items: true },
    });
  },

  async cancel(id: string) {
    const prescription = await prisma.prescription.findUnique({ where: { id } });
    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }
    if (prescription.status === 'DISPENSED') {
      throw new AppError('DISPENSED prescriptions cannot be cancelled', 400);
    }

    return prisma.prescription.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { items: true },
    });
  },

  // ── Prescription Items ─────────────────────────────────

  async addItem(
    prescriptionId: string,
    data: {
      medicineName: string;
      medicineId?: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
      quantity: number;
      isGeneric?: boolean;
    },
  ) {
    const prescription = await prisma.prescription.findUnique({ where: { id: prescriptionId } });
    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }
    if (prescription.status !== 'DRAFT') {
      throw new AppError('Items can only be added to DRAFT prescriptions', 400);
    }

    return prisma.prescriptionItem.create({
      data: {
        prescriptionId,
        ...data,
      },
    });
  },

  async removeItem(itemId: string) {
    const item = await prisma.prescriptionItem.findUnique({
      where: { id: itemId },
      include: { prescription: true },
    });
    if (!item) {
      throw new AppError('Prescription item not found', 404);
    }
    if (item.prescription.status !== 'DRAFT') {
      throw new AppError('Items can only be removed from DRAFT prescriptions', 400);
    }

    return prisma.prescriptionItem.delete({ where: { id: itemId } });
  },

  // ── Drug Interactions ──────────────────────────────────

  async checkInteractions(drugNames: string[]) {
    if (drugNames.length < 2) {
      return [];
    }

    const interactions = await prisma.drugInteraction.findMany({
      where: {
        OR: [
          { drugA: { in: drugNames }, drugB: { in: drugNames } },
          { drugB: { in: drugNames }, drugA: { in: drugNames } },
        ],
      },
    });

    return interactions;
  },
};
