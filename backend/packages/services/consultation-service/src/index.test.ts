import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
// Mocking prisma to avoid DB connection
vi.mock('./lib/prisma.js');

// We need to import the app
const { default: app } = await import('./index.js');

describe('Express App Integration', () => {
  describe('GET /health', () => {
    it('should return 200 and healthy status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('consultation-service');
    });
  });

  describe('GET /metrics', () => {
    it('should return 200 and metrics content', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.text).toContain('consultation_http_requests_total');
    });
  });

  describe('GET /', () => {
    it('should return service info', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body.service).toBe('consultation-service');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });
});
