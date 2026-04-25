import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mocking dependencies
const mockRegister = { contentType: 'text/plain', metrics: vi.fn().mockResolvedValue('') };
vi.mock('./lib/metrics.js', () => ({
  httpRequestDuration: { startTimer: vi.fn(() => vi.fn()) },
  httpRequestTotal: { inc: vi.fn() },
  register: mockRegister,
  default: mockRegister,
}));

// Mocking middleware
vi.mock('@hms/common-middleware', async () => {
  const actual = await vi.importActual('@hms/common-middleware');
  return {
    ...actual,
    extractUser: (req: any, res: any, next: any) => next(),
    requireAuth: (req: any, res: any, next: any) => next(),
    requireRole: () => (req: any, res: any, next: any) => next(),
  };
});

const { default: app } = await import('./index.js');

describe('Lab Test Service Integration', () => {
  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('GET /metrics should return 200', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
  });
});
