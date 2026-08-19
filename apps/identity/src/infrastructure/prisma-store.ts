import { clientFor } from '@hms/db';
import type { PrismaClient } from '@prisma/client';
import type { Role } from '@hms/contracts';
import type {
  AuditEntry,
  AuthStore,
  HospitalRoleRecord,
  OtpRecord,
  RefreshRecord,
  UserRecord,
} from '../modules/auth/store.js';

const SCHEMA = 'identity';

/**
 * Selects only the columns UserRecord declares.
 *
 * `select` rather than a bare find, deliberately: a `select *` would hand the
 * caller every column the model ever grows, and this record crosses into the
 * service layer and out through /auth/me. Naming the columns means a new
 * sensitive field cannot leak by being added to the schema.
 */
const USER_COLUMNS = {
  id: true,
  fullName: true,
  email: true,
  emailVerified: true,
  phone: true,
  phoneVerified: true,
  isActive: true,
} as const;

/**
 * AuthStore over Postgres.
 *
 * The Prisma client is resolved lazily and cached, because buildApp() is
 * synchronous — the all-in-one entrypoint calls it for up to eight services in
 * a row — while opening a connection is not. Nothing connects until the first
 * request.
 */
export class PrismaAuthStore implements AuthStore {
  #client: Promise<PrismaClient> | null = null;
  readonly #databaseUrl: string;

  constructor(databaseUrl: string) {
    this.#databaseUrl = databaseUrl;
  }

  #db(): Promise<PrismaClient> {
    this.#client ??= clientFor(SCHEMA, this.#databaseUrl);
    return this.#client;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const db = await this.#db();
    return db.user.findUnique({ where: { email }, select: USER_COLUMNS });
  }

  async findUserByPhone(phone: string): Promise<UserRecord | null> {
    const db = await this.#db();
    return db.user.findUnique({ where: { phone }, select: USER_COLUMNS });
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const db = await this.#db();
    return db.user.findUnique({ where: { id }, select: USER_COLUMNS });
  }

  async createUser(input: {
    fullName: string;
    email: string | null;
    phone: string | null;
    passwordHash: string;
  }): Promise<UserRecord> {
    const db = await this.#db();
    // One transaction: a user row with no credential row is an account nobody
    // can ever log into, and it would hold the unique email or phone forever.
    return db.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        credentials: { create: { passwordHash: input.passwordHash } },
      },
      select: USER_COLUMNS,
    });
  }

  async markContactVerified(userId: string, type: 'email' | 'phone'): Promise<void> {
    const db = await this.#db();
    await db.user.update({
      where: { id: userId },
      data: type === 'email' ? { emailVerified: true } : { phoneVerified: true },
    });
  }

  async findPasswordHash(userId: string): Promise<string | null> {
    const db = await this.#db();
    const credential = await db.credential.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { passwordHash: true },
    });
    return credential?.passwordHash ?? null;
  }

  async rolesForUser(userId: string): Promise<HospitalRoleRecord[]> {
    const db = await this.#db();
    const rows = await db.userHospitalRole.findMany({
      where: { userId },
      select: { hospitalId: true, role: true, isPrimary: true },
    });
    return rows.map((row) => ({ ...row, role: row.role as Role }));
  }

  async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    familyId: string;
    parentTokenHash: string | null;
    expiresAt: Date;
    userAgent: string | null;
    ip: string | null;
  }): Promise<RefreshRecord> {
    const db = await this.#db();
    return db.refreshToken.create({
      data: input,
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        familyId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  }

  async findRefreshByHash(tokenHash: string): Promise<RefreshRecord | null> {
    const db = await this.#db();
    return db.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        familyId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  }

  async revokeRefresh(id: string, replacedByHash: string | null): Promise<void> {
    const db = await this.#db();
    await db.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByHash },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    const db = await this.#db();
    await db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createOtp(
    input: Omit<OtpRecord, 'id' | 'attemptCount' | 'consumedAt'>,
  ): Promise<OtpRecord> {
    const db = await this.#db();
    const row = await db.otpChallenge.create({ data: input });
    return { ...row, destinationType: row.destinationType as 'email' | 'phone' };
  }

  async findActiveOtp(destination: string, purpose: string, now: Date): Promise<OtpRecord | null> {
    const db = await this.#db();
    const row = await db.otpChallenge.findFirst({
      where: { destination, purpose, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    return row === null
      ? null
      : { ...row, destinationType: row.destinationType as 'email' | 'phone' };
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    const db = await this.#db();
    // `increment` rather than read-modify-write: two simultaneous wrong guesses
    // must cost two attempts, not one.
    await db.otpChallenge.update({ where: { id }, data: { attemptCount: { increment: 1 } } });
  }

  async consumeOtp(id: string, at: Date): Promise<void> {
    const db = await this.#db();
    await db.otpChallenge.update({ where: { id }, data: { consumedAt: at } });
  }

  async writeAudit(entry: AuditEntry): Promise<void> {
    const db = await this.#db();
    await db.auditLog.create({ data: entry });
  }
}
