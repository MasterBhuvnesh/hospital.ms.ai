import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';
import { orderCreatedCounter, orderStatusUpdateCounter } from '../lib/metrics.js';

// Valid status transitions for pharmacy orders
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const pharmacyService = {
  // ── PharmacyOrder CRUD ─────────────────────────────────

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
      prisma.pharmacyOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pharmacyOrder.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findById(id: string) {
    const order = await prisma.pharmacyOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Pharmacy order not found', 404);
    }

    return order;
  },

  async create(data: {
    patientId: string;
    prescriptionId?: string;
    hospitalId?: string;
    deliveryType?: 'PICKUP' | 'HOME_DELIVERY';
    deliveryAddress?: string;
    discount?: number;
    tax?: number;
    invoiceId?: string;
    items: {
      medicineId: string;
      medicineName: string;
      quantity: number;
      unitPrice: number;
    }[];
  }) {
    const { items, discount = 0, tax = 0, ...orderData } = data;

    if (orderData.deliveryType === 'HOME_DELIVERY' && !orderData.deliveryAddress) {
      throw new AppError('Delivery address is required for home delivery', 400);
    }

    // Auto-calculate subtotal and totalAmount
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const totalAmount = subtotal - discount + tax;

    const order = await prisma.$transaction(async (tx) => {
      return tx.pharmacyOrder.create({
        data: {
          ...orderData,
          subtotal,
          discount,
          tax,
          totalAmount,
          items: {
            create: items.map((item) => ({
              medicineId: item.medicineId,
              medicineName: item.medicineName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });
    });

    // Track metrics
    orderCreatedCounter.inc({
      delivery_type: order.deliveryType,
      status: order.status,
    });

    return order;
  },

  async updateStatus(
    id: string,
    status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED',
  ) {
    const order = await prisma.pharmacyOrder.findUnique({ where: { id } });
    if (!order) {
      throw new AppError('Pharmacy order not found', 404);
    }

    const allowed = STATUS_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(status)) {
      throw new AppError(
        `Cannot transition from ${order.status} to ${status}`,
        400,
      );
    }

    const updated = await prisma.pharmacyOrder.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    // Track metrics
    orderStatusUpdateCounter.inc({ status: updated.status });

    return updated;
  },

  async cancel(id: string, _reason?: string) {
    const order = await prisma.pharmacyOrder.findUnique({ where: { id } });
    if (!order) {
      throw new AppError('Pharmacy order not found', 404);
    }

    if (order.status === 'DELIVERED') {
      throw new AppError('Cannot cancel a delivered order', 400);
    }
    if (order.status === 'CANCELLED') {
      throw new AppError('Order is already cancelled', 400);
    }

    const cancelled = await prisma.pharmacyOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { items: true },
    });

    // Track metrics
    orderStatusUpdateCounter.inc({ status: 'CANCELLED' });

    return cancelled;
  },

  async getByPatient(patientId: string) {
    return prisma.pharmacyOrder.findMany({
      where: { patientId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  },
};
