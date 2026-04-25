import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../services/auth.service.js', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    verifyToken: vi.fn(),
  },
}));
vi.mock('../lib/metrics.js', () => ({
  httpRequestDuration: { startTimer: vi.fn().mockReturnValue(vi.fn()) },
  httpRequestTotal: { inc: vi.fn() },
}));

const { default: app } = await import('../index.js');
const { authService } = await import('../services/auth.service.js');

const MOCK_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  role: 'PATIENT',
};

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /v1/auth/register', () => {
    it('should signup a new user', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };
      vi.mocked(authService.register).mockResolvedValue(MOCK_USER as any);

      const res = await request(app).post('/v1/auth/register').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(MOCK_USER.id);
    });
  });

  describe('POST /v1/auth/login', () => {
    it('should login and return tokens', async () => {
      const payload = { email: 'test@example.com', password: 'Password123!' };
      vi.mocked(authService.login).mockResolvedValue({ 
        user: MOCK_USER, 
        accessToken: 'access-token', 
        refreshToken: 'refresh-token' 
      } as any);

      const res = await request(app).post('/v1/auth/login').send(payload);
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe('access-token');
    });
  });});
