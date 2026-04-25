import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';
import { appointmentCreatedCounter } from '../lib/metrics.js';

export const appointmentService = {
  // ── Appointment CRUD ───────────────────────────────────

  async findAll(query: {
    patientId?: string;
    doctorId?: string;
    hospitalId?: string;
    status?: string;
    date?: string;
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
    if (query.hospitalId) {
      where.hospitalId = query.hospitalId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.date) {
      where.appointmentDate = new Date(query.date);
    }

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { appointmentDate: 'desc' },
      }),
      prisma.appointment.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    return appointment;
  },

  async create(data: {
    patientId: string;
    doctorId: string;
    hospitalId: string;
    appointmentDate: string;
    slotTime: string;
    endTime?: string;
    type?: string;
    reason?: string;
    notes?: string;
  }) {
    const appointment = await prisma.appointment.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        hospitalId: data.hospitalId,
        appointmentDate: new Date(data.appointmentDate),
        slotTime: data.slotTime,
        endTime: data.endTime,
        type: (data.type as any) ?? 'ONLINE',
        reason: data.reason,
        notes: data.notes,
      },
    });

    appointmentCreatedCounter.inc({
      hospital_id: data.hospitalId,
      status: appointment.status,
    });

    return appointment;
  },

  async updateStatus(id: string, status: string, notes?: string) {
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const updateData: any = { status };
    if (notes) {
      updateData.notes = notes;
    }
    if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      if (notes) {
        updateData.cancelReason = notes;
      }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
    });

    appointmentCreatedCounter.inc({
      hospital_id: updated.hospitalId,
      status: updated.status,
    });

    return updated;
  },

  async cancel(id: string, reason: string) {
    return this.updateStatus(id, 'CANCELLED', reason);
  },

  async getByDoctor(doctorId: string, date: string) {
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: new Date(date),
      },
      orderBy: { slotTime: 'asc' },
    });

    return appointments;
  },

  async getByPatient(patientId: string) {
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      orderBy: { appointmentDate: 'desc' },
    });

    return appointments;
  },

  // ── Waitlist Management ─────────────────────────────────

  async addToWaitlist(data: {
    patientId: string;
    doctorId: string;
    hospitalId: string;
    date: string;
    priority?: number;
  }) {
    return prisma.waitlist.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        hospitalId: data.hospitalId,
        date: new Date(data.date),
        priority: data.priority ?? 0,
      },
    });
  },

  async removeFromWaitlist(id: string) {
    const entry = await prisma.waitlist.findUnique({ where: { id } });
    if (!entry) {
      throw new AppError('Waitlist entry not found', 404);
    }

    return prisma.waitlist.delete({ where: { id } });
  },

  async getWaitlist(doctorId: string, date: string) {
    const entries = await prisma.waitlist.findMany({
      where: {
        doctorId,
        date: new Date(date),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return entries;
  },
};
