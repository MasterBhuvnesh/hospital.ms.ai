import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mocking dependencies
vi.mock('./lib/metrics.js', () => ({
  httpRequestDuration: { startTimer: vi.fn(() => vi.fn()) },
  httpRequestTotal: { inc: vi.fn() },
  register: { contentType: 'text/plain', metrics: vi.fn().mockResolvedValue('') },
  default: { contentType: 'text/plain', metrics: vi.fn().mockResolvedValue('') },
}));

vi.mock('./middleware/auth.js', () => ({
  gatewayAuth: (req: any, res: any, next: any) => next(),
}));

vi.mock('./proxy/index.js', () => ({
  proxyTo: () => (req: any, res: any, next: any) => res.status(200).json({ proxied: true }),
}));

const { default: app } = await import('./index.js');

describe('API Gateway Integration', () => {
  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('GET /metrics should return 200', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
  });

  it('Proxied route should return 200', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe(true);
  });
});
