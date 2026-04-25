import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('./lib/prisma.js');

const { default: app } = await import('./index.js');

describe('Index Integration', () => {
  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /metrics should return 200', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('appointment_');
  });
});
