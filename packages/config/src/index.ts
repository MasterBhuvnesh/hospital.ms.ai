import { config as loadDotenv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const APP_ENV_VALUES = ['development', 'testing', 'container', 'production'] as const;
type AppEnv = (typeof APP_ENV_VALUES)[number];

const LOG_LEVEL_VALUES = ['trace', 'debug', 'info', 'warn', 'error'] as const;
type LogLevel = (typeof LOG_LEVEL_VALUES)[number];

const STORAGE_DRIVER_VALUES = ['s3-compatible', 'aws-s3'] as const;
type StorageDriver = (typeof STORAGE_DRIVER_VALUES)[number];

const SMS_DRIVER_VALUES = ['console', 'msg91', 'gupshup', 'twilio', 'sns'] as const;
type SmsDriver = (typeof SMS_DRIVER_VALUES)[number];

const EMAIL_DRIVER_VALUES = ['smtp', 'console'] as const;
type EmailDriver = (typeof EMAIL_DRIVER_VALUES)[number];

const PUSH_DRIVER_VALUES = ['console', 'expo'] as const;
type PushDriver = (typeof PUSH_DRIVER_VALUES)[number];

const WHATSAPP_DRIVER_VALUES = ['console', 'cloud-api'] as const;
type WhatsappDriver = (typeof WHATSAPP_DRIVER_VALUES)[number];

const PAYMENT_DRIVER_VALUES = ['stub', 'razorpay'] as const;
type PaymentDriver = (typeof PAYMENT_DRIVER_VALUES)[number];

const LLM_DRIVER_VALUES = ['stub', 'openai-compatible'] as const;
type LlmDriver = (typeof LLM_DRIVER_VALUES)[number];

const DRIVER_DEFAULTS = {
  STORAGE_DRIVER: 's3-compatible' as const,
  SMS_DRIVER: 'console' as const,
  EMAIL_DRIVER: 'smtp' as const,
  PUSH_DRIVER: 'console' as const,
  WHATSAPP_DRIVER: 'console' as const,
  PAYMENT_DRIVER: 'stub' as const,
  LLM_DRIVER: 'stub' as const,
};

const TESTING_DRIVER_DEFAULTS = {
  STORAGE_DRIVER: 's3-compatible' as const,
  SMS_DRIVER: 'console' as const,
  EMAIL_DRIVER: 'console' as const,
  PUSH_DRIVER: 'console' as const,
  WHATSAPP_DRIVER: 'console' as const,
  PAYMENT_DRIVER: 'stub' as const,
  LLM_DRIVER: 'stub' as const,
};

const DURATION_KEYS = [
  'DATABASE_STATEMENT_TIMEOUT',
  'ACCESS_TOKEN_TTL',
  'REFRESH_TOKEN_TTL',
  'OTP_TTL',
  'OTP_RESEND_COOLDOWN',
  'OTP_LOCKOUT',
  'BREAK_GLASS_TTL',
  'UPSTREAM_TIMEOUT',
  'WS_HEARTBEAT',
  'S3_PRESIGN_TTL',
  'LLM_TIMEOUT',
  'QUEUE_POSITION_PUBLISH_INTERVAL',
  'NO_SHOW_GRACE',
  'LAB_RESULT_SLA',
  'IDEMPOTENCY_KEY_TTL',
  'NOTIFY_QUIET_HOURS_START',
  'NOTIFY_QUIET_HOURS_END',
] as const;

function parseDuration(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(
      `Invalid duration format: ${value}. Expected format like 15m, 5m, 60s, 15s, 30d`,
    );
  }
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multipliers: Record<'s' | 'm' | 'h' | 'd', number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
}

const durationSchema = z.string().transform((val) => {
  return parseDuration(val);
});

const corsOriginsSchema = z.string().transform((val) => {
  return val
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
});

const baseSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    APP_ENV: z.enum(APP_ENV_VALUES).default('development'),
    LOG_LEVEL: z.enum(LOG_LEVEL_VALUES).default('info'),
    REDIS_URL: z.url(),
    REDIS_KEY_PREFIX: z.string().default('hms'),
    JWT_PUBLIC_KEY: z.string().min(1),
    JWT_ISSUER: z.string().default('atelier-health'),
    JWT_AUDIENCE: z.string().default('atelier-health-api'),
    JWT_ALGORITHM: z.string().default('RS256'),
    OTEL_ENABLED: z
      .union([z.string(), z.boolean()])
      .transform((v) => (typeof v === 'string' ? v === 'true' : v))
      .default(false),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().default('http://localhost:4318'),
    OTEL_SERVICE_NAME: z.string().optional(),
    METRICS_ENABLED: z
      .union([z.string(), z.boolean()])
      .transform((v) => (typeof v === 'string' ? v === 'true' : v))
      .default(true),
    METRICS_PATH: z.string().default('/metrics'),
    LOKI_URL: z.url().optional(),
    SENTRY_DSN: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().default(0.1),
    STORAGE_DRIVER: z.enum(STORAGE_DRIVER_VALUES).default(DRIVER_DEFAULTS.STORAGE_DRIVER),
    SMS_DRIVER: z.enum(SMS_DRIVER_VALUES).default(DRIVER_DEFAULTS.SMS_DRIVER),
    EMAIL_DRIVER: z.enum(EMAIL_DRIVER_VALUES).default(DRIVER_DEFAULTS.EMAIL_DRIVER),
    PUSH_DRIVER: z.enum(PUSH_DRIVER_VALUES).default(DRIVER_DEFAULTS.PUSH_DRIVER),
    WHATSAPP_DRIVER: z.enum(WHATSAPP_DRIVER_VALUES).default(DRIVER_DEFAULTS.WHATSAPP_DRIVER),
    PAYMENT_DRIVER: z.enum(PAYMENT_DRIVER_VALUES).default(DRIVER_DEFAULTS.PAYMENT_DRIVER),
    LLM_DRIVER: z.enum(LLM_DRIVER_VALUES).default(DRIVER_DEFAULTS.LLM_DRIVER),
    CORS_ORIGINS: z.string().optional(),
  })
  .extend(Object.fromEntries(DURATION_KEYS.map((k) => [k, z.string().optional()])));

