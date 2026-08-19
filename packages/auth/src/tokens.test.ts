import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { SignJWT, importPKCS8 } from 'jose';
import { signAccessToken, verifyAccessToken, randomToken, hashToken } from './tokens.js';
import type { AccessClaims } from './tokens.js';

const OPTIONS = { issuer: 'atelier-health', audience: 'atelier-health-api', ttlMs: 900_000 };

function keypair() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return { privateKey, publicKey };
}

let priv: string;
let pub: string;
let otherPub: string;

const claims: AccessClaims = {
  sub: '11111111-1111-4111-8111-111111111111',
  hospitalId: '22222222-2222-4222-8222-222222222222',
  roles: ['DOCTOR'],
  sid: '33333333-3333-4333-8333-333333333333',
};

beforeAll(() => {
  const a = keypair();
  priv = a.privateKey;
  pub = a.publicKey;
  otherPub = keypair().publicKey;
});

describe('access tokens', () => {
  it('round-trips the claims it was given', async () => {
    const token = await signAccessToken(priv, claims, OPTIONS);
    await expect(verifyAccessToken(pub, token, OPTIONS)).resolves.toEqual(claims);
  });

  it('carries a null hospitalId for a user with no hospital yet', async () => {
    const global = { ...claims, hospitalId: null };
    const token = await signAccessToken(priv, global, OPTIONS);
    await expect(verifyAccessToken(pub, token, OPTIONS)).resolves.toEqual(global);
  });

  // --- the negative cases. Each one is an accepted-token vulnerability. ---

  it('rejects a token signed by a different key', async () => {
    const token = await signAccessToken(priv, claims, OPTIONS);
    await expect(verifyAccessToken(otherPub, token, OPTIONS)).rejects.toThrow();
  });

  it('rejects a token whose payload was edited after signing', async () => {
    const token = await signAccessToken(priv, claims, OPTIONS);
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...claims, roles: ['PLATFORM_ADMIN'] }),
      'utf8',
    ).toString('base64url');
    await expect(
      verifyAccessToken(pub, `${header}.${forged}.${signature}`, OPTIONS),
    ).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await signAccessToken(priv, claims, { ...OPTIONS, ttlMs: -1000 });
    await expect(verifyAccessToken(pub, token, OPTIONS)).rejects.toThrow();
  });

  it('rejects a token issued for another audience', async () => {
    const token = await signAccessToken(priv, claims, { ...OPTIONS, audience: 'someone-else' });
    await expect(verifyAccessToken(pub, token, OPTIONS)).rejects.toThrow();
  });

  it('rejects a token issued by another issuer', async () => {
    const token = await signAccessToken(priv, claims, { ...OPTIONS, issuer: 'not-us' });
    await expect(verifyAccessToken(pub, token, OPTIONS)).rejects.toThrow();
  });

  it('rejects an unsigned alg:none token', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({ ...claims, iss: OPTIONS.issuer, aud: OPTIONS.audience }),
    ).toString('base64url');
    await expect(verifyAccessToken(pub, `${header}.${body}.`, OPTIONS)).rejects.toThrow();
  });

  it('rejects a well-signed token whose claims do not match the schema', async () => {
    // Signed by the real key, so only the payload check can catch this. A token
    // with roles: "DOCTOR" instead of ["DOCTOR"] must not reach a role guard.
    const key = await importPKCS8(priv, 'RS256');
    const token = await new SignJWT({ ...claims, roles: 'DOCTOR' })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(OPTIONS.issuer)
      .setAudience(OPTIONS.audience)
      .setExpirationTime('15m')
      .sign(key);
    await expect(verifyAccessToken(pub, token, OPTIONS)).rejects.toThrow();
  });

  it('rejects a token carrying a role that is not in the enum', async () => {
    const key = await importPKCS8(priv, 'RS256');
    const token = await new SignJWT({ ...claims, roles: ['SUPERUSER'] })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(OPTIONS.issuer)
      .setAudience(OPTIONS.audience)
      .setExpirationTime('15m')
      .sign(key);
    await expect(verifyAccessToken(pub, token, OPTIONS)).rejects.toThrow();
  });
});

describe('refresh token material', () => {
  it('never repeats', () => {
    const seen = new Set(Array.from({ length: 500 }, () => randomToken()));
    expect(seen.size).toBe(500);
  });

  it('hashes deterministically and does not contain the raw token', () => {
    const raw = randomToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).not.toContain(raw);
    expect(hashToken(raw)).toHaveLength(64);
  });
});
