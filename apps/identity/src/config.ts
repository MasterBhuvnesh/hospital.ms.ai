import { createConfigLoader, durationSchema } from '@hms/config';
import { z } from 'zod';

/**
 * Only the keys identity actually reads. The base schema in @hms/config already
 * covers NODE_ENV, JWT_PUBLIC_KEY, REDIS_URL, the drivers and so on.
 *
 * JWT_PRIVATE_KEY is required HERE and nowhere else in the platform. identity is
 * the only service that mints tokens; every other one verifies with the public
 * half. A private key present in another service's environment is a
 * misconfiguration, and the only way to notice is for exactly one schema to ask
 * for it.
 *
 * The duration keys are redeclared rather than inherited because the base schema
 * makes every duration optional — most services need none of them — while a
 * token lifetime is not optional for the service that issues tokens. Declaring
 * them here turns "the env file forgot ACCESS_TOKEN_TTL" from a runtime
 * `undefined` into a documented default. Values are milliseconds after parsing.
 */
export const loadConfig = createConfigLoader(
  z.object({
    DATABASE_URL: z.url(),
    JWT_PRIVATE_KEY: z.string().min(1),

    ACCESS_TOKEN_TTL: durationSchema.default(15 * 60_000),
    REFRESH_TOKEN_TTL: durationSchema.default(30 * 24 * 60 * 60_000),

    OTP_TTL: durationSchema.default(5 * 60_000),
    OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(6),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

    // Deliberately much stricter than the global limit. Login and OTP are the
    // two endpoints worth brute-forcing, and they are the two this service has.
    RATE_LIMIT_AUTH: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_WINDOW: durationSchema.default(60_000),
  }),
);

export type IdentityConfig = ReturnType<typeof loadConfig>;
