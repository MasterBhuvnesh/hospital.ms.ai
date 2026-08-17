import type { FastifyInstance } from 'fastify';

/**
 * Liveness answers "is the process running". Readiness answers "can it serve
 * traffic". They are different questions: a service whose database is down is
 * alive but not ready, and restarting it does not help.
 */
export interface HealthChecks {
  /** Throws when a hard dependency is unavailable. */
  ready?: () => Promise<void>;
}

export function registerHealth(app: FastifyInstance, checks: HealthChecks = {}): void {
  app.get('/health/live', async () => ({ status: 'ok' }));

  app.get('/health/ready', async (_request, reply) => {
    try {
      await checks.ready?.();
      return { status: 'ok' };
    } catch {
      // Never leak which dependency failed. The reason belongs in the log.
      return reply
        .code(503)
        .send({ error: { code: 'NOT_READY', message: 'A dependency is unavailable' } });
    }
  });
}
