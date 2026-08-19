import { SignJWT, importPKCS8, importSPKI, jwtVerify, type JWTPayload } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { Role } from '@hms/contracts';

/**
 * Claims carried by an access token.
 *
 * `hospitalId` and `roles` are inside the signed token rather than looked up per
 * request, because every service verifies the token itself (architecture 7.3)
 * and a lookup would put the identity database in the hot path of all eight.
 * The cost is that a revoked role stays valid until the access token expires,
 * which is why ACCESS_TOKEN_TTL is 15m and not a day.
 */
export const AccessClaims = z.object({
  sub: z.uuid(),
  hospitalId: z.uuid().nullable(),
  roles: z.array(Role),
  sid: z.uuid(),
});

export type AccessClaims = z.infer<typeof AccessClaims>;

export interface TokenOptions {
  issuer: string;
  audience: string;
  /** Milliseconds, as packages/config emits durations. */
  ttlMs: number;
}

export async function signAccessToken(
  privateKeyPem: string,
  claims: AccessClaims,
  options: TokenOptions,
): Promise<string> {
  const key = await importPKCS8(privateKeyPem, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ ...claims } satisfies JWTPayload)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(options.issuer)
    .setAudience(options.audience)
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + Math.floor(options.ttlMs / 1000))
    .sign(key);
}

/**
 * Throws on anything wrong with the token: bad signature, wrong issuer, wrong
 * audience, expired, or a payload that does not match AccessClaims.
 *
 * `algorithms` is pinned to RS256 explicitly. Without it a token whose header
 * says `alg: none`, or an HS256 token signed with the public key as its secret,
 * would be accepted. That is the single most common JWT vulnerability and the
 * one line that prevents it.
 */
export async function verifyAccessToken(
  publicKeyPem: string,
  token: string,
  options: Pick<TokenOptions, 'issuer' | 'audience'>,
): Promise<AccessClaims> {
  const key = await importSPKI(publicKeyPem, 'RS256');
  const { payload } = await jwtVerify(token, key, {
    issuer: options.issuer,
    audience: options.audience,
    algorithms: ['RS256'],
  });

  return AccessClaims.parse(payload);
}

/** 32 bytes of CSPRNG output, url-safe. Used for refresh tokens and OTP salts. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Refresh tokens are stored as a SHA-256 digest, never in the clear: a leaked
 * database dump must not be a set of usable sessions.
 *
 * SHA-256 rather than argon2 on purpose. A refresh token is 256 bits of CSPRNG
 * output, so it has no brute-force surface for a slow hash to protect, and this
 * runs on every token refresh.
 */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
