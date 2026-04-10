import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';

export const doctorService = {
  // ── Doctor CRUD ──────────────────────────────────────

  async findAll(query: {
    specialization?: string;
    hospitalId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = { isActive: true };

    if (query.specialization) {
      where.specialization = { contains: query.specialization, mode: 'insensitive' };
    }
    if (query.hospitalId) {
      where.hospitalId = query.hospitalId;
    }

    const [data, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { schedules: true },
        orderBy: { firstName: 'asc' },
      }),
      prisma.doctor.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        attendance: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        leaves: {
          orderBy: { startDate: 'desc' },
          take: 5,
        },
      },
    });

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    return doctor;
  },

  async create(data: {
    userId: string;
    firstName: string;
    lastName: string;
    specialization: string;
    qualification: string;
    experienceYears: number;
    fees: number;
    hospitalId?: string;
    bio?: string;
    profileImageUrl?: string;
  }) {
    const existing = await prisma.doctor.findUnique({
      where: { userId: data.userId },
    });
    if (existing) {
      throw new AppError('A doctor profile already exists for this user', 409);
    }

    return prisma.doctor.create({ data });
  },

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      specialization?: string;
      qualification?: string;
      experienceYears?: number;
      fees?: number;
      hospitalId?: string;
      bio?: string;
      profileImageUrl?: string;
    },
  ) {
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    return prisma.doctor.update({ where: { id }, data });
  },

  async delete(id: string) {
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    return prisma.doctor.update({
      where: { id },
      data: { isActive: false },
    });
  },

  // ── Schedule Management ──────────────────────────────

  async getSchedule(doctorId: string) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    return prisma.doctorSchedule.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });
  },

  async setSchedule(
    doctorId: string,
    data: {
      dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
      startTime: string;
      endTime: string;
      slotDuration?: number;
      isAvailable?: boolean;
    },
  ) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    return prisma.doctorSchedule.upsert({
      where: {
        doctorId_dayOfWeek: { doctorId, dayOfWeek: data.dayOfWeek },
      },
      update: {
        startTime: data.startTime,
        endTime: data.endTime,
        slotDuration: data.slotDuration ?? 15,
        isAvailable: data.isAvailable ?? true,
      },
      create: {
        doctorId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        slotDuration: data.slotDuration ?? 15,
        isAvailable: data.isAvailable ?? true,
      },
    });
  },

  async updateSchedule(
    doctorId: string,
    scheduleId: string,
    data: {
      startTime?: string;
      endTime?: string;
      slotDuration?: number;
      isAvailable?: boolean;
    },
  ) {
    const schedule = await prisma.doctorSchedule.findFirst({
      where: { id: scheduleId, doctorId },
    });
    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    return prisma.doctorSchedule.update({
      where: { id: scheduleId },
      data,
    });
  },

  // ── Attendance ───────────────────────────────────────

  async recordAttendance(
    doctorId: string,
    data: {
      date: string;
      checkInTime?: string;
      checkOutTime?: string;
      status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY';
    },
  ) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    const date = new Date(data.date);

    return prisma.doctorAttendance.upsert({
      where: {
        doctorId_date: { doctorId, date },
      },
      update: {
        checkInTime: data.checkInTime ? new Date(data.checkInTime) : undefined,
        checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : undefined,
        status: data.status,
      },
      create: {
        doctorId,
        date,
        checkInTime: data.checkInTime ? new Date(data.checkInTime) : null,
        checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : null,
        status: data.status,
      },
    });
  },

  async getAttendance(
    doctorId: string,
    query: { startDate?: string; endDate?: string; page?: number; limit?: number },
  ) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    const page = query.page || 1;
    const limit = query.limit || 30;
    const where: any = { doctorId };

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const [data, total] = await Promise.all([
      prisma.doctorAttendance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.doctorAttendance.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  // ── Leaves ───────────────────────────────────────────

  async requestLeave(
    doctorId: string,
    data: {
      startDate: string;
      endDate: string;
      type: 'SICK' | 'VACATION' | 'PERSONAL' | 'EMERGENCY';
      reason?: string;
    },
  ) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      throw new AppError('End date must be after start date', 400);
    }

    return prisma.doctorLeave.create({
      data: {
        doctorId,
        startDate,
        endDate,
        type: data.type,
        reason: data.reason,
      },
    });
  },

  async getLeaves(
    doctorId: string,
    query: { status?: 'PENDING' | 'APPROVED' | 'REJECTED'; page?: number; limit?: number },
  ) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = { doctorId };

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      prisma.doctorLeave.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      prisma.doctorLeave.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async updateLeaveStatus(
    doctorId: string,
    leaveId: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    const leave = await prisma.doctorLeave.findFirst({
      where: { id: leaveId, doctorId },
    });
    if (!leave) {
      throw new AppError('Leave request not found', 404);
    }
    if (leave.status !== 'PENDING') {
      throw new AppError('Only pending leave requests can be updated', 400);
    }

    return prisma.doctorLeave.update({
      where: { id: leaveId },
      data: { status },
    });
  },
};
