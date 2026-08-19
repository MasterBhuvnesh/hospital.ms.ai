import { randomUUID } from 'node:crypto';
import type {
  AuditEntry,
  AuthStore,
  HospitalRoleRecord,
  OtpRecord,
  RefreshRecord,
  UserRecord,
} from './store.js';

/**
 * An AuthStore backed by maps.
 *
 * It exists so the auth tests exercise the real service against real
 * cryptography without a database. Every rule this service enforces —
 * enumeration resistance, OTP attempt counting, refresh-family revocation — is
 * logic in AuthService, not in Postgres, so a fake store tests the thing that
 * can actually be wrong.
 *
 * The Prisma-backed store is a separate file and is covered by integration
 * tests, which need a live database and are not part of `pnpm test`.
 */
export class InMemoryAuthStore implements AuthStore {
  readonly users = new Map<string, UserRecord>();
  readonly passwords = new Map<string, string>();
  readonly roles = new Map<string, HospitalRoleRecord[]>();
  readonly refresh = new Map<string, RefreshRecord>();
  readonly otps = new Map<string, OtpRecord>();
  readonly audit: AuditEntry[] = [];

  #byEmail(email: string): UserRecord | null {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }

  #byPhone(phone: string): UserRecord | null {
    return [...this.users.values()].find((u) => u.phone === phone) ?? null;
  }

  findUserByEmail(email: string): Promise<UserRecord | null> {
    return Promise.resolve(this.#byEmail(email));
  }

  findUserByPhone(phone: string): Promise<UserRecord | null> {
    return Promise.resolve(this.#byPhone(phone));
  }

  findUserById(id: string): Promise<UserRecord | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  createUser(input: {
    fullName: string;
    email: string | null;
    phone: string | null;
    passwordHash: string;
  }): Promise<UserRecord> {
    const user: UserRecord = {
      id: randomUUID(),
      fullName: input.fullName,
      email: input.email,
      emailVerified: false,
      phone: input.phone,
      phoneVerified: false,
      isActive: true,
    };
    this.users.set(user.id, user);
    this.passwords.set(user.id, input.passwordHash);
    return Promise.resolve(user);
  }

  markContactVerified(userId: string, type: 'email' | 'phone'): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      if (type === 'email') user.emailVerified = true;
      else user.phoneVerified = true;
    }
    return Promise.resolve();
  }

  findPasswordHash(userId: string): Promise<string | null> {
    return Promise.resolve(this.passwords.get(userId) ?? null);
  }

  rolesForUser(userId: string): Promise<HospitalRoleRecord[]> {
    return Promise.resolve(this.roles.get(userId) ?? []);
  }

  createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    familyId: string;
    parentTokenHash: string | null;
    expiresAt: Date;
    userAgent: string | null;
    ip: string | null;
  }): Promise<RefreshRecord> {
    const record: RefreshRecord = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      familyId: input.familyId,
      expiresAt: input.expiresAt,
      revokedAt: null,
    };
    this.refresh.set(record.id, record);
    return Promise.resolve(record);
  }

  findRefreshByHash(tokenHash: string): Promise<RefreshRecord | null> {
    return Promise.resolve(
      [...this.refresh.values()].find((r) => r.tokenHash === tokenHash) ?? null,
    );
  }

  revokeRefresh(id: string, _replacedByHash: string | null): Promise<void> {
    const record = this.refresh.get(id);
    if (record) record.revokedAt = new Date();
    return Promise.resolve();
  }

  revokeFamily(familyId: string): Promise<void> {
    for (const record of this.refresh.values()) {
      if (record.familyId === familyId && record.revokedAt === null) record.revokedAt = new Date();
    }
    return Promise.resolve();
  }

  createOtp(input: Omit<OtpRecord, 'id' | 'attemptCount' | 'consumedAt'>): Promise<OtpRecord> {
    const record: OtpRecord = { ...input, id: randomUUID(), attemptCount: 0, consumedAt: null };
    this.otps.set(record.id, record);
    return Promise.resolve(record);
  }

  findActiveOtp(destination: string, purpose: string, now: Date): Promise<OtpRecord | null> {
    return Promise.resolve(
      [...this.otps.values()].find(
        (o) =>
          o.destination === destination &&
          o.purpose === purpose &&
          o.consumedAt === null &&
          o.expiresAt > now,
      ) ?? null,
    );
  }

  incrementOtpAttempts(id: string): Promise<void> {
    const record = this.otps.get(id);
    if (record) record.attemptCount += 1;
    return Promise.resolve();
  }

  consumeOtp(id: string, at: Date): Promise<void> {
    const record = this.otps.get(id);
    if (record) record.consumedAt = at;
    return Promise.resolve();
  }

  writeAudit(entry: AuditEntry): Promise<void> {
    this.audit.push(entry);
    return Promise.resolve();
  }
}
