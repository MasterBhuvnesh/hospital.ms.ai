import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '@hms/common-middleware';
import { authService } from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';

const router: IRouter = Router();

// ── Schemas ───────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z
    .enum(['PATIENT', 'DOCTOR', 'ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST'])
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  callbackUrl: z.string().url('callbackUrl must be a valid URL'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const revokeAllSessionsSchema = z.object({
  currentRefreshToken: z.string().min(1),
});

const requestVerificationSchema = z.object({
  callbackUrl: z.string().url('callbackUrl must be a valid URL'),
});

// ── Public routes ────────────────────────────────────

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);
    res.status(201).json({ data: user });
  }),
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login({
      ...req.body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    res.json({ data: result });
  }),
);

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken);
    res.json({ data: result });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ message: 'Logged out successfully' });
  }),
);

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email, req.body.callbackUrl);
    res.json({ data: result });
  }),
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ data: result });
  }),
);

router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.body.token);
    res.json({ data: result });
  }),
);

// ── Authenticated routes ─────────────────────────────

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user!.userId);
    res.json({ data: user });
  }),
);

router.put(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user!.userId, req.body);
    res.json({ data: user });
  }),
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
    res.json({ message: 'Password changed successfully' });
  }),
);

router.post(
  '/request-verification',
  authenticate,
  validate(requestVerificationSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.requestVerification(req.user!.userId, req.body.callbackUrl);
    res.json({ data: result });
  }),
);

// ── Session management ───────────────────────────────

router.get(
  '/sessions',
  authenticate,
  asyncHandler(async (req, res) => {
    const sessions = await authService.listSessions(req.user!.userId);
    res.json({ data: sessions });
  }),
);

router.delete(
  '/sessions/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await authService.revokeSession(req.user!.userId, req.params.id);
    res.json({ message: 'Session revoked' });
  }),
);

router.post(
  '/sessions/revoke-others',
  authenticate,
  validate(revokeAllSessionsSchema),
  asyncHandler(async (req, res) => {
    await authService.revokeAllOtherSessions(req.user!.userId, req.body.currentRefreshToken);
    res.json({ message: 'All other sessions revoked' });
  }),
);

// ── Device management ────────────────────────────────

router.get(
  '/devices',
  authenticate,
  asyncHandler(async (req, res) => {
    const devices = await authService.listDevices(req.user!.userId);
    res.json({ data: devices });
  }),
);

router.delete(
  '/devices/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await authService.removeDevice(req.user!.userId, req.params.id);
    res.json({ message: 'Device removed' });
  }),
);

export default router;
