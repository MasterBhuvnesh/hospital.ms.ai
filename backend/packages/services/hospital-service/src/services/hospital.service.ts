import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';
import type { DayOfWeek } from '@prisma/client';

// ── Hospital CRUD ──────────────────────────────────────

export const hospitalService = {
  async findAll(query: { city?: string; state?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = { isActive: true };

    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.state) where.state = { contains: query.state, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.hospital.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { departments: true, timings: true },
        orderBy: { name: 'asc' },
      }),
      prisma.hospital.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: { departments: true, services: true, timings: true, holidays: true },
    });
    if (!hospital) throw new AppError('Hospital not found', 404);
    return hospital;
  },

  async create(data: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email?: string;
    website?: string;
    latitude?: number;
    longitude?: number;
    totalBeds?: number;
    availableBeds?: number;
    icuBeds?: number;
    description?: string;
    imageUrl?: string;
  }) {
    return prisma.hospital.create({ data });
  },

  async update(
    id: string,
    data: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      phone?: string;
      email?: string;
      website?: string;
      latitude?: number;
      longitude?: number;
      totalBeds?: number;
      availableBeds?: number;
      icuBeds?: number;
      description?: string;
      imageUrl?: string;
    },
  ) {
    const existing = await prisma.hospital.findUnique({ where: { id } });
    if (!existing) throw new AppError('Hospital not found', 404);

    return prisma.hospital.update({ where: { id }, data });
  },

  async delete(id: string) {
    const existing = await prisma.hospital.findUnique({ where: { id } });
    if (!existing) throw new AppError('Hospital not found', 404);

    return prisma.hospital.update({
      where: { id },
      data: { isActive: false },
    });
  },
};

// ── Department CRUD ────────────────────────────────────

export const departmentService = {
  async findByHospital(hospitalId: string, query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where = { hospitalId, isActive: true };

    const [data, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.department.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) throw new AppError('Department not found', 404);
    return department;
  },

  async create(data: {
    hospitalId: string;
    name: string;
    description?: string;
    headDoctorId?: string;
    floor?: string;
  }) {
    // Verify hospital exists
    const hospital = await prisma.hospital.findUnique({ where: { id: data.hospitalId } });
    if (!hospital) throw new AppError('Hospital not found', 404);

    return prisma.department.create({ data });
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      headDoctorId?: string;
      floor?: string;
    },
  ) {
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) throw new AppError('Department not found', 404);

    return prisma.department.update({ where: { id }, data });
  },

  async delete(id: string) {
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) throw new AppError('Department not found', 404);

    return prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
  },
};

// ── HospitalService (services offered) CRUD ───────────

export const hospitalServiceService = {
  async findByHospital(hospitalId: string) {
    return prisma.hospitalService.findMany({
      where: { hospitalId, isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  async create(data: { hospitalId: string; name: string; description?: string }) {
    const hospital = await prisma.hospital.findUnique({ where: { id: data.hospitalId } });
    if (!hospital) throw new AppError('Hospital not found', 404);

    return prisma.hospitalService.create({ data });
  },

  async delete(id: string) {
    const existing = await prisma.hospitalService.findUnique({ where: { id } });
    if (!existing) throw new AppError('Hospital service not found', 404);

    return prisma.hospitalService.update({
      where: { id },
      data: { isActive: false },
    });
  },
};

// ── HospitalTiming CRUD ───────────────────────────────

export const hospitalTimingService = {
  async findByHospital(hospitalId: string) {
    return prisma.hospitalTiming.findMany({
      where: { hospitalId },
      orderBy: { dayOfWeek: 'asc' },
    });
  },

  async upsert(data: {
    hospitalId: string;
    dayOfWeek: DayOfWeek;
    openTime: string;
    closeTime: string;
    isClosed?: boolean;
  }) {
    const hospital = await prisma.hospital.findUnique({ where: { id: data.hospitalId } });
    if (!hospital) throw new AppError('Hospital not found', 404);

    return prisma.hospitalTiming.upsert({
      where: {
        hospitalId_dayOfWeek: {
          hospitalId: data.hospitalId,
          dayOfWeek: data.dayOfWeek,
        },
      },
      update: {
        openTime: data.openTime,
        closeTime: data.closeTime,
        isClosed: data.isClosed ?? false,
      },
      create: data,
    });
  },

  async bulkUpsert(
    hospitalId: string,
    timings: Array<{
      dayOfWeek: DayOfWeek;
      openTime: string;
      closeTime: string;
      isClosed?: boolean;
    }>,
  ) {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) throw new AppError('Hospital not found', 404);

    const results = await Promise.all(
      timings.map((t) =>
        prisma.hospitalTiming.upsert({
          where: {
            hospitalId_dayOfWeek: {
              hospitalId,
              dayOfWeek: t.dayOfWeek,
            },
          },
          update: {
            openTime: t.openTime,
            closeTime: t.closeTime,
            isClosed: t.isClosed ?? false,
          },
          create: { hospitalId, ...t },
        }),
      ),
    );

    return results;
  },
};

// ── HospitalHoliday CRUD ──────────────────────────────

export const hospitalHolidayService = {
  async findByHospital(hospitalId: string) {
    return prisma.hospitalHoliday.findMany({
      where: { hospitalId },
      orderBy: { date: 'asc' },
    });
  },

  async create(data: { hospitalId: string; date: Date; name: string }) {
    const hospital = await prisma.hospital.findUnique({ where: { id: data.hospitalId } });
    if (!hospital) throw new AppError('Hospital not found', 404);

    return prisma.hospitalHoliday.create({ data });
  },

  async delete(id: string) {
    const existing = await prisma.hospitalHoliday.findUnique({ where: { id } });
    if (!existing) throw new AppError('Holiday not found', 404);

    return prisma.hospitalHoliday.delete({ where: { id } });
  },
};
