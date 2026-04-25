import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mocking dependencies
vi.mock('./lib/prisma.js');
vi.mock('./lib/metrics.js', () => ({
  httpRequestDuration: { startTimer: vi.fn().mockReturnValue(vi.fn()) },
  httpRequestTotal: { inc: vi.fn() },
  register: { contentType: 'text/plain', metrics: vi.fn().mockResolvedValue('') },
}));

const { default: app } = await import('./index.js');

describe('Index Integration', () => {
  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
