import { prisma } from '../lib/prisma.js';
import type { BloodGroup } from '@prisma/client';
import { AppError } from '@hms/common-middleware';

export const patientService = {
  // ── Patient CRUD ───────────────────────────────────────

  async findAll(query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count(),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        allergies: true,
        medicalHistory: { orderBy: { createdAt: 'desc' } },
        immunizations: { orderBy: { givenAt: 'desc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    return patient;
  },

  async findByUserId(userId: string) {
    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: {
        allergies: true,
        medicalHistory: { orderBy: { createdAt: 'desc' } },
        immunizations: { orderBy: { givenAt: 'desc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    if (!patient) {
      throw new AppError('Patient profile not found', 404);
    }

    return patient;
  },

  async create(data: {
    userId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup?: string;
    address?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  }) {
    const existing = await prisma.patient.findUnique({
      where: { userId: data.userId },
    });
    if (existing) {
      throw new AppError('A patient profile already exists for this user', 409);
    }

    return prisma.patient.create({
      data: {
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        bloodGroup: data.bloodGroup as BloodGroup | undefined,
        address: data.address,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
      },
    });
  },

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      gender?: string;
      bloodGroup?: string;
      address?: string;
      emergencyContact?: string;
      emergencyPhone?: string;
    },
  ) {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    const updateData: any = { ...data };
    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }

    return prisma.patient.update({ where: { id }, data: updateData });
  },

  // ── Allergies ──────────────────────────────────────────

  async addAllergy(
    patientId: string,
    data: { allergen: string; severity: string; reaction?: string },
  ) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    return prisma.allergy.create({
      data: { patientId, ...data },
    });
  },

  async removeAllergy(id: string) {
    const allergy = await prisma.allergy.findUnique({ where: { id } });
    if (!allergy) {
      throw new AppError('Allergy not found', 404);
    }

    return prisma.allergy.delete({ where: { id } });
  },

  // ── Medical History ────────────────────────────────────

  async addMedicalHistory(
    patientId: string,
    data: {
      condition: string;
      diagnosedAt?: string;
      status?: string;
      notes?: string;
    },
  ) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    return prisma.medicalHistory.create({
      data: {
        patientId,
        condition: data.condition,
        diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt) : undefined,
        status: data.status,
        notes: data.notes,
      },
    });
  },

  async updateMedicalHistory(
    id: string,
    data: {
      condition?: string;
      diagnosedAt?: string;
      status?: string;
      notes?: string;
    },
  ) {
    const history = await prisma.medicalHistory.findUnique({ where: { id } });
    if (!history) {
      throw new AppError('Medical history entry not found', 404);
    }

    const updateData: any = { ...data };
    if (data.diagnosedAt) {
      updateData.diagnosedAt = new Date(data.diagnosedAt);
    }

    return prisma.medicalHistory.update({ where: { id }, data: updateData });
  },

  // ── Documents ──────────────────────────────────────────

  async addDocument(
    patientId: string,
    data: {
      fileName: string;
      fileType: string;
      fileSize: number;
      s3Key: string;
      category: string;
      description?: string;
    },
  ) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    return prisma.document.create({
      data: { patientId, ...data },
    });
  },

  // ── Immunizations ─────────────────────────────────────

  async addImmunization(
    patientId: string,
    data: {
      vaccineName: string;
      doseNumber: number;
      givenAt: string;
      nextDueAt?: string;
      provider?: string;
    },
  ) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    return prisma.immunization.create({
      data: {
        patientId,
        vaccineName: data.vaccineName,
        doseNumber: data.doseNumber,
        givenAt: new Date(data.givenAt),
        nextDueAt: data.nextDueAt ? new Date(data.nextDueAt) : undefined,
        provider: data.provider,
      },
    });
  },

  // ── Record Access ─────────────────────────────────────

  async grantAccess(patientId: string, doctorId: string, expiresAt?: string) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    return prisma.recordAccess.upsert({
      where: {
        patientId_doctorId: { patientId, doctorId },
      },
      update: {
        isRevoked: false,
        grantedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      create: {
        patientId,
        doctorId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });
  },

  async revokeAccess(patientId: string, doctorId: string) {
    const access = await prisma.recordAccess.findUnique({
      where: {
        patientId_doctorId: { patientId, doctorId },
      },
    });
    if (!access) {
      throw new AppError('Access grant not found', 404);
    }

    return prisma.recordAccess.update({
      where: {
        patientId_doctorId: { patientId, doctorId },
      },
      data: { isRevoked: true },
    });
  },
};
