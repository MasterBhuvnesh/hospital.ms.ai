import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';

export const labTestService = {
  // ── LabTest CRUD ────────────────────────────────────

  async findAllTests(query: {
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = { isActive: true };

    if (query.category) {
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.labTest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.labTest.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findTestById(id: string) {
    const test = await prisma.labTest.findUnique({
      where: { id },
      include: { packageTests: { include: { package: true } } },
    });

    if (!test) {
      throw new AppError('Lab test not found', 404);
    }

    return test;
  },

  async createTest(data: {
    name: string;
    code: string;
    description?: string;
    category: string;
    price: number;
    preparationInstructions?: string;
    durationHours: number;
    sampleType: string;
  }) {
    const existing = await prisma.labTest.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new AppError('A lab test with this code already exists', 409);
    }

    return prisma.labTest.create({ data });
  },

  async updateTest(
    id: string,
    data: {
      name?: string;
      code?: string;
      description?: string;
      category?: string;
      price?: number;
      preparationInstructions?: string;
      durationHours?: number;
      sampleType?: string;
      isActive?: boolean;
    },
  ) {
    const test = await prisma.labTest.findUnique({ where: { id } });
    if (!test) {
      throw new AppError('Lab test not found', 404);
    }

    if (data.code && data.code !== test.code) {
      const existing = await prisma.labTest.findUnique({
        where: { code: data.code },
      });
      if (existing) {
        throw new AppError('A lab test with this code already exists', 409);
      }
    }

    return prisma.labTest.update({ where: { id }, data });
  },

  // ── LabBooking ──────────────────────────────────────

  async createBooking(data: {
    patientId: string;
    doctorId?: string;
    testId: string;
    hospitalId?: string;
    bookingDate: string;
    slotTime?: string;
    collectionType?: 'LAB_VISIT' | 'HOME_COLLECTION';
    collectionAddress?: string;
  }) {
    const test = await prisma.labTest.findUnique({
      where: { id: data.testId },
    });
    if (!test) {
      throw new AppError('Lab test not found', 404);
    }
    if (!test.isActive) {
      throw new AppError('This lab test is currently unavailable', 400);
    }

    if (data.collectionType === 'HOME_COLLECTION' && !data.collectionAddress) {
      throw new AppError('Collection address is required for home collection', 400);
    }

    return prisma.labBooking.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        testId: data.testId,
        hospitalId: data.hospitalId,
        bookingDate: new Date(data.bookingDate),
        slotTime: data.slotTime,
        collectionType: data.collectionType ?? 'LAB_VISIT',
        collectionAddress: data.collectionAddress,
      },
      include: { test: true },
    });
  },

  async findAllBookings(query: {
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
      prisma.labBooking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { test: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.labBooking.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async updateBookingStatus(
    id: string,
    status: 'PENDING' | 'CONFIRMED' | 'SAMPLE_COLLECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  ) {
    const booking = await prisma.labBooking.findUnique({ where: { id } });
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.status === 'CANCELLED') {
      throw new AppError('Cannot update a cancelled booking', 400);
    }
    if (booking.status === 'COMPLETED') {
      throw new AppError('Cannot update a completed booking', 400);
    }

    return prisma.labBooking.update({
      where: { id },
      data: { status },
      include: { test: true },
    });
  },

  // ── TestPackage ─────────────────────────────────────

  async findAllPackages(query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where = { isActive: true };

    const [data, total] = await Promise.all([
      prisma.testPackage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { tests: { include: { test: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.testPackage.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async createPackage(data: {
    name: string;
    description?: string;
    price: number;
    discount?: number;
    testIds: string[];
  }) {
    if (data.testIds.length === 0) {
      throw new AppError('A package must include at least one test', 400);
    }

    const tests = await prisma.labTest.findMany({
      where: { id: { in: data.testIds } },
    });
    if (tests.length !== data.testIds.length) {
      throw new AppError('One or more test IDs are invalid', 400);
    }

    return prisma.testPackage.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        discount: data.discount ?? 0,
        tests: {
          create: data.testIds.map((testId) => ({ testId })),
        },
      },
      include: { tests: { include: { test: true } } },
    });
  },
};
