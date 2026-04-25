import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../utils/jwt.js', () => ({
  generateAccessToken: vi.fn(() => 'mock-access-token'),
  generateRefreshToken: vi.fn(() => 'mock-refresh-token'),
  getRefreshTokenExpiry: vi.fn(() => new Date(Date.now() + 10000)),
}));
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(() => Promise.resolve('hashed-password')),
    compare: vi.fn(() => Promise.resolve(true)),
  },
}));
vi.mock('../lib/metrics.js', () => ({
  loginAttempts: { inc: vi.fn() },
  registrations: { inc: vi.fn() },
}));
vi.mock('../lib/notification-client.js', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

const { prisma } = await import('../lib/prisma.js');
const { authService } = await import('./auth.service.js');
const jwt = await import('../utils/jwt.js');
const bcrypt = (await import('bcryptjs')).default;

// ── Helpers ────────────────────────────────────────────
const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function fakeUser(overrides = {}) {
  return {
    id: MOCK_USER_ID,
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    role: 'PATIENT',
    isActive: true,
    isVerified: false,
    failedLogins: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const data = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(fakeUser(data) as any);

      const result = await authService.register(data);

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.email).toBe(data.email);
    });

    it('should throw if user already exists', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(fakeUser() as any);
      await expect(authService.register({ email: 'test@example.com', password: 'p', firstName: 'f', lastName: 'l' }))
        .rejects.toThrow('User with this email or phone already exists');
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const user = fakeUser();
      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);
      vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await authService.login({ email: user.email, password: 'password123' });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should throw for invalid credentials', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await expect(authService.login({ email: 'wrong@example.com', password: 'p' }))
        .rejects.toThrow('Invalid email or password');
    });
  });
});
