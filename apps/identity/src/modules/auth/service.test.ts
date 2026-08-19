import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { verifyAccessToken } from '@hms/auth';
import { AuthService, type AuthError, type Delivery } from './service.js';
import { InMemoryAuthStore } from './memory-store.js';

const ISSUER = 'atelier-health';
const AUDIENCE = 'atelier-health-api';

let privateKey: string;
let publicKey: string;

beforeAll(() => {
  const pair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  privateKey = pair.privateKey;
  publicKey = pair.publicKey;
});

/** Captures the code instead of sending it. Nothing leaves the machine. */
class CapturingDelivery implements Delivery {
  readonly sent: { destination: string; code: string }[] = [];
  sendOtp(to: { destination: string; type: 'email' | 'phone' }, code: string): Promise<void> {
    this.sent.push({ destination: to.destination, code });
    return Promise.resolve();
  }
  get lastCode(): string {
    const last = this.sent.at(-1);
    if (!last) throw new Error('nothing was sent');
    return last.code;
  }
}

/** Resolves to the AuthError a call rejected with, and fails the test if it did not. */
async function failureOf(promise: Promise<unknown>): Promise<AuthError> {
  try {
    await promise;
  } catch (error) {
    return error as AuthError;
  }
  throw new Error('expected the call to reject, but it resolved');
}

let store: InMemoryAuthStore;
let delivery: CapturingDelivery;
let clock: Date;
let service: AuthService;

const PASSWORD = 'a-sufficiently-long-password';

function build(): AuthService {
  return new AuthService({
    store,
    delivery,
    now: () => clock,
    config: {
      jwtPrivateKey: privateKey,
      jwtIssuer: ISSUER,
      jwtAudience: AUDIENCE,
      accessTtlMs: 900_000,
      refreshTtlMs: 2_592_000_000,
      otpTtlMs: 300_000,
      otpLength: 6,
      otpMaxAttempts: 5,
    },
  });
}

beforeEach(() => {
  store = new InMemoryAuthStore();
  delivery = new CapturingDelivery();
  clock = new Date('2026-01-01T00:00:00.000Z');
  service = build();
});

