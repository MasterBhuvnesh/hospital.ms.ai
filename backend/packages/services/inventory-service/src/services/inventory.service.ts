import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';

export const inventoryService = {
  // ── Medicines ──────────────────────────────────────────

  async findAllMedicines(query: {
    name?: string;
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [data, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.medicine.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findMedicineById(id: string) {
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: { batches: true },
    });

    if (!medicine) {
      throw new AppError('Medicine not found', 404);
    }

    return medicine;
  },

  async createMedicine(data: {
    name: string;
    genericName: string;
    manufacturer: string;
    category: string;
    description?: string;
    unitPrice: number;
    requiresPrescription?: boolean;
  }) {
    return prisma.medicine.create({ data });
  },

  async updateMedicine(
    id: string,
    data: {
      name?: string;
      genericName?: string;
      manufacturer?: string;
      category?: string;
      description?: string;
      unitPrice?: number;
      requiresPrescription?: boolean;
      isActive?: boolean;
    },
  ) {
    const medicine = await prisma.medicine.findUnique({ where: { id } });
    if (!medicine) {
      throw new AppError('Medicine not found', 404);
    }

    return prisma.medicine.update({ where: { id }, data });
  },

  // ── Stock ──────────────────────────────────────────────

  async addBatch(data: {
    medicineId: string;
    batchNumber: string;
    quantity: number;
    costPrice: number;
    expiryDate: string;
    vendorId?: string;
  }) {
    const medicine = await prisma.medicine.findUnique({ where: { id: data.medicineId } });
    if (!medicine) {
      throw new AppError('Medicine not found', 404);
    }

    return prisma.stockBatch.create({
      data: {
        ...data,
        expiryDate: new Date(data.expiryDate),
      },
    });
  },

  async getStock(medicineId: string) {
    const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });
    if (!medicine) {
      throw new AppError('Medicine not found', 404);
    }

    const batches = await prisma.stockBatch.findMany({
      where: { medicineId },
      orderBy: { expiryDate: 'asc' },
    });

    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    const totalReserved = batches.reduce((sum, b) => sum + b.reservedQty, 0);
    const availableQty = totalQuantity - totalReserved;

    return {
      medicineId,
      medicineName: medicine.name,
      totalQuantity,
      totalReserved,
      availableQty,
      batches,
    };
  },

  // ── Vendors ────────────────────────────────────────────

  async findAllVendors(query: {
    name?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [data, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.vendor.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async createVendor(data: {
    name: string;
    contactName: string;
    email?: string;
    phone: string;
    address?: string;
  }) {
    return prisma.vendor.create({ data });
  },

  async updateVendor(
    id: string,
    data: {
      name?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
      isActive?: boolean;
    },
  ) {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    return prisma.vendor.update({ where: { id }, data });
  },

  // ── Purchase Orders ────────────────────────────────────

  async findAllOrders(query: {
    vendorId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.vendorId) {
      where.vendorId = query.vendorId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true, vendor: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async createOrder(data: {
    vendorId: string;
    items: {
      medicineId: string;
      quantity: number;
      unitPrice: number;
    }[];
  }) {
    const { items, vendorId } = data;

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    return prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          vendorId,
          totalAmount,
          items: {
            create: items,
          },
        },
        include: { items: true, vendor: true },
      });

      return order;
    });
  },

  async updateOrderStatus(id: string, status: string) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) {
      throw new AppError('Purchase order not found', 404);
    }

    const updateData: any = { status };

    if (status === 'ORDERED') {
      updateData.orderedAt = new Date();
    }
    if (status === 'RECEIVED') {
      updateData.receivedAt = new Date();
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { items: true, vendor: true },
    });
  },

  // ── Alerts ─────────────────────────────────────────────

  async getAlerts(query: {
    medicineId?: string;
    alertType?: string;
    isResolved?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.medicineId) {
      where.medicineId = query.medicineId;
    }
    if (query.alertType) {
      where.alertType = query.alertType;
    }
    if (query.isResolved !== undefined) {
      where.isResolved = query.isResolved;
    }

    const [data, total] = await Promise.all([
      prisma.stockAlert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockAlert.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async resolveAlert(id: string) {
    const alert = await prisma.stockAlert.findUnique({ where: { id } });
    if (!alert) {
      throw new AppError('Stock alert not found', 404);
    }
    if (alert.isResolved) {
      throw new AppError('Alert is already resolved', 400);
    }

    return prisma.stockAlert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });
  },
};
