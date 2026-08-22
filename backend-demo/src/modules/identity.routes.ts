import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { hashPassword, verifyPassword } from '../lib/passwords.js'
import { signAccess } from '../lib/jwt.js'
import { sha256, uuid, nowIso, randomToken, otpCode } from '../lib/ids.js'
import { badRequest, conflict, forbidden, gone, notFound, rateLimited, unauthorized, validationError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import type { Store } from '../lib/json-db.js'
import { audit } from '../lib/audit.js'
import { TOPICS } from '../lib/events.js'
import { normalizePhone, isValidPhone, publicUser } from '../lib/format.js'
import { ROLES } from '../lib/roles.js'
import { cfg } from '../config.js'
import { sendSms } from '../providers/sms.js'
import { sendEmail } from '../providers/email.js'

const contactSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string().min(8).max(128),
  })
  .refine((v) => v.email || v.phone, { message: 'email or phone is required' })

function findUserByContact(store: Store, identifier: string) {
  const asEmail = identifier.toLowerCase()
  const asPhone = normalizePhone(identifier)
  return (
    store.find<any>('users', (u: any) => u.email && u.email.toLowerCase() === asEmail) ??
    store.find<any>('users', (u: any) => u.phone && u.phone === asPhone)
  )
}

async function issueTokens(app: FastifyInstance, user: any) {
  const roles = (user.roles ?? []).map((r: any) => r.role)
  const primary = (user.roles ?? []).find((r: any) => r.isPrimary) ?? (user.roles ?? [])[0]
  const accessToken = await signAccess({
    sub: user.id,
    roles,
    hospitalId: primary?.hospitalId ?? null,
    sid: randomUUID(),
  })
  const refreshToken = randomToken()
  app.store.insert('refreshTokens', {
    id: uuid(),
    userId: user.id,
    familyId: uuid(),
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
    revokedAt: null,
    replacedByHash: null,
  })
  return { accessToken, refreshToken }
}

async function revokeFamily(app: FastifyInstance, tokenRow: any) {
  for (const t of app.store.filter<any>('refreshTokens', (r) => r.familyId === tokenRow.familyId)) {
    if (!t.revokedAt) t.revokedAt = nowIso()
  }
  app.store.save('refreshTokens')
}