type BaseConfig = z.infer<typeof baseSchema>;

function loadEnvFile(appEnv: AppEnv): Record<string, string> {
  const rootDir = join(process.cwd(), '..', '..');
  const envPath = join(rootDir, 'envs', `.env.${appEnv}`);
  let parsed: Record<string, string> = {};

  try {
    readFileSync(envPath, 'utf-8');
    parsed = loadDotenv({ path: envPath }).parsed ?? {};
  } catch (err) {
    const isMissing = err instanceof Error && 'code' in err && err.code === 'ENOENT';
    if (isMissing) {
      if (appEnv === 'development') {
        throw new Error(
          `Missing env file: envs/.env.${appEnv}. Create it with: cp envs/.env.example envs/.env.development`,
          { cause: err },
        );
      }
    } else {
      throw err;
    }
  }

  return parsed;
}

type ValidatedConfig = BaseConfig & Record<string, unknown>;

export function createConfigLoader<T extends z.ZodRawShape>(serviceSchema: z.ZodObject<T>) {
  const combinedSchema = baseSchema
    .extend(serviceSchema.shape)
    .superRefine((data: unknown, ctx) => {
      const d = data as ValidatedConfig;
      // In testing, all drivers must be stub/console values
      if (d.APP_ENV === 'testing') {
        for (const [key, expected] of Object.entries(TESTING_DRIVER_DEFAULTS)) {
          if (d[key] !== expected) {
            ctx.addIssue({
              code: 'custom',
              message: `${key} must be '${expected}' in testing environment`,
              path: [key],
            });
          }
        }
      }
    })
    .superRefine((data: unknown, ctx) => {
      const d = data as ValidatedConfig;
      // CORS_ORIGINS=* forbidden in production
      if (d.APP_ENV === 'production' && d.CORS_ORIGINS?.includes('*')) {
        ctx.addIssue({
          code: 'custom',
          message: 'CORS_ORIGINS must not contain * in production',
          path: ['CORS_ORIGINS'],
        });
      }
    })
    .superRefine((data: unknown, ctx) => {
      const d = data as ValidatedConfig;
      // Duration validation for known duration keys
      for (const key of DURATION_KEYS) {
        const value = d[key];
        if (value !== undefined && typeof value === 'string') {
          const match = value.match(/^(\d+)([smhd])$/);
          if (!match) {
            ctx.addIssue({
              code: 'custom',
              message: `Invalid duration format: ${value}. Expected format like 15m, 5m, 60s, 15s, 30d`,
              path: [key],
            });
          }
        }
      }
    });

  return function loadConfig(): z.infer<typeof combinedSchema> {
    const rawAppEnv = (process.env.APP_ENV ?? 'development') as AppEnv;
    if (!APP_ENV_VALUES.includes(rawAppEnv)) {
      throw new Error(
        `Invalid APP_ENV: ${rawAppEnv}. Must be one of: ${APP_ENV_VALUES.join(', ')}`,
      );
    }

    const fileEnv = loadEnvFile(rawAppEnv);
    // Precedence: process.env overrides .env file.
    // This is deliberate: in container/production there is no file and the real
    // environment is the only source. In development a stray shell variable can
    // silently override the file; this comment exists so the next person does
    // not "fix" it.
    const mergedEnv = { ...fileEnv, ...process.env } as Record<string, string>;

    const result = combinedSchema.safeParse(mergedEnv);
    if (!result.success) {
      const errorMessages = result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return `${path}: ${issue.message}`;
      });
      throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
    }

    return result.data;
  };
}

export type {
  BaseConfig,
  AppEnv,
  LogLevel,
  StorageDriver,
  SmsDriver,
  EmailDriver,
  PushDriver,
  WhatsappDriver,
  PaymentDriver,
  LlmDriver,
};
export {
  durationSchema,
  corsOriginsSchema,
  baseSchema,
  parseDuration,
  APP_ENV_VALUES,
  LOG_LEVEL_VALUES,
};
