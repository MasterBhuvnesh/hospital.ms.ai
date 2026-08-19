import type { Role } from '@hms/contracts';

export interface UserRecord {
  id: string;
  fullName: string;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  isActive: boolean;
}

export interface HospitalRoleRecord {
  hospitalId: string;
  role: Role;
  isPrimary: boolean;
}

export interface RefreshRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface OtpRecord {
  id: string;
  userId: string | null;
  destination: string;
  destinationType: 'email' | 'phone';
  codeHash: string;
  purpose: string;
  attemptCount: number;
  maxAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface AuditEntry {
  actorId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ip: string | null;
  correlationId: string | null;
}

/**
 * Everything the auth service needs from storage, and nothing else.
 *
 * One interface rather than a repository per table: the service is the only
 * consumer, the methods are the ones it calls, and a second implementation
 * (the in-memory fake the tests run against) is cheaper to keep in step when it
 * is one object. Splitting it into six ports would be an abstraction with one
 * production implementation each.
 *
 * The identity tables are GLOBAL — a person is one person across hospitals
 * (architecture 5.2) — so nothing here is hospital-scoped and ScopedRepository
 * deliberately does not appear.
 */
export interface AuthStore {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserByPhone(phone: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(input: {
    fullName: string;
    email: string | null;
    phone: string | null;
    passwordHash: string;
  }): Promise<UserRecord>;
  markContactVerified(userId: string, type: 'email' | 'phone'): Promise<void>;

  findPasswordHash(userId: string): Promise<string | null>;

  rolesForUser(userId: string): Promise<HospitalRoleRecord[]>;

  createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    familyId: string;
    parentTokenHash: string | null;
    expiresAt: Date;
    userAgent: string | null;
    ip: string | null;
  }): Promise<RefreshRecord>;
  findRefreshByHash(tokenHash: string): Promise<RefreshRecord | null>;
  revokeRefresh(id: string, replacedByHash: string | null): Promise<void>;
  /** Reuse detection: one compromised token invalidates every descendant. */
  revokeFamily(familyId: string): Promise<void>;

  createOtp(input: Omit<OtpRecord, 'id' | 'attemptCount' | 'consumedAt'>): Promise<OtpRecord>;
  findActiveOtp(destination: string, purpose: string, now: Date): Promise<OtpRecord | null>;
  incrementOtpAttempts(id: string): Promise<void>;
  consumeOtp(id: string, at: Date): Promise<void>;

  writeAudit(entry: AuditEntry): Promise<void>;
}
