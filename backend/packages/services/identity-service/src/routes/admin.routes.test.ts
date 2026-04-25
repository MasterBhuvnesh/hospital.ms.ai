import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../services/admin.service.js', () => ({
  adminService: {
    listUsers: vi.fn(),
    lockUser: vi.fn(),
  },
}));
vi.mock('../lib/metrics.js', () => ({
  httpRequestDuration: { startTimer: vi.fn().mockReturnValue(vi.fn()) },
  httpRequestTotal: { inc: vi.fn() },
}));

const { default: app } = await import('../index.js');
const { adminService } = await import('../services/admin.service.js');

const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';
const AUTH_HEADERS = {
  'Authorization': 'Bearer valid-token'
};

describe('Admin Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mock('../middleware/auth.js', () => ({
      authenticate: vi.fn((req, res, next) => {
        req.user = { id: MOCK_ID, role: 'ADMIN' };
        next();
      }),
      requireRole: vi.fn(() => (req: any, res: any, next: any) => next())
    }));
  });

  describe('GET /v1/admin/users', () => {
    it('should list users', async () => {
      vi.mocked(adminService.listUsers).mockResolvedValue({ data: [], total: 0 } as any);

      const res = await request(app)
        .get('/v1/admin/users')
        .set(AUTH_HEADERS);

      expect(res.status).toBe(200);
    });
  });
});
