import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';

export const billingService = {
  // ── Invoice CRUD ───────────────────────────────────

  async findAllInvoices(query: {
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
      prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payments: true },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  async findInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return invoice;
  },

  async createInvoice(data: {
    patientId: string;
    hospitalId?: string;
    appointmentId?: string;
    subtotal: number;
    discount?: number;
    tax?: number;
    totalAmount: number;
    dueDate?: string;
    notes?: string;
    items: {
      type: string;
      referenceId?: string;
      description: string;
      quantity?: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  }) {
    const invoiceNumber = await generateInvoiceNumber();

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          patientId: data.patientId,
          hospitalId: data.hospitalId,
          appointmentId: data.appointmentId,
          subtotal: data.subtotal,
          discount: data.discount ?? 0,
          tax: data.tax ?? 0,
          totalAmount: data.totalAmount,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          notes: data.notes,
          status: 'DRAFT',
          items: {
            create: data.items.map((item) => ({
              type: item.type as any,
              referenceId: item.referenceId,
              description: item.description,
              quantity: item.quantity ?? 1,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: { items: true },
      });

      return invoice;
    });
  },

  async updateInvoiceStatus(id: string, status: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return prisma.invoice.update({
      where: { id },
      data: { status: status as any },
    });
  },

  // ── Payments ───────────────────────────────────────

  async addPayment(
    invoiceId: string,
    data: {
      amount: number;
      method: string;
      transactionId?: string;
      gatewayResponse?: any;
    },
  ) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: data.amount,
          method: data.method as any,
          transactionId: data.transactionId,
          gatewayResponse: data.gatewayResponse,
          status: 'success',
          paidAt: new Date(),
        },
      });

      const newPaidAmount = Number(invoice.paidAmount) + data.amount;
      const totalAmount = Number(invoice.totalAmount);

      let newStatus: string;
      if (newPaidAmount >= totalAmount) {
        newStatus = 'PAID';
      } else {
        newStatus = 'PARTIALLY_PAID';
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus as any,
        },
      });

      return payment;
    });
  },

  async getPayments(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paidAt: 'desc' },
    });
  },

  // ── Refunds ────────────────────────────────────────

  async requestRefund(
    paymentId: string,
    data: {
      amount: number;
      reason: string;
    },
  ) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (data.amount > Number(payment.amount)) {
      throw new AppError('Refund amount cannot exceed payment amount', 400);
    }

    return prisma.refund.create({
      data: {
        paymentId,
        invoiceId: payment.invoiceId,
        amount: data.amount,
        reason: data.reason,
        status: 'pending',
      },
    });
  },

  // ── Patient Invoices ───────────────────────────────

  async getInvoicesByPatient(patientId: string) {
    return prisma.invoice.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payments: true },
    });
  },
};

// ── Helpers ──────────────────────────────────────────

async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  const prefix = `INV-${dateStr}-`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  let seq = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoiceNumber.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}
