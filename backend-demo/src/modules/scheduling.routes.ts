import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { uuid, nowIso, dateInTimezone } from '../lib/ids.js'
import { badRequest, conflict, forbidden, notFound, validationError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { audit } from '../lib/audit.js'
import { TOPICS, busCtx } from '../lib/events.js'
import { normalizePhone } from '../lib/format.js'
import { notifyUser } from '../comms/engine.js'
import { createInvoiceForCompletion } from './commerce.routes.js'
import type { Store } from '../lib/json-db.js'

export const PRIORITY_RANK: Record<string, number> = {
  EMERGENCY: 0,
  SENIOR_CITIZEN: 1,
  WOMAN_CHILD: 2,
  NORMAL: 3,
}

export function parseBody<T extends z.ZodTypeAny>(schema: T, body: any): z.infer<T> {
  const r = schema.safeParse(body)
  if (!r.success) {
    throw validationError(r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))
  }
  return r.data
}

export function findPatientByUser(store: Store, userId?: string | null) {
  if (!userId) return undefined
  return store.find<any>('patients', (p) => p.userId === userId)
}

export function queueListFor(store: Store, doctorId: string, tokenDate: string) {
  const tokens = store
    .filter<any>('tokens', (t) => t.doctorId === doctorId && t.tokenDate === tokenDate)
    .filter((t) => !['COMPLETED', 'NO_SHOW'].includes(t.status))
  const waitingSorted = tokens
    .filter((t) => t.status === 'WAITING' || t.status === 'SKIPPED')
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) || a.tokenNumber - b.tokenNumber,
    )
  const active = tokens.filter((t) => ['CALLED', 'IN_CONSULTATION'].includes(t.status))
  return { tokens, waitingSorted, active }
}

function sweepNearTurn(app: FastifyInstance, doctorId: string, tokenDate: string) {
  const { store, bus } = app
  const { waitingSorted } = queueListFor(store, doctorId, tokenDate)
  waitingSorted.forEach((t, idx) => {
    const position = idx + 1
    if (position <= 3 && !t.nearTurnNotifiedAt) {
      const patient = store.byId<any>('patients', t.patientId)
      store.patch('tokens', t.id, { nearTurnNotifiedAt: nowIso(), position })
      bus.publish(
        TOPICS.queuePatientNearTurn,
        {
          tokenId: t.id,
          consultationId: t.consultationId,
          patientUserId: patient?.userId ?? null,
          patientName: patient?.fullName,
          doctorName: store.byId<any>('doctors', doctorId)?.fullName,
          position,
        },
        {},
      )
    }
  })
}

