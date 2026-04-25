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

const { default: app } = await import('./index.js');

describe('Index Integration', () => {
  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('GET /metrics should return 200', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
  });
});
