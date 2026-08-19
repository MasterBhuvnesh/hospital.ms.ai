import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { registerHealth } from '@hms/middleware';
import { createLogger } from '@hms/logger';
import { loadConfig } from './config.js';
import { AuthService } from './modules/auth/service.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { PrismaAuthStore } from './infrastructure/prisma-store.js';
import { ConsoleDelivery, assertDeliverable } from './infrastructure/delivery.js';
import type { AuthStore } from './modules/auth/store.js';
import type { Delivery } from './modules/auth/service.js';

export interface BuildOptions {
  /** Supplied by tests. Production reads the environment instead. */
  store?: AuthStore;
  delivery?: Delivery;
}

/**
 * Builds the Fastify instance without binding a port, so tests can drive the
 * application directly. Binding lives in server.ts and is never imported here.
 *
 * Synchronous on purpose: docker/all-in-one.mjs calls buildApp() for up to eight
 * services in a row. Anything that needs a connection is opened lazily on first
 * use — see PrismaAuthStore.
 */
export function buildApp(options: BuildOptions = {}): FastifyInstance {
  const config = loadConfig();
  assertDeliverable(config.APP_ENV, config.SMS_DRIVER, config.EMAIL_DRIVER);

  const log = createLogger({ service: 'identity', level: config.LOG_LEVEL });

  const app = Fastify({ logger: false });

  app.register(helmet);

  // Applies to every route in this service, including the ones a gateway rate
  // limit would already cover. identity is reachable directly on the Compose
  // network and inside the single-host process, so the gateway is not the only
  // way in and cannot be the only limit.
  app.register(rateLimit, {
    max: config.RATE_LIMIT_AUTH,
    timeWindow: config.RATE_LIMIT_WINDOW,
  });

  registerHealth(app);

  const service = new AuthService({
    store: options.store ?? new PrismaAuthStore(config.DATABASE_URL),
    delivery: options.delivery ?? new ConsoleDelivery(log),
    config: {
      jwtPrivateKey: config.JWT_PRIVATE_KEY,
      jwtIssuer: config.JWT_ISSUER,
      jwtAudience: config.JWT_AUDIENCE,
      accessTtlMs: config.ACCESS_TOKEN_TTL,
      refreshTtlMs: config.REFRESH_TOKEN_TTL,
      otpTtlMs: config.OTP_TTL,
      otpLength: config.OTP_LENGTH,
      otpMaxAttempts: config.OTP_MAX_ATTEMPTS,
    },
  });

  registerAuthRoutes(app, {
    service,
    jwtPublicKey: config.JWT_PUBLIC_KEY,
    jwtIssuer: config.JWT_ISSUER,
    jwtAudience: config.JWT_AUDIENCE,
  });

  return app;
}
