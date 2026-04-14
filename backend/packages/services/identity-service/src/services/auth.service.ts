import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  type TokenPayload,
} from '../utils/jwt.js';
import { AppError } from '@hms/common-middleware';
import type { Role } from '@prisma/client';
import { loginAttempts, registrations } from '../lib/metrics.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../lib/notification-client.js';

export class AuthService {
  // ── Registration ─────────────────────────────────────

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: Role;
  }) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, ...(data.phone ? [{ phone: data.phone }] : [])],
      },
    });

    if (existing) {
      throw new AppError('User with this email or phone already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role ?? 'PATIENT',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    registrations.inc({ role: user.role });

    // Fire-and-forget welcome email
    sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`);

    return user;
  }

  // ── Login ────────────────────────────────────────────

  async login(data: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !user.isActive) {
      loginAttempts.inc({ status: 'failed' });
      throw new AppError('Invalid email or password', 401);
    }

    // Account lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      loginAttempts.inc({ status: 'locked' });
      throw new AppError('Account is temporarily locked. Try again later.', 423);
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);

    if (!valid) {
      const failedLogins = user.failedLogins + 1;
      const update: { failedLogins: number; lockedUntil?: Date } = { failedLogins };

      // Lock after 5 consecutive failures (15 min)
      if (failedLogins >= 5) {
        update.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        update.failedLogins = 0;
      }

      await prisma.user.update({ where: { id: user.id }, data: update });
      loginAttempts.inc({ status: 'failed' });
      throw new AppError('Invalid email or password', 401);
    }

    // Reset failed login counter on success
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null },
    });

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken();

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    // Track device
    if (data.userAgent) {
      await this.trackDevice(user.id, data.userAgent);
    }

    loginAttempts.inc({ status: 'success' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  // ── Token refresh ────────────────────────────────────

  async refresh(refreshToken: string) {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const accessToken = generateAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });

    const newRefreshToken = generateRefreshToken();

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken, expiresAt: getRefreshTokenExpiry() },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  // ── Logout ───────────────────────────────────────────

  async logout(refreshToken: string) {
    await prisma.session.deleteMany({ where: { refreshToken } });
  }

  // ── Profile ──────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  // ── Password change ──────────────────────────────────

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Current password is incorrect', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Invalidate all sessions — forces re-login
    await prisma.session.deleteMany({ where: { userId } });
  }

  // ── Session management ───────────────────────────────

  async listSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw new AppError('Session not found', 404);
    }
    await prisma.session.delete({ where: { id: sessionId } });
  }

  async revokeAllOtherSessions(userId: string, currentRefreshToken: string) {
    await prisma.session.deleteMany({
      where: {
        userId,
        refreshToken: { not: currentRefreshToken },
      },
    });
  }

  // ── Device tracking ──────────────────────────────────

  private async trackDevice(userId: string, userAgent: string) {
    const deviceName = userAgent.slice(0, 255);
    const deviceType = this.parseDeviceType(userAgent);

    const existing = await prisma.device.findFirst({
      where: { userId, deviceName },
    });

    if (existing) {
      await prisma.device.update({
        where: { id: existing.id },
        data: { lastUsedAt: new Date() },
      });
    } else {
      await prisma.device.create({
        data: { userId, deviceName, deviceType },
      });
    }
  }

  private parseDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
    if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
    return 'desktop';
  }

  async listDevices(userId: string) {
    return prisma.device.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async removeDevice(userId: string, deviceId: string) {
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device || device.userId !== userId) {
      throw new AppError('Device not found', 404);
    }
    await prisma.device.delete({ where: { id: deviceId } });
  }

  // ── Email verification ───────────────────────────────

  async requestVerification(userId: string, callbackUrl: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    if (user.isVerified) throw new AppError('Email is already verified', 400);

    // Invalidate any existing verification tokens
    await prisma.verificationToken.deleteMany({ where: { userId } });

    const token = crypto.randomBytes(32).toString('hex');

    await prisma.verificationToken.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email via notification service
    sendVerificationEmail(user.email, `${user.firstName} ${user.lastName}`, callbackUrl, token);

    return { message: 'Verification email sent', expiresIn: '24h' };
  }

  async verifyEmail(token: string) {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) throw new AppError('Invalid verification token', 400);
    if (record.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: record.id } });
      throw new AppError('Verification token has expired', 400);
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
      prisma.verificationToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    return { email: record.user.email, verified: true };
  }

  // ── Forgot / Reset password ──────────────────────────

  async forgotPassword(email: string, callbackUrl: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) return { message: 'If an account exists, a reset link has been sent.' };

    // Invalidate existing reset tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString('hex');

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email via notification service
    sendPasswordResetEmail(user.email, `${user.firstName} ${user.lastName}`, callbackUrl, token);

    return { message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt) throw new AppError('Invalid or already used reset token', 400);
    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      throw new AppError('Reset token has expired', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    return { message: 'Password has been reset. Please log in with your new password.' };
  }
}

export const authService = new AuthService();
