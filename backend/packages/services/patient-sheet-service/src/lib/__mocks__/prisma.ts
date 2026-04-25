import { type Mock, vi } from 'vitest';

type MockModel = Record<string, Mock>;

const prisma: {
  patientSheet: MockModel;
  $queryRaw: Mock;
  $transaction: Mock;
  $disconnect: Mock;
} = {
  patientSheet: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  $disconnect: vi.fn(),
};

export { prisma };
export default prisma;
