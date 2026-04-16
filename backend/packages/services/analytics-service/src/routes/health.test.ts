import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../lib/metrics.js', () => ({
  httpRequestDuration: { startTimer: vi.fn(() => vi.fn()) },
  httpRequestTotal: { inc: vi.fn() },
  register: { contentType: 'text/plain', metrics: vi.fn() },
}));

const { prisma } = await import('../lib/prisma.js');
const healthRoute = (await import('./health.js')).default;

function createHealthApp() {
  const app = express();
  app.use('/health', healthRoute);
  return app;
}

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return healthy when DB is reachable', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

      const res = await request(createHealthApp()).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('analytics-service');
      expect(res.body.checks.database).toBe('ok');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('memory');
    });

    it('should return 503 when DB is unreachable', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('ECONNREFUSED'));

      const res = await request(createHealthApp()).get('/health');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
      expect(res.body.checks.database).toBe('unreachable');
    });
  });

  describe('GET /health/live', () => {
    it('should return alive', async () => {
      const res = await request(createHealthApp()).get('/health/live');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready when DB is reachable', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

      const res = await request(createHealthApp()).get('/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });

    it('should return 503 when DB is unreachable', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('ECONNREFUSED'));

      const res = await request(createHealthApp()).get('/health/ready');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('not_ready');
    });
  });
});
