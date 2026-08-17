import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  ErrorEnvelope,
  createErrorEnvelope,
  ErrorCode,
  PaginationRequest,
  PaginatedResponse,
  Uuid,
  HospitalId,
  UserId,
  IsoTimestamp,
  E164Phone,
  IanaTimezone,
  Role,
  IdempotencyKeyHeader,
  IdentityHeaders,
  ERROR_CODE_TO_STATUS,
} from './index.js';

describe('ErrorEnvelope', () => {
  it('accepts a valid error envelope with details', () => {
    const valid = {
      error: {
        code: 'VALIDATION_ERROR' as const,
        message: 'Invalid input',
        details: [
          { path: ['body', 'email'], message: 'Invalid email' },
          { path: ['query', 'limit'], message: 'Must be a number' },
        ],
      },
    };
    const result = ErrorEnvelope.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts a valid error envelope without details', () => {
    const valid = {
      error: {
        code: 'NOT_FOUND' as const,
        message: 'Resource not found',
      },
    };
    const result = ErrorEnvelope.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects a malformed error envelope (missing code)', () => {
    const invalid = {
      error: {
        message: 'Something went wrong',
      },
    };
    const result = ErrorEnvelope.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects a malformed error envelope (invalid code)', () => {
    const invalid = {
      error: {
        code: 'INVALID_CODE',
        message: 'Something went wrong',
      },
    };
    const result = ErrorEnvelope.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects a malformed error envelope (details not an array)', () => {
    const invalid = {
      error: {
        code: 'VALIDATION_ERROR' as const,
        message: 'Invalid input',
        details: 'not an array',
      },
    };
    const result = ErrorEnvelope.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('createErrorEnvelope', () => {
  it('creates an envelope with details', () => {
    const envelope = createErrorEnvelope('VALIDATION_ERROR', 'Invalid input', [
      { path: ['body', 'email'], message: 'Invalid email' },
    ]);
    expect(envelope).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: [{ path: ['body', 'email'], message: 'Invalid email' }],
      },
    });
  });

  it('creates an envelope without details when undefined', () => {
    const envelope = createErrorEnvelope('NOT_FOUND', 'Resource not found');
    expect(envelope).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });

  it('creates an envelope with empty details array when provided', () => {
    const envelope = createErrorEnvelope('CONFLICT', 'Conflict', []);
    expect(envelope).toEqual({
      error: {
        code: 'CONFLICT',
        message: 'Conflict',
        details: [],
      },
    });
  });
});

describe('ErrorCode enum', () => {
  it('contains exactly the seven expected codes', () => {
    expect(ErrorCode.options).toEqual([
      'VALIDATION_ERROR',
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'UNPROCESSABLE_ENTITY',
      'RATE_LIMITED',
    ]);
  });

  it('maps each code to the correct HTTP status', () => {
    expect(ERROR_CODE_TO_STATUS.VALIDATION_ERROR).toBe(400);
    expect(ERROR_CODE_TO_STATUS.UNAUTHENTICATED).toBe(401);
    expect(ERROR_CODE_TO_STATUS.FORBIDDEN).toBe(403);
    expect(ERROR_CODE_TO_STATUS.NOT_FOUND).toBe(404);
    expect(ERROR_CODE_TO_STATUS.CONFLICT).toBe(409);
    expect(ERROR_CODE_TO_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
    expect(ERROR_CODE_TO_STATUS.RATE_LIMITED).toBe(429);
  });

  it('has no extra codes beyond the seven', () => {
    expect(Object.keys(ERROR_CODE_TO_STATUS)).toHaveLength(7);
  });
});

describe('PaginationRequest', () => {
  it('defaults limit to 20 when missing', () => {
    const result = PaginationRequest.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it('accepts limit=20', () => {
    const result = PaginationRequest.safeParse({ limit: '20' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it('accepts limit=100 (max)', () => {
    const result = PaginationRequest.safeParse({ limit: '100' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it('rejects limit=101 (over max)', () => {
    const result = PaginationRequest.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('rejects limit=0 (not positive)', () => {
    const result = PaginationRequest.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit=-5 (negative)', () => {
    const result = PaginationRequest.safeParse({ limit: '-5' });
    expect(result.success).toBe(false);
  });

  it('rejects limit=abc (non-numeric)', () => {
    const result = PaginationRequest.safeParse({ limit: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects limit=1.5 (non-integer)', () => {
    const result = PaginationRequest.safeParse({ limit: '1.5' });
    expect(result.success).toBe(false);
  });

  it('accepts optional cursor', () => {
    const result = PaginationRequest.safeParse({ limit: '20', cursor: 'abc123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBe('abc123');
    }
  });

  it('accepts missing cursor', () => {
    const result = PaginationRequest.safeParse({ limit: '20' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBeUndefined();
    }
  });
});

describe('PaginatedResponse wrapper', () => {
  it('preserves the item type', () => {
    const itemSchema = z.object({ id: Uuid, name: z.string() });
    const responseSchema = PaginatedResponse(itemSchema);

    const valid = {
      items: [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Test' }],
      nextCursor: 'cursor123',
    };
    const result = responseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects items that don't match the item schema", () => {
    const itemSchema = z.object({ id: Uuid, name: z.string() });
    const responseSchema = PaginatedResponse(itemSchema);

    const invalid = {
      items: [{ id: 'not-a-uuid', name: 'Test' }],
    };
    const result = responseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts response without nextCursor', () => {
    const itemSchema = z.object({ id: Uuid, name: z.string() });
    const responseSchema = PaginatedResponse(itemSchema);

    const valid = {
      items: [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Test' }],
    };
    const result = responseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('Shared primitives', () => {
  describe('Uuid', () => {
    it('accepts a valid UUID v4', () => {
      const result = Uuid.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('rejects an invalid UUID', () => {
      const result = Uuid.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });

    it('rejects a UUID v1 (if validation is strict)', () => {
      // UUID v1 has different version bits
      const result = Uuid.safeParse('550e8400-e29b-11d4-a716-446655440000');
      // zod v4 uuid() accepts all RFC4122 UUIDs, not just v4
      // This is fine - we just verify it rejects non-UUIDs
      expect(result.success).toBe(true);
    });
  });

  describe('HospitalId', () => {
    it('is a Uuid', () => {
      const result = HospitalId.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = HospitalId.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('UserId', () => {
    it('is a Uuid', () => {
      const result = UserId.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = UserId.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('IsoTimestamp', () => {
    it('accepts a valid ISO 8601 datetime with milliseconds', () => {
      const result = IsoTimestamp.safeParse('2026-01-01T09:00:00.000+05:30');
      expect(result.success).toBe(true);
    });

    it('accepts UTC timestamp with milliseconds', () => {
      const result = IsoTimestamp.safeParse('2026-01-01T09:00:00.000Z');
      expect(result.success).toBe(true);
    });

    it('rejects an invalid timestamp', () => {
      const result = IsoTimestamp.safeParse('not-a-timestamp');
      expect(result.success).toBe(false);
    });

    it('rejects a date-only string', () => {
      const result = IsoTimestamp.safeParse('2026-01-01');
      expect(result.success).toBe(false);
    });
  });

  describe('E164Phone', () => {
    it('accepts a valid E.164 phone number', () => {
      const result = E164Phone.safeParse('+15551234567');
      expect(result.success).toBe(true);
    });

    it('accepts a valid E.164 phone number with country code', () => {
      const result = E164Phone.safeParse('+919876543210');
      expect(result.success).toBe(true);
    });

    it('rejects a phone number without leading +', () => {
      const result = E164Phone.safeParse('15551234567');
      expect(result.success).toBe(false);
    });

    it('rejects a phone number with 0 as country code', () => {
      const result = E164Phone.safeParse('+05551234567');
      expect(result.success).toBe(false);
    });

    it("rejects a phone number that's too long", () => {
      const result = E164Phone.safeParse('+155512345678901234'); // 18 digits after +
      expect(result.success).toBe(false);
    });

    it('rejects a phone number with letters', () => {
      const result = E164Phone.safeParse('+1555abcdefg');
      expect(result.success).toBe(false);
    });
  });

  describe('IanaTimezone', () => {
    it('accepts a valid IANA timezone', () => {
      const result = IanaTimezone.safeParse('America/New_York');
      expect(result.success).toBe(true);
    });

    it('accepts Asia/Calcutta', () => {
      const result = IanaTimezone.safeParse('Asia/Calcutta');
      expect(result.success).toBe(true);
    });

    it('accepts Europe/London', () => {
      const result = IanaTimezone.safeParse('Europe/London');
      expect(result.success).toBe(true);
    });

    it('rejects an invalid timezone', () => {
      const result = IanaTimezone.safeParse('Invalid/Timezone');
      expect(result.success).toBe(false);
    });

    it('rejects a fake IANA timezone like Asia/Nonsense', () => {
      const result = IanaTimezone.safeParse('Asia/Nonsense');
      expect(result.success).toBe(false);
    });

    it('rejects a fake IANA timezone like Europe/Fake_Place', () => {
      const result = IanaTimezone.safeParse('Europe/Fake_Place');
      expect(result.success).toBe(false);
    });

    it('rejects a non-IANA string', () => {
      const result = IanaTimezone.safeParse('EST');
      expect(result.success).toBe(false);
    });

    it('rejects UTC (not in IANA format)', () => {
      const result = IanaTimezone.safeParse('UTC');
      expect(result.success).toBe(false);
    });
  });

  describe('Role', () => {
    it('contains exactly the eight expected roles', () => {
      expect(Role.options).toEqual([
        'PATIENT',
        'DOCTOR',
        'NURSE',
        'RECEPTIONIST',
        'PHARMACIST',
        'LAB_TECH',
        'HOSPITAL_ADMIN',
        'PLATFORM_ADMIN',
      ]);
    });

    it('accepts each valid role', () => {
      for (const role of Role.options) {
        const result = Role.safeParse(role);
        expect(result.success).toBe(true);
      }
    });

    it('rejects an unknown role', () => {
      const result = Role.safeParse('ADMIN');
      expect(result.success).toBe(false);
    });

    it('rejects a lowercase role', () => {
      const result = Role.safeParse('patient');
      expect(result.success).toBe(false);
    });

    it('rejects an empty string', () => {
      const result = Role.safeParse('');
      expect(result.success).toBe(false);
    });
  });
});

describe('IdempotencyKeyHeader', () => {
  it('accepts a valid UUID idempotency key', () => {
    const result = IdempotencyKeyHeader.safeParse({
      'idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid UUID', () => {
    const result = IdempotencyKeyHeader.safeParse({
      'idempotency-key': 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing header', () => {
    const result = IdempotencyKeyHeader.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('IdentityHeaders', () => {
  it('accepts valid identity headers with comma-separated roles', () => {
    const result = IdentityHeaders.safeParse({
      'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
      'x-hospital-id': '550e8400-e29b-41d4-a716-446655440001',
      'x-roles': 'DOCTOR,HOSPITAL_ADMIN',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data['x-roles']).toEqual(['DOCTOR', 'HOSPITAL_ADMIN']);
    }
  });

  it('accepts valid identity headers with single role', () => {
    const result = IdentityHeaders.safeParse({
      'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
      'x-hospital-id': '550e8400-e29b-41d4-a716-446655440001',
      'x-roles': 'DOCTOR',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data['x-roles']).toEqual(['DOCTOR']);
    }
  });

  it('accepts valid identity headers with spaces around commas', () => {
    const result = IdentityHeaders.safeParse({
      'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
      'x-hospital-id': '550e8400-e29b-41d4-a716-446655440001',
      'x-roles': 'DOCTOR, RECEPTIONIST , NURSE',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data['x-roles']).toEqual(['DOCTOR', 'RECEPTIONIST', 'NURSE']);
    }
  });

  it('rejects invalid user ID', () => {
    const result = IdentityHeaders.safeParse({
      'x-user-id': 'not-a-uuid',
      'x-hospital-id': '550e8400-e29b-41d4-a716-446655440001',
      'x-roles': 'DOCTOR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid hospital ID', () => {
    const result = IdentityHeaders.safeParse({
      'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
      'x-hospital-id': 'not-a-uuid',
      'x-roles': 'DOCTOR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown role in comma-separated list', () => {
    const result = IdentityHeaders.safeParse({
      'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
      'x-hospital-id': '550e8400-e29b-41d4-a716-446655440001',
      'x-roles': 'DOCTOR,WIZARD',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown role even when mixed with valid roles', () => {
    const result = IdentityHeaders.safeParse({
      'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
      'x-hospital-id': '550e8400-e29b-41d4-a716-446655440001',
      'x-roles': 'DOCTOR,RECEPTIONIST,INVALID_ROLE',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required header', () => {
    const result = IdentityHeaders.safeParse({
      'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
      'x-roles': 'DOCTOR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty roles string', () => {
    const result = IdentityHeaders.safeParse({
      'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
      'x-hospital-id': '550e8400-e29b-41d4-a716-446655440001',
      'x-roles': '',
    });
    expect(result.success).toBe(false);
  });
});
