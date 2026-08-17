import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.js';
import { runWithContext, setContext } from './context.js';
import { REDACT_CENSOR } from './redact.js';

/** Collects written lines so assertions run against real pino output. */
function capture() {
  const lines: Record<string, unknown>[] = [];
  const raw: string[] = [];
  return {
    lines,
    raw,
    stream: {
      write(chunk: string) {
        raw.push(chunk);
        lines.push(JSON.parse(chunk) as Record<string, unknown>);
      },
    },
  };
}

function loggerFor(sink: ReturnType<typeof capture>) {
  return createLogger({ service: 'test', level: 'debug', destination: sink.stream });
}

describe('createLogger', () => {
  it('tags every line with its service', () => {
    const sink = capture();
    loggerFor(sink).info('started');
    expect(sink.lines[0]?.['service']).toBe('test');
  });

  it('writes the level as a label, not a number', () => {
    const sink = capture();
    loggerFor(sink).warn('careful');
    expect(sink.lines[0]?.['level']).toBe('warn');
  });

  it('gives two services in one process their own service tag', () => {
    // The single-host case: one process, several services. A shared singleton
    // would tag one of them wrongly.
    const sink = capture();
    createLogger({ service: 'scheduling', destination: sink.stream }).info('a');
    createLogger({ service: 'clinical', destination: sink.stream }).info('b');
    expect(sink.lines.map((line) => line['service'])).toEqual(['scheduling', 'clinical']);
  });
});

describe('PHI redaction', () => {
  // Architecture 7.10: this is the enforcement mechanism, not developer
  // discipline. Each of these is a disclosure if it regresses.
  const cases: [string, Record<string, unknown>, string][] = [
    ['a top-level patient name', { patientName: 'Asha Menon' }, 'Asha Menon'],
    ['a nested patient name', { patient: { name: 'Asha Menon' } }, 'Asha Menon'],
    ['an email', { email: 'asha@example.com' }, 'asha@example.com'],
    ['a phone number', { phone: '+919876543210' }, '+919876543210'],
    ['a nested phone number', { user: { phone: '+919876543210' } }, '+919876543210'],
    ['a diagnosis', { diagnosis: 'Type 2 diabetes' }, 'Type 2 diabetes'],
    ['clinical notes', { notes: 'complains of chest pain' }, 'chest pain'],
    ['an allergy list', { allergies: ['penicillin'] }, 'penicillin'],
    ['a date of birth', { dateOfBirth: '1974-03-02' }, '1974-03-02'],
    ['an OTP', { otp: '482913' }, '482913'],
    ['a password', { password: 'Password123!' }, 'Password123!'],
    ['a password hash', { passwordHash: '$argon2id$v=19$m=65536' }, 'argon2id'],
    ['a refresh token', { refreshToken: 'rt_9f8a7b6c5d' }, 'rt_9f8a7b6c5d'],
    ['a private key', { privateKey: '-----BEGIN PRIVATE KEY-----' }, 'BEGIN PRIVATE KEY'],
    ['an authorization header', { req: { headers: { authorization: 'Bearer abc.def' } } }, 'abc.def'],
    ['a cookie header', { req: { headers: { cookie: 'session=xyz' } } }, 'session=xyz'],
    ['a whole request body', { req: { body: { name: 'Asha', complaint: 'fever' } } }, 'Asha'],
    ['a break-glass reason', { reason: 'patient unconscious, next of kin absent' }, 'unconscious'],
  ];

  for (const [label, payload, leaked] of cases) {
    it(`redacts ${label}`, () => {
      const sink = capture();
      loggerFor(sink).info(payload, 'event');
      expect(sink.raw.join('')).not.toContain(leaked);
    });
  }

  it('replaces the value rather than dropping the key, so the shape survives', () => {
    const sink = capture();
    loggerFor(sink).info({ email: 'asha@example.com' }, 'event');
    expect(sink.lines[0]?.['email']).toBe(REDACT_CENSOR);
  });

  it('leaves non-sensitive fields alone', () => {
    const sink = capture();
    loggerFor(sink).info({ hospitalId: 'h_1', tokenNumber: 14, durationMs: 32 }, 'event');
    expect(sink.lines[0]?.['hospitalId']).toBe('h_1');
    expect(sink.lines[0]?.['tokenNumber']).toBe(14);
    expect(sink.lines[0]?.['durationMs']).toBe(32);
  });
});

describe('request context', () => {
  it('attaches the correlation id to every line without being passed one', () => {
    const sink = capture();
    const log = loggerFor(sink);
    runWithContext({ correlationId: 'c_123' }, () => {
      log.info('first');
      log.info('second');
    });
    expect(sink.lines.map((line) => line['correlationId'])).toEqual(['c_123', 'c_123']);
  });

  it('emits the trace id as trace_id, which is what the Loki datasource matches', () => {
    const sink = capture();
    const log = loggerFor(sink);
    runWithContext({ correlationId: 'c_1', traceId: 'abc123def456' }, () => log.info('x'));
    expect(sink.lines[0]?.['trace_id']).toBe('abc123def456');
  });

  it('omits context fields that are absent instead of writing undefined', () => {
    const sink = capture();
    const log = loggerFor(sink);
    runWithContext({ correlationId: 'c_1' }, () => log.info('x'));
    expect(sink.lines[0]).not.toHaveProperty('userId');
    expect(sink.lines[0]).not.toHaveProperty('trace_id');
  });

  it('picks up a userId set after the token is verified', () => {
    const sink = capture();
    const log = loggerFor(sink);
    runWithContext({ correlationId: 'c_1' }, () => {
      log.info('before auth');
      setContext({ userId: 'u_9' });
      log.info('after auth');
    });
    expect(sink.lines[0]).not.toHaveProperty('userId');
    expect(sink.lines[1]?.['userId']).toBe('u_9');
  });

  it('keeps concurrent requests from leaking context into each other', async () => {
    const sink = capture();
    const log = loggerFor(sink);
    const request = (id: string) =>
      runWithContext({ correlationId: id }, async () => {
        await new Promise((resolve) => setTimeout(resolve, id === 'c_a' ? 10 : 1));
        log.info('done');
      });
    await Promise.all([request('c_a'), request('c_b')]);
    // c_b finishes first, so order is b then a. Either way neither line may
    // carry the other's id.
    expect(sink.lines.map((line) => line['correlationId']).sort()).toEqual(['c_a', 'c_b']);
  });

  it('logs outside a request context without failing', () => {
    const sink = capture();
    loggerFor(sink).info('startup');
    expect(sink.lines[0]).not.toHaveProperty('correlationId');
  });
});
