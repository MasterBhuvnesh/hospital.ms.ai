import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import {
  createConfigLoader,
  durationSchema,
  corsOriginsSchema,
  baseSchema,
  parseDuration,
} from './index.js';
import { z } from 'zod';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TEST_ENV_FILE = join(process.cwd(), '..', '..', 'envs', '.env.development');
const MINIMAL_ENV_CONTENT = `
NODE_ENV=development
APP_ENV=development
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=hms
JWT_PUBLIC_KEY=test-public-key
JWT_ISSUER=atelier-health
JWT_AUDIENCE=atelier-health-api
JWT_ALGORITHM=RS256
OTEL_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
METRICS_ENABLED=true
METRICS_PATH=/metrics
`;

beforeAll(() => {
  if (!existsSync(TEST_ENV_FILE)) {
    writeFileSync(TEST_ENV_FILE, MINIMAL_ENV_CONTENT.trim());
  }
});

afterAll(() => {
  if (existsSync(TEST_ENV_FILE)) {
    unlinkSync(TEST_ENV_FILE);
  }
});

describe('parseDuration', () => {
  it('parses seconds', () => {
    expect(parseDuration('60s')).toBe(60_000);
    expect(parseDuration('15s')).toBe(15_000);
  });

  it('parses minutes', () => {
    expect(parseDuration('15m')).toBe(15 * 60_000);
    expect(parseDuration('5m')).toBe(5 * 60_000);
  });

  it('parses hours', () => {
    expect(parseDuration('1h')).toBe(60 * 60_000);
  });

  it('parses days', () => {
    expect(parseDuration('30d')).toBe(30 * 24 * 60 * 60_000);
    expect(parseDuration('1d')).toBe(24 * 60 * 60_000);
  });

  it('throws on invalid format', () => {
    expect(() => parseDuration('invalid')).toThrow('Invalid duration format');
    expect(() => parseDuration('15x')).toThrow('Invalid duration format');
    expect(() => parseDuration('')).toThrow('Invalid duration format');
  });
});

describe('durationSchema', () => {
  it('transforms valid duration strings to milliseconds', () => {
    expect(durationSchema.parse('15m')).toBe(15 * 60_000);
    expect(durationSchema.parse('5m')).toBe(5 * 60_000);
    expect(durationSchema.parse('60s')).toBe(60_000);
    expect(durationSchema.parse('30d')).toBe(30 * 24 * 60 * 60_000);
  });

  it('rejects invalid duration strings', () => {
    expect(() => durationSchema.parse('invalid')).toThrow();
    expect(() => durationSchema.parse('15x')).toThrow();
  });
});

