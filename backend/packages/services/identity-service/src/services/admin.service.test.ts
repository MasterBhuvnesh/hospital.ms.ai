import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(() => Promise.resolve('hashed-password')),
  },
}));

const { prisma } = await import('../lib/prisma.js');
const { adminService } = await import('./admin.service.js');

// ── Helpers ────────────────────────────────────────────
const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function fakeUser(overrides = {}) {
  return {
    id: MOCK_USER_ID,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'PATIENT',
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    it('should list users with pagination', async () => {
      const users = [fakeUser()];
      vi.mocked(prisma.user.findMany).mockResolvedValue(users as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await adminService.listUsers({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getUser', () => {
    it('should get a single user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeUser() as any);

      const result = await adminService.getUser(MOCK_USER_ID);

      expect(result.id).toBe(MOCK_USER_ID);
      expect(prisma.user.findUnique).toHaveBeenCalled();
    });

    it('should throw if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await expect(adminService.getUser(MOCK_USER_ID)).rejects.toThrow('User not found');
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeUser() as any);
      vi.mocked(prisma.user.update).mockResolvedValue(fakeUser({ isActive: false }) as any);

      const result = await adminService.updateUserStatus(MOCK_USER_ID, false);

      expect(result.isActive).toBe(false);
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: MOCK_USER_ID } });
    });
  });
});