describe('register', () => {
  it('creates a user reachable by email and returns a usable token pair', async () => {
    const pair = await service.register({
      fullName: 'Asha Menon',
      email: 'asha@example.com',
      password: PASSWORD,
    });

    expect(pair.tokenType).toBe('Bearer');
    expect(pair.expiresIn).toBe(900);
    const claims = await verifyAccessToken(publicKey, pair.accessToken, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    expect(claims.sub).toBe([...store.users.keys()][0]);
  });

  it('accepts a phone with no email, which is the majority patient', async () => {
    await expect(
      service.register({ fullName: 'Ravi Kumar', phone: '+919876543210', password: PASSWORD }),
    ).resolves.toBeDefined();
    expect([...store.users.values()][0]?.email).toBeNull();
  });

  it('never stores the password in the clear', async () => {
    await service.register({ fullName: 'A', email: 'a@example.com', password: PASSWORD });
    const stored = [...store.passwords.values()][0] ?? '';
    expect(stored).not.toContain(PASSWORD);
    expect(stored).toMatch(/^\$argon2id\$/);
  });

  it('rejects a duplicate email with CONFLICT', async () => {
    await service.register({ fullName: 'A', email: 'a@example.com', password: PASSWORD });
    await expect(
      service.register({ fullName: 'B', email: 'a@example.com', password: PASSWORD }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects a duplicate phone with CONFLICT', async () => {
    await service.register({ fullName: 'A', phone: '+919876543210', password: PASSWORD });
    await expect(
      service.register({ fullName: 'B', phone: '+919876543210', password: PASSWORD }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('starts every contact unverified', async () => {
    await service.register({ fullName: 'A', email: 'a@example.com', password: PASSWORD });
    const user = [...store.users.values()][0];
    expect(user?.emailVerified).toBe(false);
    expect(user?.phoneVerified).toBe(false);
  });

  it('writes an audit entry', async () => {
    await service.register({ fullName: 'A', email: 'a@example.com', password: PASSWORD });
    expect(store.audit.map((a) => a.action)).toContain('auth.register');
  });
});

describe('login', () => {
  beforeEach(async () => {
    await service.register({ fullName: 'A', email: 'a@example.com', password: PASSWORD });
  });

  it('succeeds with the right password', async () => {
    await expect(
      service.login({ email: 'a@example.com', password: PASSWORD }),
    ).resolves.toBeDefined();
  });

  it('fails with the wrong password', async () => {
    await expect(
      service.login({ email: 'a@example.com', password: 'wrong-but-long-enough' }),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  // The enumeration pair: an unknown address and a wrong password must be
  // indistinguishable to the caller, in message and in status.
  it('gives an unknown address the identical error to a wrong password', async () => {
    const unknown = await failureOf(
      service.login({ email: 'nobody@example.com', password: PASSWORD }),
    );
    const wrong = await failureOf(
      service.login({ email: 'a@example.com', password: 'wrong-but-long-enough' }),
    );

    expect(unknown.code).toBe(wrong.code);
    expect(unknown.message).toBe(wrong.message);
  });

  it('refuses a deactivated account without saying so', async () => {
    const user = [...store.users.values()][0];
    if (user) user.isActive = false;
    await expect(
      service.login({ email: 'a@example.com', password: PASSWORD }),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED', message: 'Invalid credentials' });
  });

  it('issues a token with no hospital for a user who belongs to none', async () => {
    const pair = await service.login({ email: 'a@example.com', password: PASSWORD });
    const claims = await verifyAccessToken(publicKey, pair.accessToken, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    expect(claims.hospitalId).toBeNull();
    expect(claims.roles).toEqual([]);
  });

  it('puts the primary hospital and role in the token', async () => {
    const userId = [...store.users.keys()][0] as string;
    store.roles.set(userId, [
      { hospitalId: '99999999-9999-4999-8999-999999999999', role: 'NURSE', isPrimary: false },
      { hospitalId: '88888888-8888-4888-8888-888888888888', role: 'DOCTOR', isPrimary: true },
    ]);
    const pair = await service.login({ email: 'a@example.com', password: PASSWORD });
    const claims = await verifyAccessToken(publicKey, pair.accessToken, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    expect(claims.hospitalId).toBe('88888888-8888-4888-8888-888888888888');
    expect(claims.roles).toEqual(['DOCTOR']);
  });
});

describe('refresh rotation', () => {
  let initial: string;

  beforeEach(async () => {
    const pair = await service.register({
      fullName: 'A',
      email: 'a@example.com',
      password: PASSWORD,
    });
    initial = pair.refreshToken;
  });

  it('returns a different refresh token each time', async () => {
    const next = await service.refresh(initial);
    expect(next.refreshToken).not.toBe(initial);
  });

  it('rejects an unknown token', async () => {
    await expect(service.refresh('not-a-real-token')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('rejects an expired token', async () => {
    clock = new Date('2026-03-01T00:00:00.000Z'); // past the 30 day life
    await expect(service.refresh(initial)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  // The reason rotation exists. Using a rotated token means someone has a copy.
  it('revokes the whole family when a rotated token is used again', async () => {
    const second = await service.refresh(initial);

    await expect(service.refresh(initial)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    // The thief's freshly issued token dies with the family, not just the
    // replayed one.
    await expect(service.refresh(second.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(store.audit.map((a) => a.action)).toContain('auth.refresh.reuse_detected');
  });

  it('keeps the family id across a rotation', async () => {
    await service.refresh(initial);
    const families = new Set([...store.refresh.values()].map((r) => r.familyId));
    expect(families.size).toBe(1);
  });

  it('refuses to refresh a deactivated account', async () => {
    const user = [...store.users.values()][0];
    if (user) user.isActive = false;
    await expect(service.refresh(initial)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});

describe('logout', () => {
  it('kills every token in the family', async () => {
    const pair = await service.register({
      fullName: 'A',
      email: 'a@example.com',
      password: PASSWORD,
    });
    await service.logout(pair.refreshToken);
    await expect(service.refresh(pair.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('is idempotent and silent about unknown tokens', async () => {
    await expect(service.logout('never-existed')).resolves.toBeUndefined();
  });
});

describe('otp', () => {
  const PHONE = '+919876543210';

  beforeEach(async () => {
    await service.register({ fullName: 'Ravi', phone: PHONE, password: PASSWORD });
  });

  it('delivers a code of the configured length', async () => {
    await service.requestOtp({ destination: PHONE, type: 'phone' }, 'LOGIN');
    expect(delivery.lastCode).toMatch(/^\d{6}$/);
  });

  it('never stores the code in the clear', async () => {
    await service.requestOtp({ destination: PHONE, type: 'phone' }, 'LOGIN');
    const stored = [...store.otps.values()][0];
    expect(stored?.codeHash).not.toBe(delivery.lastCode);
    expect(stored?.codeHash).toHaveLength(64);
  });

  // Enumeration again: requesting a code for a number nobody registered must
  // look exactly like requesting one for a number that exists.
  it('resolves silently for an unknown destination and sends nothing', async () => {
    await expect(
      service.requestOtp({ destination: '+919999999999', type: 'phone' }, 'LOGIN'),
    ).resolves.toBeUndefined();
    expect(delivery.sent).toHaveLength(0);
  });

  it('exchanges a correct code for tokens and verifies the contact', async () => {
    await service.requestOtp({ destination: PHONE, type: 'phone' }, 'LOGIN');
    const pair = await service.verifyOtp(
      { destination: PHONE, type: 'phone' },
      delivery.lastCode,
      'LOGIN',
    );
    expect(pair.accessToken).toBeTruthy();
    expect([...store.users.values()][0]?.phoneVerified).toBe(true);
  });

  it('rejects a wrong code and counts the attempt', async () => {
    await service.requestOtp({ destination: PHONE, type: 'phone' }, 'LOGIN');
    await expect(
      service.verifyOtp({ destination: PHONE, type: 'phone' }, '000000', 'LOGIN'),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect([...store.otps.values()][0]?.attemptCount).toBe(1);
  });

  it('locks out after the configured number of attempts', async () => {
    await service.requestOtp({ destination: PHONE, type: 'phone' }, 'LOGIN');
    const wrong = delivery.lastCode === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) {
      await service
        .verifyOtp({ destination: PHONE, type: 'phone' }, wrong, 'LOGIN')
        .catch(() => {});
    }
    // Even the CORRECT code is refused once the budget is spent.
    await expect(
      service.verifyOtp({ destination: PHONE, type: 'phone' }, delivery.lastCode, 'LOGIN'),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('cannot reuse a consumed code', async () => {
    await service.requestOtp({ destination: PHONE, type: 'phone' }, 'LOGIN');
    const code = delivery.lastCode;
    await service.verifyOtp({ destination: PHONE, type: 'phone' }, code, 'LOGIN');
    await expect(
      service.verifyOtp({ destination: PHONE, type: 'phone' }, code, 'LOGIN'),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('rejects an expired code', async () => {
    await service.requestOtp({ destination: PHONE, type: 'phone' }, 'LOGIN');
    const code = delivery.lastCode;
    clock = new Date(clock.getTime() + 300_001);
    await expect(
      service.verifyOtp({ destination: PHONE, type: 'phone' }, code, 'LOGIN'),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('refuses a second live challenge for the same destination and purpose', async () => {
    await service.requestOtp({ destination: PHONE, type: 'phone' }, 'LOGIN');
    await expect(
      service.requestOtp({ destination: PHONE, type: 'phone' }, 'LOGIN'),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('does not accept a LOGIN code for a RESET_PASSWORD challenge', async () => {
    await service.requestOtp({ destination: PHONE, type: 'phone' }, 'LOGIN');
    await expect(
      service.verifyOtp({ destination: PHONE, type: 'phone' }, delivery.lastCode, 'RESET_PASSWORD'),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});

describe('profile', () => {
  it('returns the user with their hospital roles', async () => {
    await service.register({ fullName: 'Asha', email: 'a@example.com', password: PASSWORD });
    const userId = [...store.users.keys()][0] as string;
    store.roles.set(userId, [
      { hospitalId: '88888888-8888-4888-8888-888888888888', role: 'DOCTOR', isPrimary: true },
    ]);

    const profile = await service.profile(userId);
    expect(profile).toMatchObject({ fullName: 'Asha', email: 'a@example.com' });
    expect(profile.roles).toHaveLength(1);
  });

  it('rejects an unknown user id', async () => {
    await expect(service.profile('11111111-1111-4111-8111-111111111111')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
});