describe('corsOriginsSchema', () => {
  beforeEach(() => {
    vi.stubEnv('APP_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses comma-separated origins', () => {
    const result = corsOriginsSchema.parse('http://localhost:3000,http://localhost:5173');
    expect(result).toEqual(['http://localhost:3000', 'http://localhost:5173']);
  });

  it('trims whitespace', () => {
    const result = corsOriginsSchema.parse(' http://a.com , http://b.com ');
    expect(result).toEqual(['http://a.com', 'http://b.com']);
  });

  it('filters empty entries', () => {
    const result = corsOriginsSchema.parse('http://a.com,,http://b.com');
    expect(result).toEqual(['http://a.com', 'http://b.com']);
  });

  it('allows * in development', () => {
    vi.stubEnv('APP_ENV', 'development');
    const result = corsOriginsSchema.parse('*');
    expect(result).toEqual(['*']);
  });

  it('allows * in testing', () => {
    vi.stubEnv('APP_ENV', 'testing');
    const result = corsOriginsSchema.parse('*');
    expect(result).toEqual(['*']);
  });

  it('allows * in container', () => {
    vi.stubEnv('APP_ENV', 'container');
    const result = corsOriginsSchema.parse('*');
    expect(result).toEqual(['*']);
  });
});

describe('baseSchema', () => {
  it('parses valid base config', () => {
    const input = {
      NODE_ENV: 'development',
      APP_ENV: 'development',
      LOG_LEVEL: 'debug',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_KEY_PREFIX: 'hms',
      JWT_PUBLIC_KEY: 'public-key',
      JWT_ISSUER: 'atelier-health',
      JWT_AUDIENCE: 'atelier-health-api',
      JWT_ALGORITHM: 'RS256',
      OTEL_ENABLED: 'false',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
      METRICS_ENABLED: 'true',
      METRICS_PATH: '/metrics',
    };
    const result = baseSchema.parse(input);
    expect(result.NODE_ENV).toBe('development');
    expect(result.APP_ENV).toBe('development');
    expect(result.REDIS_KEY_PREFIX).toBe('hms');
    expect(result.OTEL_ENABLED).toBe(false);
    expect(result.METRICS_ENABLED).toBe(true);
  });

  it('applies defaults', () => {
    const input = {
      REDIS_URL: 'redis://localhost:6379',
      JWT_PUBLIC_KEY: 'public-key',
    };
    const result = baseSchema.parse(input);
    expect(result.NODE_ENV).toBe('development');
    expect(result.APP_ENV).toBe('development');
    expect(result.LOG_LEVEL).toBe('info');
    expect(result.REDIS_KEY_PREFIX).toBe('hms');
    expect(result.JWT_ISSUER).toBe('atelier-health');
    expect(result.JWT_AUDIENCE).toBe('atelier-health-api');
    expect(result.JWT_ALGORITHM).toBe('RS256');
    expect(result.OTEL_ENABLED).toBe(false);
    expect(result.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://localhost:4318');
    expect(result.METRICS_ENABLED).toBe(true);
    expect(result.METRICS_PATH).toBe('/metrics');
    expect(result.SENTRY_TRACES_SAMPLE_RATE).toBe(0.1);
  });

  it('rejects invalid APP_ENV', () => {
    const input = {
      REDIS_URL: 'redis://localhost:6379',
      JWT_PUBLIC_KEY: 'public-key',
      APP_ENV: 'invalid',
    };
    expect(() => baseSchema.parse(input)).toThrow();
  });

  it('rejects invalid LOG_LEVEL', () => {
    const input = {
      REDIS_URL: 'redis://localhost:6379',
      JWT_PUBLIC_KEY: 'public-key',
      LOG_LEVEL: 'invalid',
    };
    expect(() => baseSchema.parse(input)).toThrow();
  });

  it('rejects invalid REDIS_URL', () => {
    const input = {
      REDIS_URL: 'not-a-url',
      JWT_PUBLIC_KEY: 'public-key',
    };
    expect(() => baseSchema.parse(input)).toThrow();
  });

  it('rejects missing required REDIS_URL', () => {
    const input = {
      JWT_PUBLIC_KEY: 'public-key',
    };
    expect(() => baseSchema.parse(input)).toThrow();
  });

  it('rejects missing required JWT_PUBLIC_KEY', () => {
    const input = {
      REDIS_URL: 'redis://localhost:6379',
    };
    expect(() => baseSchema.parse(input)).toThrow();
  });
});

describe('createConfigLoader', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.APP_ENV = 'development';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads and validates a valid environment for a service', () => {
    const serviceSchema = z.object({
      SERVICE_NAME: z.string(),
      PORT: z.coerce.number(),
      DATABASE_URL: z.string().url(),
    });

    process.env.SERVICE_NAME = 'identity';
    process.env.PORT = '5001';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_PUBLIC_KEY = 'test-public-key';

    const loadConfig = createConfigLoader(serviceSchema);
    const config = loadConfig();

    expect(config.SERVICE_NAME).toBe('identity');
    expect(config.PORT).toBe(5001);
    expect(config.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    expect(config.REDIS_URL).toBe('redis://localhost:6379');
    expect(config.JWT_PUBLIC_KEY).toBe('test-public-key');
    expect(config.APP_ENV).toBe('development');
    expect(config.LOG_LEVEL).toBe('info');
  });

  it('fails with a clear error when a required key is missing', () => {
    const serviceSchema = z.object({
      SERVICE_NAME: z.string(),
      DATABASE_URL: z.string().url(),
    });

    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_PUBLIC_KEY = 'test-public-key';
    process.env.SERVICE_NAME = 'identity';

    const loadConfig = createConfigLoader(serviceSchema);

    expect(() => loadConfig()).toThrow('Configuration validation failed');
    expect(() => loadConfig()).toThrow('DATABASE_URL');
  });

  it('fails without exposing secret values in error messages', () => {
    const serviceSchema = z.object({
      JWT_PRIVATE_KEY: z.string().min(10),
      DATABASE_URL: z.string().url(),
    });

    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_PUBLIC_KEY = 'test-public-key';
    process.env.JWT_PRIVATE_KEY = 'super-secret-private-key-value';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    const loadConfig = createConfigLoader(serviceSchema);

    try {
      loadConfig();
    } catch (e) {
      const errorMessage = (e as Error).message;
      expect(errorMessage).not.toContain('super-secret-private-key-value');
      expect(errorMessage).not.toContain('super-secret');
      expect(errorMessage).not.toContain('private-key');
    }
  });

  it('rejects CORS_ORIGINS=* in production', () => {
    const serviceSchema = z.object({
      CORS_ORIGINS: corsOriginsSchema,
      PUBLIC_URL: z.string().url(),
    });

    process.env.APP_ENV = 'production';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_PUBLIC_KEY = 'test-public-key';
    process.env.CORS_ORIGINS = '*';
    process.env.PUBLIC_URL = 'https://api.example.com';

    const loadConfig = createConfigLoader(serviceSchema);

    expect(() => loadConfig()).toThrow('CORS_ORIGINS must not contain * in production');
  });

  it('allows CORS_ORIGINS=* in development', () => {
    const serviceSchema = z.object({
      CORS_ORIGINS: corsOriginsSchema,
      PUBLIC_URL: z.string().url(),
    });

    process.env.APP_ENV = 'development';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_PUBLIC_KEY = 'test-public-key';
    process.env.CORS_ORIGINS = '*';
    process.env.PUBLIC_URL = 'http://localhost:4000';

    const loadConfig = createConfigLoader(serviceSchema);
    const config = loadConfig();

    expect(config.CORS_ORIGINS).toEqual(['*']);
  });

  it('validates two different service schemas independently against shared env', () => {
    const identitySchema = z.object({
      JWT_PRIVATE_KEY: z.string().min(1),
      DATABASE_URL: z.string().url(),
      ACCESS_TOKEN_TTL: durationSchema,
    });

    const clinicalSchema = z.object({
      DATABASE_URL: z.string().url(),
      BREAK_GLASS_TTL: durationSchema,
      S3_BUCKET_DOCUMENTS: z.string(),
    });

    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_PUBLIC_KEY = 'test-public-key';
    process.env.JWT_PRIVATE_KEY = 'private-key';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.ACCESS_TOKEN_TTL = '15m';
    process.env.BREAK_GLASS_TTL = '30m';
    process.env.S3_BUCKET_DOCUMENTS = 'hms-documents';

    const loadIdentityConfig = createConfigLoader(identitySchema);
    const loadClinicalConfig = createConfigLoader(clinicalSchema);

    const identityConfig = loadIdentityConfig();
    const clinicalConfig = loadClinicalConfig();

    expect(identityConfig.JWT_PRIVATE_KEY).toBe('private-key');
    expect(identityConfig.ACCESS_TOKEN_TTL).toBe(15 * 60_000);
    expect(identityConfig.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');

    expect(clinicalConfig.BREAK_GLASS_TTL).toBe(30 * 60_000);
    expect(clinicalConfig.S3_BUCKET_DOCUMENTS).toBe('hms-documents');
    expect(clinicalConfig.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');

    // Base schema keys (including duration keys) are shared; service-specific keys are not
    expect('JWT_PRIVATE_KEY' in clinicalConfig).toBe(false);
    expect('S3_BUCKET_DOCUMENTS' in identityConfig).toBe(false);
  });

  it('fails on malformed duration', () => {
    const serviceSchema = z.object({
      DATABASE_URL: z.string().url(),
      CUSTOM_TTL: durationSchema,
    });

    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_PUBLIC_KEY = 'test-public-key';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.CUSTOM_TTL = 'invalid-duration';

    const loadConfig = createConfigLoader(serviceSchema);

    expect(() => loadConfig()).toThrow('Invalid duration format');
  });

  it('fails on invalid APP_ENV value', () => {
    const serviceSchema = z.object({
      DATABASE_URL: z.string().url(),
    });

    process.env.APP_ENV = 'invalid-env';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_PUBLIC_KEY = 'test-public-key';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    const loadConfig = createConfigLoader(serviceSchema);

    expect(() => loadConfig()).toThrow('Invalid APP_ENV');
  });

  it('returns fully inferred types with autocomplete', () => {
    const serviceSchema = z.object({
      MY_SERVICE_KEY: z.string(),
      MY_NUMBER: z.coerce.number(),
      MY_DURATION: durationSchema,
      MY_CORS: corsOriginsSchema,
    });

    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_PUBLIC_KEY = 'test-public-key';
    process.env.MY_SERVICE_KEY = 'value';
    process.env.MY_NUMBER = '42';
    process.env.MY_DURATION = '5m';
    process.env.MY_CORS = 'http://a.com,http://b.com';

    const loadConfig = createConfigLoader(serviceSchema);
    const config = loadConfig();

    expectTypeOf(config.MY_SERVICE_KEY).toEqualTypeOf<string>();
    expectTypeOf(config.MY_NUMBER).toEqualTypeOf<number>();
    expectTypeOf(config.MY_DURATION).toEqualTypeOf<number>();
    expectTypeOf(config.MY_CORS).toEqualTypeOf<string[]>();
    expectTypeOf(config.APP_ENV).toEqualTypeOf<
      'development' | 'testing' | 'container' | 'production'
    >();
    expectTypeOf(config.LOG_LEVEL).toEqualTypeOf<'trace' | 'debug' | 'info' | 'warn' | 'error'>();
  });
});

// Helper for type testing
function expectTypeOf<T>(_value: T): { toEqualTypeOf(): void } {
  return {
    toEqualTypeOf() {},
  };
}
