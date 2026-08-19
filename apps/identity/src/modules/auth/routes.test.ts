import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { AuthService, type Delivery } from './service.js';
import { registerAuthRoutes } from './routes.js';
import { InMemoryAuthStore } from './memory-store.js';

const ISSUER = 'atelier-health';
const AUDIENCE = 'atelier-health-api';
const PASSWORD = 'a-sufficiently-long-password';

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

class CapturingDelivery implements Delivery {
  readonly sent: string[] = [];
  sendOtp(_to: { destination: string; type: 'email' | 'phone' }, code: string): Promise<void> {
    this.sent.push(code);
    return Promise.resolve();
  }
}

let app: FastifyInstance;
let store: InMemoryAuthStore;
let delivery: CapturingDelivery;

beforeEach(async () => {
  store = new InMemoryAuthStore();
  delivery = new CapturingDelivery();

  // Built directly rather than through buildApp(), which loads configuration
  // from the environment. These tests are about the HTTP contract, not about
  // whether an env file is present.
  app = Fastify({ logger: false });
  registerAuthRoutes(app, {
    service: new AuthService({
      store,
      delivery,
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
    }),
    jwtPublicKey: publicKey,
    jwtIssuer: ISSUER,
    jwtAudience: AUDIENCE,
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

async function register(body: Record<string, unknown> = {}): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { fullName: 'Asha Menon', email: 'asha@example.com', password: PASSWORD, ...body },
  });
  return response.json();
}

describe('POST /auth/register', () => {
  it('returns 201 with a token pair', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { fullName: 'Asha', email: 'asha@example.com', password: PASSWORD },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
  });

  it('returns 400 with the shared error envelope for a short password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { fullName: 'Asha', email: 'asha@example.com', password: 'short' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(response.json().error.details[0].path).toEqual(['password']);
  });

  it('returns 400 when neither email nor phone is given', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { fullName: 'Asha', password: PASSWORD },
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for a phone that is not E.164', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { fullName: 'Asha', phone: '9876543210', password: PASSWORD },
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 409 for a duplicate email', async () => {
    await register();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { fullName: 'Other', email: 'asha@example.com', password: PASSWORD },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CONFLICT');
  });

  it('never returns the password hash', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { fullName: 'Asha', email: 'asha@example.com', password: PASSWORD },
    });
    expect(response.body).not.toContain('argon2');
    expect(response.body).not.toContain(PASSWORD);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('returns 200 with a token pair', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'asha@example.com', password: PASSWORD },
    });
    expect(response.statusCode).toBe(200);
  });

  it('returns 401 for a wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'asha@example.com', password: 'wrong-but-long-enough' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('gives an unknown account the same status and body as a wrong password', async () => {
    const unknown = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@example.com', password: PASSWORD },
    });
    const wrong = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'asha@example.com', password: 'wrong-but-long-enough' },
    });
    expect(unknown.statusCode).toBe(wrong.statusCode);
    expect(unknown.body).toBe(wrong.body);
  });
});

describe('POST /auth/otp', () => {
  const PHONE = '+919876543210';

  beforeEach(async () => {
    await register({ email: undefined, phone: PHONE });
  });

  it('returns 202 for a known destination', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phone: PHONE },
    });
    expect(response.statusCode).toBe(202);
    expect(delivery.sent).toHaveLength(1);
  });

  // The enumeration check at the HTTP boundary: status, headers and body must
  // be identical whether or not the account exists.
  it('returns the identical 202 for an unknown destination', async () => {
    const known = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phone: PHONE },
    });
    const unknown = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phone: '+919999999999' },
    });
    expect(unknown.statusCode).toBe(known.statusCode);
    expect(unknown.body).toBe(known.body);
    expect(delivery.sent).toHaveLength(1);
  });

  it('never puts the code in the response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phone: PHONE },
    });
    expect(response.body).not.toContain(delivery.sent[0] as string);
  });

  it('exchanges a correct code for tokens', async () => {
    await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone: PHONE } });
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/verify',
      payload: { phone: PHONE, code: delivery.sent[0] },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().tokenType).toBe('Bearer');
  });

  it('returns 401 for a wrong code', async () => {
    await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone: PHONE } });
    const wrong = delivery.sent[0] === '000000' ? '111111' : '000000';
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/verify',
      payload: { phone: PHONE, code: wrong },
    });
    expect(response.statusCode).toBe(401);
  });

  it('returns 400 for a code that is not digits', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/otp/verify',
      payload: { phone: PHONE, code: 'abcdef' },
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('POST /auth/refresh and /auth/logout', () => {
  it('rotates and returns 200', async () => {
    const { refreshToken } = await register();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().refreshToken).not.toBe(refreshToken);
  });

  it('returns 401 when a rotated token is replayed', async () => {
    const { refreshToken } = await register();
    await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });
    const replay = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(replay.statusCode).toBe(401);
  });

  it('returns 204 on logout and 401 on the token afterwards', async () => {
    const { refreshToken } = await register();
    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken },
    });
    expect(logout.statusCode).toBe(204);

    const after = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(after.statusCode).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns the profile for a valid bearer token', async () => {
    const { accessToken } = await register();
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ fullName: 'Asha Menon', emailVerified: false });
  });

  it('returns 401 with no Authorization header', async () => {
    expect((await app.inject({ method: 'GET', url: '/auth/me' })).statusCode).toBe(401);
  });

  it('returns 401 for a token signed by another key', async () => {
    const other = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    const rogue = new AuthService({
      store,
      delivery,
      config: {
        jwtPrivateKey: other.privateKey,
        jwtIssuer: ISSUER,
        jwtAudience: AUDIENCE,
        accessTtlMs: 900_000,
        refreshTtlMs: 1000,
        otpTtlMs: 1000,
        otpLength: 6,
        otpMaxAttempts: 5,
      },
    });
    await register();
    const forged = await rogue.login({ email: 'asha@example.com', password: PASSWORD });

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${forged.accessToken}` },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects a refresh token used as a bearer token', async () => {
    const { refreshToken } = await register();
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${refreshToken}` },
    });
    expect(response.statusCode).toBe(401);
  });

  it('does not say why the token was rejected', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer garbage' },
    });
    expect(response.json().error.message).toBe('Invalid token');
  });
});
