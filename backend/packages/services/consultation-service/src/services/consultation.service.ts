import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';

export const consultationService = {
  // ── Consultation CRUD ──────────────────────────────────

  async findAll(query: {
    doctorId?: string;
    patientId?: string;
    hospitalId?: string;
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
    if (query.hospitalId) {
      where.hospitalId = query.hospitalId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isPriority: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.consultation.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        vitals: { orderBy: { recordedAt: 'desc' } },
      },
    });

    if (!consultation) {
      throw new AppError('Consultation not found', 404);
    }

    return consultation;
  },

  async create(data: {
    patientId: string;
    doctorId: string;
    appointmentId?: string;
    hospitalId: string;
    isPriority?: boolean;
  }) {
    return prisma.consultation.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        appointmentId: data.appointmentId,
        hospitalId: data.hospitalId,
        isPriority: data.isPriority ?? false,
        status: 'WAITING',
      },
    });
  },

  async updateStatus(id: string, status: 'WAITING' | 'WITH_DOCTOR' | 'COMPLETED' | 'CANCELLED') {
    const consultation = await prisma.consultation.findUnique({ where: { id } });
    if (!consultation) {
      throw new AppError('Consultation not found', 404);
    }

    const updateData: any = { status };

    if (status === 'WITH_DOCTOR') {
      updateData.checkInAt = new Date();
    }

    if (status === 'COMPLETED') {
      updateData.checkOutAt = new Date();
      if (consultation.checkInAt) {
        const durationMs = new Date().getTime() - new Date(consultation.checkInAt).getTime();
        updateData.durationMins = Math.round(durationMs / 60000);
      }
    }

    return prisma.consultation.update({
      where: { id },
      data: updateData,
    });
  },

  // ── SOAP Notes ─────────────────────────────────────────

  async addNote(
    consultationId: string,
    data: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
      additionalNotes?: string;
    },
  ) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) {
      throw new AppError('Consultation not found', 404);
    }

    return prisma.consultationNote.create({
      data: {
        consultationId,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        additionalNotes: data.additionalNotes,
      },
    });
  },

  async updateNote(
    noteId: string,
    data: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
      additionalNotes?: string;
    },
  ) {
    const note = await prisma.consultationNote.findUnique({
      where: { id: noteId },
    });
    if (!note) {
      throw new AppError('Consultation note not found', 404);
    }

    return prisma.consultationNote.update({
      where: { id: noteId },
      data,
    });
  },

  // ── Vitals ─────────────────────────────────────────────

  async recordVitals(
    consultationId: string,
    data: {
      temperature?: number;
      bloodPressureSystolic?: number;
      bloodPressureDiastolic?: number;
      heartRate?: number;
      respiratoryRate?: number;
      oxygenSaturation?: number;
      weight?: number;
      height?: number;
    },
  ) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) {
      throw new AppError('Consultation not found', 404);
    }

    return prisma.vital.create({
      data: {
        consultationId,
        temperature: data.temperature,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        heartRate: data.heartRate,
        respiratoryRate: data.respiratoryRate,
        oxygenSaturation: data.oxygenSaturation,
        weight: data.weight,
        height: data.height,
      },
    });
  },
};
