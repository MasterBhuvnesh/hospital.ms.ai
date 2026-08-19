import { randomUUID, randomInt, timingSafeEqual } from 'node:crypto';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  randomToken,
  hashToken,
  type AccessClaims,
} from '@hms/auth';
import type { Role } from '@hms/contracts';
import type { AuthStore, UserRecord } from './store.js';
import type {
  LoginRequest,
  OtpPurpose,
  RegisterRequest,
  TokenPair,
  UserProfile,
} from './schemas.js';

/**
 * Thrown for anything a caller did wrong. `code` maps to the shared ErrorCode
 * enum, so routes translate to a status without a switch per handler.
 */
export class AuthError extends Error {
  constructor(
    readonly code: 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'CONFLICT' | 'RATE_LIMITED',
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface Delivery {
  /** Delivers an OTP. In development and testing this is the console driver. */
  sendOtp(to: { destination: string; type: 'email' | 'phone' }, code: string): Promise<void>;
}

export interface AuthDeps {
  store: AuthStore;
  delivery: Delivery;
  config: {
    jwtPrivateKey: string;
    jwtIssuer: string;
    jwtAudience: string;
    accessTtlMs: number;
    refreshTtlMs: number;
    otpTtlMs: number;
    otpLength: number;
    otpMaxAttempts: number;
  };
  /** Injected so tests can control expiry without sleeping. */
  now?: () => Date;
}

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

const EMPTY_CONTEXT: RequestContext = { ip: null, userAgent: null, correlationId: null };

/**
 * A pre-computed argon2id hash of a value nobody knows.
 *
 * Login verifies against this when the user does not exist, so an unknown
 * address and a wrong password take the same time. Without it, "user not found"
 * returns in microseconds while a real user costs ~50ms of argon2, and that gap
 * is a user-enumeration oracle that works over the network regardless of what
 * the error message says.
 */
let decoyHash: string | null = null;

export class AuthService {
  readonly #deps: AuthDeps;
  readonly #now: () => Date;

  constructor(deps: AuthDeps) {
    this.#deps = deps;
    this.#now = deps.now ?? ((): Date => new Date());
  }

  async register(input: RegisterRequest, ctx: RequestContext = EMPTY_CONTEXT): Promise<TokenPair> {
    const { store } = this.#deps;

    // Checked before the insert so the caller gets CONFLICT rather than a
    // unique-constraint 500. The unique indexes are still the real guarantee:
    // two simultaneous registrations both pass this check.
    if (input.email && (await store.findUserByEmail(input.email))) {
      throw new AuthError('CONFLICT', 'An account with that email already exists');
    }
    if (input.phone && (await store.findUserByPhone(input.phone))) {
      throw new AuthError('CONFLICT', 'An account with that phone number already exists');
    }

    const user = await store.createUser({
      fullName: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      passwordHash: await hashPassword(input.password),
    });

    await store.writeAudit({
      actorId: user.id,
      action: 'auth.register',
      resource: 'user',
      resourceId: user.id,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });

    return this.#issue(user, ctx);
  }

  async login(input: LoginRequest, ctx: RequestContext = EMPTY_CONTEXT): Promise<TokenPair> {
    const { store } = this.#deps;

    const user = input.email
      ? await store.findUserByEmail(input.email)
      : await store.findUserByPhone(input.phone as string);

    const hash = user ? await store.findPasswordHash(user.id) : null;

    if (!hash) {
      decoyHash ??= await hashPassword(randomToken());
      await verifyPassword(decoyHash, input.password);
      throw new AuthError('UNAUTHENTICATED', 'Invalid credentials');
    }

    // One message for every failure mode below. "No such user", "wrong
    // password" and "account disabled" are all the same sentence, because
    // distinguishing them tells an attacker which addresses are registered.
    if (!(await verifyPassword(hash, input.password)) || !user || !user.isActive) {
      throw new AuthError('UNAUTHENTICATED', 'Invalid credentials');
    }

    await store.writeAudit({
      actorId: user.id,
      action: 'auth.login',
      resource: 'user',
      resourceId: user.id,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });

    return this.#issue(user, ctx);
  }

  /**
   * Always resolves, whether or not the destination belongs to an account.
   *
   * "No account with that number" is the same enumeration leak as a login error
   * that distinguishes causes, and OTP request is unauthenticated, so anyone can
   * probe it. A code is only generated and delivered when the account exists;
   * the caller cannot tell the difference.
   */
  async requestOtp(
    to: { destination: string; type: 'email' | 'phone' },
    purpose: OtpPurpose,
    ctx: RequestContext = EMPTY_CONTEXT,
  ): Promise<void> {
    const { store, delivery, config } = this.#deps;
    const now = this.#now();

    const user =
      to.type === 'email'
        ? await store.findUserByEmail(to.destination)
        : await store.findUserByPhone(to.destination);

    if (!user || !user.isActive) return;

    // One live challenge per destination and purpose. Without this, requesting
    // repeatedly widens the guess surface: ten live codes are ten chances.
    if (await store.findActiveOtp(to.destination, purpose, now)) {
      throw new AuthError('RATE_LIMITED', 'A code was already sent. Wait for it to expire.');
    }

    const code = Array.from({ length: config.otpLength }, () => randomInt(0, 10)).join('');

    await store.createOtp({
      userId: user.id,
      destination: to.destination,
      destinationType: to.type,
      // Hashed, not stored in the clear. A database dump must not be a set of
      // usable login codes. SHA-256 is enough here for the same reason it is for
      // refresh tokens: this is compared, never cracked, within a 5 minute life.
      codeHash: hashToken(code),
      purpose,
      maxAttempts: config.otpMaxAttempts,
      expiresAt: new Date(now.getTime() + config.otpTtlMs),
    });

    await delivery.sendOtp(to, code);

    await store.writeAudit({
      actorId: user.id,
      action: 'auth.otp.request',
      resource: 'user',
      resourceId: user.id,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
  }

  async verifyOtp(
    to: { destination: string; type: 'email' | 'phone' },
    code: string,
    purpose: OtpPurpose,
    ctx: RequestContext = EMPTY_CONTEXT,
  ): Promise<TokenPair> {
    const { store } = this.#deps;
    const now = this.#now();

    const challenge = await store.findActiveOtp(to.destination, purpose, now);
    if (!challenge) throw new AuthError('UNAUTHENTICATED', 'Invalid or expired code');

    if (challenge.attemptCount >= challenge.maxAttempts) {
      throw new AuthError('RATE_LIMITED', 'Too many attempts. Request a new code.');
    }

    if (!constantTimeEquals(hashToken(code), challenge.codeHash)) {
      // Counted before the error is thrown, so a failed guess costs the caller
      // an attempt even if they disconnect immediately after sending it.
      await store.incrementOtpAttempts(challenge.id);
      throw new AuthError('UNAUTHENTICATED', 'Invalid or expired code');
    }

    await store.consumeOtp(challenge.id, now);

    const user = challenge.userId ? await store.findUserById(challenge.userId) : null;
    if (!user || !user.isActive) throw new AuthError('UNAUTHENTICATED', 'Invalid or expired code');

    // Proving control of the destination verifies it. This is the only path
    // that sets emailVerified or phoneVerified.
    await store.markContactVerified(user.id, to.type);

    return this.#issue(user, ctx);
  }

  /**
   * Rotates the refresh token, and treats a second use of an already-rotated
   * token as theft.
   *
   * Rotation alone does not detect a stolen token: the thief simply uses it
   * first and the victim's next refresh looks like the anomaly. Revoking the
   * whole family on reuse means whoever refreshes second logs the other one out,
   * so a stolen session cannot outlive the real user's next request.
   */
  async refresh(rawToken: string, ctx: RequestContext = EMPTY_CONTEXT): Promise<TokenPair> {
    const { store } = this.#deps;
    const now = this.#now();

    const record = await store.findRefreshByHash(hashToken(rawToken));
    if (!record) throw new AuthError('UNAUTHENTICATED', 'Invalid refresh token');

    if (record.revokedAt !== null) {
      await store.revokeFamily(record.familyId);
      await store.writeAudit({
        actorId: record.userId,
        action: 'auth.refresh.reuse_detected',
        resource: 'refresh_token_family',
        resourceId: record.familyId,
        ip: ctx.ip,
        correlationId: ctx.correlationId,
      });
      throw new AuthError('UNAUTHENTICATED', 'Invalid refresh token');
    }

    if (record.expiresAt <= now) throw new AuthError('UNAUTHENTICATED', 'Invalid refresh token');

    const user = await store.findUserById(record.userId);
    if (!user || !user.isActive) throw new AuthError('UNAUTHENTICATED', 'Invalid refresh token');

    return this.#issue(user, ctx, { familyId: record.familyId, rotatedFrom: record });
  }

  /** Idempotent: logging out with an unknown or already-revoked token succeeds. */
  async logout(rawToken: string, ctx: RequestContext = EMPTY_CONTEXT): Promise<void> {
    const { store } = this.#deps;
    const record = await store.findRefreshByHash(hashToken(rawToken));
    if (!record) return;

    await store.revokeFamily(record.familyId);
    await store.writeAudit({
      actorId: record.userId,
      action: 'auth.logout',
      resource: 'refresh_token_family',
      resourceId: record.familyId,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
  }

  async profile(userId: string): Promise<UserProfile> {
    const { store } = this.#deps;
    const user = await store.findUserById(userId);
    if (!user) throw new AuthError('UNAUTHENTICATED', 'Invalid credentials');

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      emailVerified: user.emailVerified,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      roles: await store.rolesForUser(user.id),
    };
  }

  async #issue(
    user: UserRecord,
    ctx: RequestContext,
    rotation?: { familyId: string; rotatedFrom: { id: string; tokenHash: string } },
  ): Promise<TokenPair> {
    const { store, config } = this.#deps;
    const now = this.#now();

    const roles = await store.rolesForUser(user.id);
    const primary = roles.find((r) => r.isPrimary) ?? roles[0];

    const claims: AccessClaims = {
      sub: user.id,
      // Null for a user who belongs to no hospital yet, which every patient is
      // between registering and their first appointment.
      hospitalId: primary?.hospitalId ?? null,
      roles: primary ? [primary.role as Role] : [],
      sid: randomUUID(),
    };

    const accessToken = await signAccessToken(config.jwtPrivateKey, claims, {
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      ttlMs: config.accessTtlMs,
    });

    const raw = randomToken();
    const familyId = rotation?.familyId ?? randomUUID();

    await store.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(raw),
      familyId,
      parentTokenHash: rotation?.rotatedFrom.tokenHash ?? null,
      expiresAt: new Date(now.getTime() + config.refreshTtlMs),
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });

    if (rotation) await store.revokeRefresh(rotation.rotatedFrom.id, hashToken(raw));

    return {
      accessToken,
      refreshToken: raw,
      expiresIn: Math.floor(config.accessTtlMs / 1000),
      tokenType: 'Bearer',
    };
  }
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, which would itself be a timing
  // signal. Both sides are SHA-256 hex here, so lengths always match, and the
  // guard is for safety rather than for the hot path.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