export async function mintToken(
  app: FastifyInstance,
  opts: { hospital: any; doctor: any; patient: any; priority?: string; appointmentId?: string },
) {
  const { store, bus } = app
  const tokenDate = dateInTimezone(opts.hospital.timezone)
  const priority = opts.priority ?? 'NORMAL'
  if (!(priority in PRIORITY_RANK)) throw badRequest('Invalid priority')

  const existing = store.filter<any>(
    'tokens',
    (t) => t.hospitalId === opts.hospital.id && t.doctorId === opts.doctor.id && t.tokenDate === tokenDate,
  )
  const maxNumber = existing.reduce((m, t) => Math.max(m, t.tokenNumber), 0)

  const consultationId = uuid()
  const token = store.insert('tokens', {
    id: uuid(),
    consultationId,
    appointmentId: opts.appointmentId ?? null,
    hospitalId: opts.hospital.id,
    doctorId: opts.doctor.id,
    patientId: opts.patient.id,
    patientName: opts.patient.fullName,
    doctorName: opts.doctor.fullName,
    tokenNumber: maxNumber + 1,
    tokenDate,
    priority,
    status: 'WAITING',
    version: 1,
    feeSnapshot: { ...opts.doctor.feeConfig },
    paymentStatus: 'UNPAID',
    calledAt: null,
    startedAt: null,
    completedAt: null,
    nearTurnNotifiedAt: null,
  })

  if (opts.appointmentId) {
    store.patch('appointments', opts.appointmentId, { status: 'CONFIRMED', tokenId: token.id })
  }

  bus.publish(
    TOPICS.queueTokenCreated,
    {
      tokenId: token.id,
      consultationId,
      tokenNumber: token.tokenNumber,
      tokenDate,
      patientUserId: opts.patient.userId ?? null,
      patientName: opts.patient.fullName,
      doctorName: opts.doctor.fullName,
      hospitalName: opts.hospital.name,
      estimatedWaitMin: (existing.filter((t) => ['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(t.status)).length + 1) * 10,
    },
    {},
  )
  sweepNearTurn(app, opts.doctor.id, tokenDate)
  return token
}

export function schedulingRoutes(app: FastifyInstance) {
  const { store, bus } = app

  const bookSchema = z.object({
    patientId: z.string().uuid().optional(),
    doctorId: z.string().uuid(),
    startsAt: z.string().datetime(),
    reason: z.string().max(500).optional(),
    priority: z.enum(['EMERGENCY', 'SENIOR_CITIZEN', 'WOMAN_CHILD', 'NORMAL']).optional(),
  })

  function resolvePatient(req: any, patientId?: string) {
    if (patientId) {
      const isStaff = req.user.roles.some((r: string) => r !== 'PATIENT')
      if (!isStaff) throw forbidden('Patients can only book for themselves')
      const p = store.byId<any>('patients', patientId)
      if (!p) throw notFound('Patient not found')
      return p
    }
    const own = findPatientByUser(store, req.user.sub)
    if (own) return own
    const user = store.byId<any>('users', req.user.sub)
    const created = store.insert('patients', {
      id: uuid(),
      userId: req.user.sub,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      dob: null,
      gender: null,
    })
    return created
  }

  app.post('/api/scheduling/appointments', { preHandler: requireAuth }, async (req, reply) => {
    const body = parseBody(bookSchema, req.body)

    const idemKey = (req.headers['idempotency-key'] as string) ?? null
    if (idemKey) {
      const prior = store.find<any>(
        'idempotencyKeys',
        (k) => k.key === idemKey && k.userId === req.user!.sub && k.endpoint === 'book-appointment',
      )
      if (prior) return reply.code(200).send(prior.response)
    }

    const doctor = store.byId<any>('doctors', body.doctorId)
    if (!doctor || !doctor.isActive) throw notFound('Doctor not found or inactive')
    const hospital = store.byId<any>('hospitals', doctor.hospitalIds[0])
    const patient = resolvePatient(req, body.patientId)

    const date = dateInTimezone(hospital.timezone, new Date(body.startsAt))
    const clash = store.find<any>(
      'appointments',
      (a) =>
        a.doctorId === doctor.id &&
        a.date === date &&
        !['CANCELLED', 'NO_SHOW'].includes(a.status) &&
        Math.abs(new Date(a.startsAt).getTime() - new Date(body.startsAt).getTime()) < 15 * 60_000,
    )
    if (clash) throw conflict('Doctor already has an appointment within 15 minutes of that time')

    const appointment = store.insert('appointments', {
      id: uuid(),
      patientId: patient.id,
      doctorId: doctor.id,
      hospitalId: hospital.id,
      startsAt: body.startsAt,
      date,
      status: 'BOOKED',
      reason: body.reason ?? null,
      priority: body.priority ?? null,
      feeSnapshot: { ...doctor.feeConfig },
      tokenId: null,
    })

    const response = { status: 'ok', code: 'CREATED', data: appointment }

    bus.publish(
      TOPICS.appointmentCreated,
      {
        appointmentId: appointment.id,
        patientUserId: patient.userId ?? null,
        doctorName: doctor.fullName,
        hospitalName: hospital.name,
        startsAt: appointment.startsAt,
      },
      busCtx(req),
    )

    if (idemKey) {
      store.insert('idempotencyKeys', { id: uuid(), key: idemKey, userId: req.user!.sub, endpoint: 'book-appointment', response })
    }
    return reply.code(201).send(response)
  })

  app.get('/api/scheduling/appointments', { preHandler: requireAuth }, async (req) => {
    const q = req.query as any
    let items = [...store.col<any>('appointments')].reverse()
    const isStaff = req.user!.roles.some((r) => r !== 'PATIENT')
    if (!isStaff) {
      const p = findPatientByUser(store, req.user!.sub)
      items = items.filter((a) => a.patientId === p?.id)
    }
    if (q.doctorId) items = items.filter((a) => a.doctorId === q.doctorId)
    if (q.patientId && isStaff) items = items.filter((a) => a.patientId === q.patientId)
    if (q.date) items = items.filter((a) => a.date === q.date)
    if (q.status) items = items.filter((a) => a.status === q.status)
    return { status: 'ok', code: 'OK', data: { items: items.slice(0, Number(q.limit ?? 100)), total: items.length } }
  })

  app.get('/api/scheduling/appointments/:id', { preHandler: requireAuth }, async (req) => {
    const a = store.byId<any>('appointments', (req.params as any).id)
    if (!a) throw notFound('Appointment not found')
    const isStaff = req.user!.roles.some((r) => r !== 'PATIENT')
    if (!isStaff) {
      const p = findPatientByUser(store, req.user!.sub)
      if (a.patientId !== p?.id) throw notFound('Appointment not found')
    }
    return { status: 'ok', code: 'OK', data: a }
  })

  app.patch('/api/scheduling/appointments/:id/reschedule', { preHandler: requireAuth }, async (req) => {
    const a = store.byId<any>('appointments', (req.params as any).id)
    if (!a) throw notFound('Appointment not found')
    const body = parseBody(z.object({ startsAt: z.string().datetime() }), req.body)
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(a.status)) {
      throw conflict(`Cannot reschedule a ${a.status.toLowerCase()} appointment`)
    }
    const doctor = store.byId<any>('doctors', a.doctorId)!
    const hospital = store.byId<any>('hospitals', a.hospitalId)!
    const date = dateInTimezone(hospital.timezone, new Date(body.startsAt))
    store.patch('appointments', a.id, { startsAt: body.startsAt, date })
    const patient = store.byId<any>('patients', a.patientId)
    bus.publish(
      TOPICS.appointmentRescheduled,
      {
        appointmentId: a.id,
        patientUserId: patient?.userId ?? null,
        doctorName: doctor.fullName,
        startsAt: body.startsAt,
      },
      busCtx(req),
    )
    return { status: 'ok', code: 'OK', data: store.byId('appointments', a.id) }
  })

  app.patch('/api/scheduling/appointments/:id/cancel', { preHandler: requireAuth }, async (req) => {
    const a = store.byId<any>('appointments', (req.params as any).id)
    if (!a) throw notFound('Appointment not found')
    if (['CANCELLED', 'COMPLETED'].includes(a.status)) throw conflict(`Already ${a.status.toLowerCase()}`)
    store.patch('appointments', a.id, { status: 'CANCELLED' })
    if (a.tokenId) {
      const t = store.byId<any>('tokens', a.tokenId)
      if (t && ['WAITING', 'CALLED', 'SKIPPED'].includes(t.status)) {
        store.patch('tokens', t.id, { status: 'CANCELLED' })
      }
    }
    const doctor = store.byId<any>('doctors', a.doctorId)
    const offered = store
      .filter<any>('waitlist', (w) => w.doctorId === a.doctorId && w.status === 'WAITING')
      .sort((x, y) => String(x.requestedAt).localeCompare(String(y.requestedAt)))[0]
    if (offered) {
      store.patch('waitlist', offered.id, { status: 'OFFERED', offeredAt: nowIso() })
      const offeredPatient = store.byId<any>('patients', offered.patientId)
      if (offeredPatient?.userId) {
        await notifyUser(app, {
          userId: offeredPatient.userId,
          category: 'QUEUE',
          subject: 'Slot opening',
          body: `A slot opened up with ${doctor?.fullName ?? 'the doctor'}. Book now - you are first on the waitlist.`,
          meta: { waitlistId: offered.id },
        })
      }
    }
    const patient = store.byId<any>('patients', a.patientId)
    bus.publish(
      TOPICS.appointmentCancelled,
      {
        appointmentId: a.id,
        patientUserId: patient?.userId ?? null,
        doctorName: doctor?.fullName ?? '',
        invoiceVoided: true,
      },
      busCtx(req),
    )
    return { status: 'ok', code: 'OK', data: store.byId('appointments', a.id) }
  })

  const walkinSchema = z.object({
    doctorId: z.string().uuid(),
    patientId: z.string().uuid().optional(),
    fullName: z.string().min(2).optional(),
    phone: z.string().optional(),
    priority: z.enum(['EMERGENCY', 'SENIOR_CITIZEN', 'WOMAN_CHILD', 'NORMAL']).default('NORMAL'),
  })

  app.post('/api/scheduling/walkins', { preHandler: requireAuth }, async (req, reply) => {
    const body = parseBody(walkinSchema, req.body)
    const roles: string[] = req.user!.roles
    const isPatientOnly = roles.includes('PATIENT') && !roles.some((r) => r !== 'PATIENT')

    const doctor = store.byId<any>('doctors', body.doctorId)
    if (!doctor || !doctor.isActive) throw notFound('Doctor not found or inactive')
    const hospital = store.byId<any>('hospitals', doctor.hospitalIds[0])

    let patient: any
    if (isPatientOnly) {
      patient = findPatientByUser(store, req.user!.sub)
      if (!patient) {
        const user = store.byId<any>('users', req.user!.sub)
        patient = store.insert('patients', {
          id: uuid(),
          userId: req.user!.sub,
          fullName: user?.fullName ?? 'Patient',
          phone: user?.phone ?? null,
          email: user?.email ?? null,
          dob: null,
          gender: null,
        })
      }
      body.priority = 'NORMAL'
    } else if (body.patientId) {
      patient = store.byId<any>('patients', body.patientId)
      if (!patient) throw notFound('Patient not found')
    } else if (body.phone) {
      const phone = normalizePhone(body.phone)
      patient =
        store.find<any>('patients', (p) => p.phone === phone) ??
        store.insert('patients', {
          id: uuid(),
          userId: null,
          fullName: body.fullName ?? `Walk-in ${phone.slice(-4)}`,
          phone,
          email: null,
          dob: null,
          gender: null,
        })
    } else {
      patient = store.insert('patients', {
        id: uuid(),
        userId: null,
        fullName: body.fullName ?? 'Anonymous walk-in',
        phone: null,
        email: null,
        dob: null,
        gender: null,
      })
    }

    const token = await mintToken(app, {
      hospital,
      doctor,
      patient,
      priority: isPatientOnly ? 'NORMAL' : body.priority,
    })

    audit(store, bus, {
      actorId: req.user!.sub,
      actorRole: req.user!.roles[0],
      action: 'scheduling.walkin_registered',
      resource: 'token',
      resourceId: token.id,
      hospitalId: hospital.id,
      after: { tokenNumber: token.tokenNumber, patientId: patient.id },
      ip: req.ip,
      correlationId: req.correlationId,
    })
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: token })
  })

  app.post('/api/scheduling/tokens', { preHandler: requireAuth }, async (req, reply) => {
    const body = parseBody(z.object({ appointmentId: z.string().uuid() }), req.body)
    const appt = store.byId<any>('appointments', body.appointmentId)
    if (!appt) throw notFound('Appointment not found')
    if (appt.tokenId) {
      const existing = store.byId<any>('tokens', appt.tokenId)
      if (existing && !['CANCELLED', 'NO_SHOW'].includes(existing.status)) {
        return { status: 'ok', code: 'OK', data: existing }
      }
    }
    const doctor = store.byId<any>('doctors', appt.doctorId)!
    const hospital = store.byId<any>('hospitals', appt.hospitalId)!
    const patient = store.byId<any>('patients', appt.patientId)!
    const token = await mintToken(app, {
      hospital,
      doctor,
      patient,
      priority: appt.priority ?? undefined,
      appointmentId: appt.id,
    })
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: token })
  })

  app.get('/api/scheduling/queue', { preHandler: requireAuth }, async (req) => {
    const q = req.query as any
    const doctorId = String(q.doctorId ?? '')
    if (!doctorId) throw badRequest('doctorId query param required')
    const doctor = store.byId<any>('doctors', doctorId)
    if (!doctor) throw notFound('Doctor not found')
    const hospital = store.byId<any>('hospitals', doctor.hospitalIds[0])
    const tokenDate = String(q.date ?? dateInTimezone(hospital.timezone))

    const allToday = store.filter<any>('tokens', (t) => t.doctorId === doctorId && t.tokenDate === tokenDate)
    const { waitingSorted, active } = queueListFor(store, doctorId, tokenDate)

    const waiting = waitingSorted.map((t, idx) => ({
      ...t,
      position: idx + 1,
      etaMinutes: (idx + 1) * 10,
    }))
    const completedCount = allToday.filter((t) => t.status === 'COMPLETED').length

    return {
      status: 'ok',
      code: 'OK',
      data: {
        doctorId,
        doctorName: doctor.fullName,
        date: tokenDate,
        nowServing: active.map((t) => ({ tokenId: t.id, tokenNumber: t.tokenNumber, status: t.status })),
        waiting,
        completedCount,
        pendingCount: waiting.length,
      },
    }
  })

  app.get('/api/scheduling/tokens/:id', { preHandler: requireAuth }, async (req) => {
    const t = store.byId<any>('tokens', (req.params as any).id)
    if (!t) throw notFound('Token not found')
    const isStaff = req.user!.roles.some((r) => r !== 'PATIENT')
    if (!isStaff) {
      const p = findPatientByUser(store, req.user!.sub)
      if (t.patientId !== p?.id) throw notFound('Token not found')
    }
    const { waitingSorted } = queueListFor(store, t.doctorId, t.tokenDate)
    const idx = waitingSorted.findIndex((x) => x.id === t.id)
    const position = ['CALLED', 'IN_CONSULTATION'].includes(t.status) ? 0 : idx >= 0 ? idx + 1 : null
    return {
      status: 'ok',
      code: 'OK',
      data: { ...t, position, etaMinutes: position ? position * 10 : 0 },
    }
  })

  app.get('/api/scheduling/tokens/:id/stream', { preHandler: requireAuth }, async (req, reply) => {
    const t = getTokenOr404((req.params as any).id)
    const isStaff = req.user!.roles.some((r) => r !== 'PATIENT')
    if (!isStaff) {
      const p = findPatientByUser(store, req.user!.sub)
      if (t.patientId !== p?.id) throw notFound('Token not found')
    }

    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    const send = (payload: string) => {
      try {
        reply.raw.write(payload)
      } catch {}
    }
    send(`retry: 3000\n\n`)
    send(`event: snapshot\ndata: ${JSON.stringify({ tokenId: t.id, status: t.status })}\n\n`)

    const topics = [
      TOPICS.queueTokenUpdated,
      TOPICS.queueTokenSkipped,
      TOPICS.queueTokenRecalled,
      TOPICS.queuePatientNearTurn,
      TOPICS.consultationStarted,
      TOPICS.consultationCompleted,
    ]
    const listener = (env: any) => {
      if ((env.payload?.tokenId ?? env.payload?.tokenId) !== t.id && env.payload?.tokenId !== t.id) return
      send(`event: update\ndata: ${JSON.stringify({ topic: env.topic, tokenId: t.id, at: env.occurredAt })}\n\n`)
    }
    for (const topic of topics) bus.on(topic, listener)
    const heartbeat = setInterval(() => send(`: hb\n\n`), 20000)

    req.raw.on('close', () => {
      clearInterval(heartbeat)
      for (const topic of topics) bus.off(topic, listener)
      try {
        reply.raw.end()
      } catch {}
    })
    return reply
  })

  function getTokenOr404(id: string) {
    const t = store.byId<any>('tokens', id)
    if (!t) throw notFound('Token not found')
    return t
  }

  app.post('/api/scheduling/tokens/:id/call', { preHandler: requireRole('DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN') }, async (req) => {
    const t = getTokenOr404((req.params as any).id)
    if (!['WAITING', 'SKIPPED'].includes(t.status)) throw conflict(`Cannot call a ${t.status} token`)
    const active = store.find<any>(
      'tokens',
      (x) => x.doctorId === t.doctorId && x.tokenDate === t.tokenDate && x.status === 'IN_CONSULTATION',
    )
    if (active) throw conflict('Another consultation is in progress. Complete it first.')

    store.patch('tokens', t.id, { status: 'CALLED', version: t.version + 1, calledAt: nowIso() })
    const patient = store.byId<any>('patients', t.patientId)
    bus.publish(TOPICS.queueTokenUpdated, { tokenId: t.id, status: 'CALLED', patientUserId: patient?.userId ?? null }, {})
    sweepNearTurn(app, t.doctorId, t.tokenDate)
    return { status: 'ok', code: 'OK', data: store.byId('tokens', t.id) }
  })

  app.post('/api/scheduling/tokens/:id/start', { preHandler: requireRole('DOCTOR', 'NURSE') }, async (req) => {
    const t = getTokenOr404((req.params as any).id)
    if (t.status !== 'CALLED') throw conflict(`Cannot start from ${t.status}`)
    store.patch('tokens', t.id, { status: 'IN_CONSULTATION', startedAt: nowIso() })
    const patient = store.byId<any>('patients', t.patientId)
    bus.publish(
      TOPICS.consultationStarted,
      {
        consultationId: t.consultationId,
        tokenId: t.id,
        patientId: t.patientId,
        patientUserId: patient?.userId ?? null,
        doctorId: t.doctorId,
        doctorName: t.doctorName,
        hospitalId: t.hospitalId,
      },
      busCtx(req),
    )
    return { status: 'ok', code: 'OK', data: store.byId('tokens', t.id) }
  })

  app.post('/api/scheduling/tokens/:id/skip', { preHandler: requireRole('DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN') }, async (req) => {
    const t = getTokenOr404((req.params as any).id)
    if (!['WAITING', 'CALLED'].includes(t.status)) throw conflict(`Cannot skip a ${t.status} token`)
    store.patch('tokens', t.id, { status: 'SKIPPED', version: t.version + 1 })
    const patient = store.byId<any>('patients', t.patientId)
    bus.publish(
      TOPICS.queueTokenSkipped,
      { tokenId: t.id, patientUserId: patient?.userId ?? null, doctorName: t.doctorName },
      {},
    )
    sweepNearTurn(app, t.doctorId, t.tokenDate)
    return { status: 'ok', code: 'OK', data: store.byId('tokens', t.id) }
  })

  app.post('/api/scheduling/tokens/:id/recall', { preHandler: requireRole('DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN') }, async (req) => {
    const t = getTokenOr404((req.params as any).id)
    if (t.status !== 'SKIPPED') throw conflict('Only skipped tokens can be recalled')
    store.patch('tokens', t.id, { status: 'CALLED', version: t.version + 1, recalledAt: nowIso() })
    const patient = store.byId<any>('patients', t.patientId)
    bus.publish(
      TOPICS.queueTokenRecalled,
      { tokenId: t.id, patientUserId: patient?.userId ?? null, doctorName: t.doctorName },
      {},
    )
    return { status: 'ok', code: 'OK', data: store.byId('tokens', t.id) }
  })

  app.post('/api/scheduling/tokens/:id/no-show', { preHandler: requireRole('DOCTOR', 'RECEPTIONIST', 'HOSPITAL_ADMIN') }, async (req) => {
    const t = getTokenOr404((req.params as any).id)
    if (['COMPLETED', 'NO_SHOW'].includes(t.status)) throw conflict(`Already ${t.status}`)
    store.patch('tokens', t.id, { status: 'NO_SHOW' })
    if (t.appointmentId) store.patch('appointments', t.appointmentId, { status: 'NO_SHOW' })
    const patient = store.byId<any>('patients', t.patientId)
    bus.publish(
      TOPICS.appointmentNoShow,
      { appointmentId: t.appointmentId, tokenId: t.id, patientUserId: patient?.userId ?? null, doctorName: t.doctorName },
      {},
    )
    sweepNearTurn(app, t.doctorId, t.tokenDate)
    return { status: 'ok', code: 'OK', data: store.byId('tokens', t.id) }
  })

  app.post('/api/scheduling/tokens/:id/complete', { preHandler: requireRole('DOCTOR', 'NURSE') }, async (req) => {
    const t = getTokenOr404((req.params as any).id)
    if (t.status !== 'IN_CONSULTATION') throw conflict('Consultation is not in progress')
    store.patch('tokens', t.id, { status: 'COMPLETED', completedAt: nowIso() })
    const patient = store.byId<any>('patients', t.patientId)

    const completionPayload = {
      consultationId: t.consultationId,
      tokenId: t.id,
      patientId: t.patientId,
      patientUserId: patient?.userId ?? null,
      patientName: t.patientName,
      doctorId: t.doctorId,
      doctorName: t.doctorName,
      hospitalId: t.hospitalId,
      feeSnapshot: t.feeSnapshot,
      completedAt: nowIso(),
    }

    await createInvoiceForCompletion(app, completionPayload, busCtx(req))

    bus.publish(TOPICS.consultationCompleted, completionPayload, busCtx(req))
    sweepNearTurn(app, t.doctorId, t.tokenDate)

    const invoice = store.find<any>('invoices', (i) => i.consultationId === t.consultationId)
    return { status: 'ok', code: 'OK', data: { token: store.byId('tokens', t.id), invoice } }
  })
}

export function registerSchedulingConsumers(app: FastifyInstance) {
  const { bus } = app
  const scheduleReminders = (env: any) => {
    const { appointmentId, startsAt } = env.payload ?? {}
    if (!appointmentId || !startsAt) return
    for (const [phase, leadMs] of [
      ['24h', 24 * 3600_000],
      ['2h', 2 * 3600_000],
    ] as const) {
      const delay = new Date(startsAt).getTime() - leadMs - Date.now()
      if (delay > 0 && delay < 14 * 24 * 3600_000) {
        bus.publishLater(TOPICS.appointmentReminderDue, { appointmentId, phase }, delay)
      }
    }
  }
  bus.on(TOPICS.appointmentCreated, scheduleReminders)
  bus.on(TOPICS.appointmentRescheduled, scheduleReminders)
}
