import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import { registerHealth } from '@hms/middleware';

/**
 * Builds the Fastify instance without binding a port, so tests can drive the
 * application directly. Binding lives in server.ts and is never imported here.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.register(helmet);
  registerHealth(app);

  return app;
}