export function identityRoutes(app: FastifyInstance) {
  const { store, bus } = app

  app.post('/api/auth/register', async (req) => {
    const parsed = contactSchema.safeParse(req.body)
    if (!parsed.success) throw validationError(parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))
    const { fullName, password } = parsed.data
    let email = parsed.data.email?.toLowerCase() ?? null
    let phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null
    if (phone && !isValidPhone(phone)) throw badRequest('Invalid phone number')

    if (email && store.find<any>('users', (u) => u.email === email)) throw conflict('Email already registered')
    if (phone && store.find<any>('users', (u) => u.phone === phone)) throw conflict('Phone already registered')

    const user = store.insert('users', {
      id: uuid(),
      fullName,
      email,
      phone,
      passwordHash: await hashPassword(password),
      isActive: true,
      emailVerified: false,
      phoneVerified: false,
      roles: [{ id: uuid(), hospitalId: null, role: 'PATIENT', isPrimary: true }],
    })

    audit(store, bus, {
      actorId: user.id,
      action: 'auth.register',
      resource: 'user',
      resourceId: user.id,
      ip: req.ip,
      correlationId: req.correlationId,
    })
    bus.publish(TOPICS.userRegistered, { userId: user.id, fullName }, {})
    const tokens = await issueTokens(app, user)
    return { status: 'ok', code: 'CREATED', data: { user: publicUser(user), tokens } }
  })

  app.post('/api/auth/login', async (req) => {
    const body = z.object({ identifier: z.string().min(3), password: z.string().min(1) }).parse(req.body)
    const user = findUserByContact(store, body.identifier.trim())
    const ok = user?.passwordHash ? await verifyPassword(body.password, user.passwordHash) : false
    if (!user || !ok || !user.isActive) throw unauthorized('Invalid credentials')
    const tokens = await issueTokens(app, user)
    audit(store, bus, {
      actorId: user.id,
      action: 'auth.login',
      resource: 'user',
      resourceId: user.id,
      ip: req.ip,
      correlationId: req.correlationId,
    })
    return { status: 'ok', code: 'OK', data: { user: publicUser(user), tokens } }
  })

  app.post('/api/auth/refresh', async (req) => {
    const body = z.object({ refreshToken: z.string().min(10) }).parse(req.body)
    const tokenHash = sha256(body.refreshToken)
    const row = store.find<any>('refreshTokens', (r) => r.tokenHash === tokenHash)
    if (!row) throw unauthorized('Invalid refresh token')
    if (row.revokedAt) {
      await revokeFamily(app, row)
      audit(store, bus, {
        actorId: row.userId,
        action: 'auth.refresh.reuse_detected',
        resource: 'session',
        resourceId: row.familyId,
        ip: req.ip,
        correlationId: req.correlationId,
      })
      throw unauthorized('Refresh token reuse detected; session revoked')
    }
    if (new Date(row.expiresAt) < new Date()) throw unauthorized('Refresh token expired')
    const user = store.byId<any>('users', row.userId)
    if (!user || !user.isActive) throw unauthorized('Account inactive')

    const next = randomToken()
    store.patch('refreshTokens', row.id, { revokedAt: nowIso(), replacedByHash: sha256(next) })
    store.insert('refreshTokens', {
      id: uuid(),
      userId: user.id,
      familyId: row.familyId,
      tokenHash: sha256(next),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
      revokedAt: null,
      replacedByHash: null,
    })
    const accessToken = await signAccess({
      sub: user.id,
      roles: (user.roles ?? []).map((r: any) => r.role),
      hospitalId: ((user.roles ?? []).find((r: any) => r.isPrimary) ?? (user.roles ?? [])[0])?.hospitalId ?? null,
      sid: randomUUID(),
    })
    return { status: 'ok', code: 'OK', data: { tokens: { accessToken, refreshToken: next } } }
  })

  app.post('/api/auth/logout', async (req) => {
    const body = z.object({ refreshToken: z.string().min(10).optional() }).parse(req.body ?? {})
    if (body.refreshToken) {
      const presented = body.refreshToken
      const row = store.find<any>('refreshTokens', (r) => r.tokenHash === sha256(presented))
      if (row) await revokeFamily(app, row)
    }
    if (req.user) {
      audit(store, bus, {
        actorId: req.user.sub,
        action: 'auth.logout',
        resource: 'session',
        ip: req.ip,
        correlationId: req.correlationId,
      })
    }
    return { status: 'ok', code: 'NO_CONTENT' }
  })

  app.get('/api/auth/me', { preHandler: requireAuth }, async (req) => {
    const user = store.byId<any>('users', req.user!.sub)
    if (!user) throw unauthorized('Unknown user')
    const hospitals = (user.roles ?? [])
      .filter((r: any) => r.hospitalId)
      .map((r: any) => ({ ...r, hospital: store.byId<any>('hospitals', r.hospitalId)?.name ?? null }))
    return { status: 'ok', code: 'OK', data: { user: publicUser(user), hospitals } }
  })

  app.post('/api/auth/otp/request', async (req) => {
    const body = z
      .object({
        destination: z.string().min(5),
        purpose: z.enum(['LOGIN', 'VERIFY_CONTACT', 'RESET_PASSWORD']),
      })
      .parse(req.body)

    const isSms = !body.destination.includes('@')
    const dest = isSms ? normalizePhone(body.destination) : body.destination.toLowerCase()

    const live = store.find<any>(
      'otps',
      (o) =>
        o.destination === dest &&
        o.purpose === body.purpose &&
        !o.consumedAt &&
        new Date(o.expiresAt) > new Date(),
    )
    if (live) throw rateLimited('A verification code is already active. Try again later.')

    const user =
      store.find<any>('users', (u) => (isSms ? u.phone === dest : u.email === dest)) ?? null

    const code = otpCode()
    store.insert('otps', {
      id: uuid(),
      destination: dest,
      channel: isSms ? 'sms' : 'email',
      purpose: body.purpose,
      codeHash: sha256(code),
      attempts: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      consumedAt: null,
    })

    let delivery: any
    try {
      delivery = isSms
        ? await sendSms(dest, `Your Atelier Health verification code: ${code} (valid 5 minutes)`)
        : await sendEmail({
            to: dest,
            subject: 'Your Atelier Health verification code',
            text: `Your verification code is ${code}. It is valid for 5 minutes.`,
          })
    } catch (e: any) {
      delivery = { ok: false, provider: e?.message }
    }

    audit(store, bus, {
      actorId: user?.id ?? null,
      action: 'auth.otp.request',
      resource: 'otp',
      resourceId: dest.slice(-4),
      ip: req.ip,
      correlationId: req.correlationId,
    })

    return {
      status: 'ok',
      code: 'ACCEPTED',
      data: {
        sent: true,
        destinationType: isSms ? 'sms' : 'email',
        expiresInSec: 300,
        provider: delivery?.provider,
        ...(cfg.demoExposeOtp && user ? { devCode: code } : {}),
      },
    }
  })

  app.post('/api/auth/otp/verify', async (req) => {
    const body = z
      .object({
        destination: z.string().min(5),
        purpose: z.enum(['LOGIN', 'VERIFY_CONTACT', 'RESET_PASSWORD']),
        code: z.string().regex(/^\d{6}$/),
        newPassword: z.string().min(8).max(128).optional(),
      })
      .parse(req.body)

    const isSms = !body.destination.includes('@')
    const dest = isSms ? normalizePhone(body.destination) : body.destination.toLowerCase()

    const challenge = store.find<any>(
      'otps',
      (o) => o.destination === dest && o.purpose === body.purpose && !o.consumedAt,
    )
    if (!challenge) throw badRequest('No active verification code')
    if (challenge.attempts >= challenge.maxAttempts) throw rateLimited('Too many attempts. Request a new code.')

    const user =
      store.find<any>('users', (u) => (isSms ? u.phone === dest : u.email === dest)) ?? null

    if (challenge.codeHash !== sha256(body.code)) {
      store.patch('otps', challenge.id, { attempts: challenge.attempts + 1 })
      throw badRequest('Incorrect code')
    }

    if (new Date(challenge.expiresAt) < new Date()) throw gone('Verification code expired')
    store.patch('otps', challenge.id, { consumedAt: nowIso() })

    if (body.purpose === 'LOGIN') {
      if (!user || !user.isActive) throw unauthorized('Invalid credentials')
      const tokens = await issueTokens(app, user)
      audit(store, bus, {
        actorId: user.id,
        action: 'auth.otp.verify',
        resource: 'user',
        resourceId: user.id,
        ip: req.ip,
        correlationId: req.correlationId,
      })
      return { status: 'ok', code: 'OK', data: { user: publicUser(user), tokens } }
    }

    if (!user) throw badRequest('No active verification code')

    if (body.purpose === 'VERIFY_CONTACT') {
      store.patch('users', user.id, isSms ? { phoneVerified: true } : { emailVerified: true })
    }

    if (body.purpose === 'RESET_PASSWORD') {
      if (!body.newPassword) throw badRequest('newPassword required for RESET_PASSWORD')
      store.patch('users', user.id, { passwordHash: await hashPassword(body.newPassword) })
      for (const t of store.filter<any>('refreshTokens', (t) => t.userId === user.id)) {
        if (!t.revokedAt) t.revokedAt = nowIso()
      }
      store.save('refreshTokens')
    }

    audit(store, bus, {
      actorId: user.id,
      action: `auth.otp.verify.${body.purpose.toLowerCase()}`,
      resource: 'user',
      resourceId: user.id,
      ip: req.ip,
      correlationId: req.correlationId,
    })
    return { status: 'ok', code: 'OK', data: { verified: true } }
  })

  app.get('/api/admin/users', { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') }, async (req) => {
    const q = String((req.query as any)?.q ?? '').toLowerCase()
    const limit = Math.min(Number((req.query as any)?.limit ?? 50), 200)
    let users = [...store.col<any>('users')].reverse()
    if (q) {
      users = users.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.includes(q),
      )
    }
    if (req.user!.hospitalId) {
      users = users.filter((u) => (u.roles ?? []).some((r: any) => r.hospitalId === req.user!.hospitalId))
    }
    return {
      status: 'ok',
      code: 'OK',
      data: { items: users.slice(0, limit).map(publicUser), total: users.length },
    }
  })

  app.patch(
    '/api/admin/users/:id/status',
    { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') },
    async (req) => {
      const body = z.object({ isActive: z.boolean() }).parse(req.body)
      const user = store.byId<any>('users', (req.params as any).id)
      if (!user) throw notFound('User not found')
      const before = user.isActive
      store.patch('users', user.id, { isActive: body.isActive })
      audit(store, bus, {
        actorId: req.user!.sub,
        actorRole: req.user!.roles[0],
        action: 'admin.user.status_changed',
        resource: 'user',
        resourceId: user.id,
        before,
        after: body.isActive,
        ip: req.ip,
        correlationId: req.correlationId,
      })
      return { status: 'ok', code: 'OK', data: publicUser(user) }
    },
  )

  app.post(
    '/api/admin/users/:id/roles',
    { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') },
    async (req) => {
      const body = z
        .object({
          role: z.enum(ROLES),
          hospitalId: z.string().uuid().optional(),
          isPrimary: z.boolean().optional(),
        })
        .parse(req.body)

      const target = store.byId<any>('users', (req.params as any).id)
      if (!target) throw notFound('User not found')

      const isAdmin = req.user!.roles.includes('PLATFORM_ADMIN')
      const isHospitalAdmin = req.user!.roles.includes('HOSPITAL_ADMIN')
      const actingHospital = req.user!.hospitalId

      if (!isAdmin) {
        if (!isHospitalAdmin) throw forbidden('Not allowed to grant roles')
        if (['PLATFORM_ADMIN', 'HOSPITAL_ADMIN'].includes(body.role)) {
          throw forbidden('Hospital admins cannot grant admin-level roles')
        }
        if (!body.hospitalId || body.hospitalId !== actingHospital) {
          throw forbidden('You can only grant roles within your own hospital')
        }
      }

      const exists = (target.roles ?? []).some(
        (r: any) => r.role === body.role && (r.hospitalId ?? null) === (body.hospitalId ?? null),
      )
      if (exists) throw conflict('Role already granted')

      if (body.isPrimary) {
        for (const r of target.roles ?? []) r.isPrimary = false
      }
      ;(target.roles ??= []).push({
        id: uuid(),
        hospitalId: body.hospitalId ?? null,
        role: body.role,
        isPrimary: Boolean(body.isPrimary),
      })
      store.save('users')

      audit(store, bus, {
        actorId: req.user!.sub,
        actorRole: req.user!.roles[0],
        action: 'admin.user.role_granted',
        resource: 'user',
        resourceId: target.id,
        after: { role: body.role, hospitalId: body.hospitalId ?? null },
        ip: req.ip,
        correlationId: req.correlationId,
      })
      return { status: 'ok', code: 'CREATED', data: publicUser(target) }
    },
  )

  app.delete(
    '/api/admin/users/:id/roles/:roleId',
    { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') },
    async (req) => {
      const target = store.byId<any>('users', (req.params as any).id)
      if (!target) throw notFound('User not found')
      const roleId = (req.params as any).roleId
      const role = (target.roles ?? []).find((r: any) => r.id === roleId)
      if (!role) throw notFound('Role not found')

      if (!req.user!.roles.includes('PLATFORM_ADMIN')) {
        if (['PLATFORM_ADMIN', 'HOSPITAL_ADMIN'].includes(role.role)) throw forbidden('Not allowed')
        if (role.hospitalId !== req.user!.hospitalId) throw forbidden('Outside your hospital')
      }

      store.patch('users', target.id, {
        roles: (target.roles ?? []).filter((r: any) => r.id !== roleId),
      } as any)
      audit(store, bus, {
        actorId: req.user!.sub,
        actorRole: req.user!.roles[0],
        action: 'admin.user.role_revoked',
        resource: 'user',
        resourceId: target.id,
        before: role,
        ip: req.ip,
        correlationId: req.correlationId,
      })
      return { status: 'ok', code: 'OK', data: publicUser(target) }
    },
  )
}
