import { z } from 'zod';

export const ErrorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE_ENTITY',
  'RATE_LIMITED',
]);

// NOT_FOUND is used for both "record does not exist" and "record exists in another
// hospital". There is no separate "forbidden, wrong hospital" code because a 403
// there would confirm the record exists, which is an information leak.

export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorDetail = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
});

export type ErrorDetail = z.infer<typeof ErrorDetail>;

export const ErrorEnvelope = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    details: z.array(ErrorDetail).optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export function createErrorEnvelope(
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

export const PaginationRequest = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
});

export type PaginationRequest = z.infer<typeof PaginationRequest>;

export const PaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().optional(),
  });

// Written out rather than inferred from the factory above. Inferring it through
// `z.ZodTypeAny` widens `items` to `any[]`, which is worse than the duplication:
// the shape is two fields, and losing the item type is the whole point of having
// a generic here.
export type PaginatedResponse<T> = {
  items: T[];
  nextCursor?: string;
};

export const Uuid = z.uuid();

export type Uuid = z.infer<typeof Uuid>;

export const HospitalId = Uuid;

export type HospitalId = Uuid;

export const UserId = Uuid;

export type UserId = Uuid;

// `offset: true` is required, not cosmetic. zod's default accepts only UTC `Z`,
// and every Indian client sends `+05:30`. Hospitals carry an IANA timezone
// (architecture 5.3) and the token day derives from it, so rejecting offsets
// would reject the timestamps this product actually receives.
export const IsoTimestamp = z.iso.datetime({ offset: true });

export type IsoTimestamp = z.infer<typeof IsoTimestamp>;

export const E164Phone = z.string().regex(/^\+[1-9]\d{1,14}$/);

export type E164Phone = z.infer<typeof E164Phone>;

const IANA_TIMEZONES = new Set(Intl.supportedValuesOf('timeZone'));

export const IanaTimezone = z
  .string()
  .refine((value) => IANA_TIMEZONES.has(value), 'Invalid IANA timezone');

export type IanaTimezone = z.infer<typeof IanaTimezone>;

export const Role = z.enum([
  'PATIENT',
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'PHARMACIST',
  'LAB_TECH',
  'HOSPITAL_ADMIN',
  'PLATFORM_ADMIN',
]);

export type Role = z.infer<typeof Role>;

export const IdempotencyKeyHeader = z.object({
  'idempotency-key': Uuid,
});

export type IdempotencyKeyHeader = z.infer<typeof IdempotencyKeyHeader>;

const RolesHeader = z
  .string()
  .transform((value) => value.split(',').map((r) => r.trim()))
  .pipe(z.array(Role));

export const IdentityHeaders = z.object({
  'x-user-id': UserId,
  'x-hospital-id': HospitalId,
  'x-roles': RolesHeader,
});

// A service MUST verify the JWT itself (architecture section 7.3) and not trust
// these headers as its only check. The gateway injects them after verification,
// but a compromised gateway or direct service access would bypass that layer.

export type IdentityHeaders = z.infer<typeof IdentityHeaders>;

export const ERROR_CODE_TO_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
};
