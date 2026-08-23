import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { uuid, nowIso } from '../lib/ids.js'
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { TOPICS, busCtx } from '../lib/events.js'
import { findPatientByUser, parseBody } from './scheduling.routes.js'

const ACTIVE = ['WAITING', 'OFFERED']

export function waitlistRoutes(app: FastifyInstance) {
  const { store, bus } = app

  app.post('/api/scheduling/waitlists', { preHandler: requireAuth }, async (req, reply) => {
    const body = parseBody(
      z.object({ doctorId: z.string().uuid(), patientId: z.string().uuid().optional() }),
      req.body,
    )
    const roles: string[] = req.user!.roles
    const isPatientOnly = roles.includes('PATIENT') && !roles.some((r) => r !== 'PATIENT')

    const doctor = store.byId<any>('doctors', body.doctorId)
    if (!doctor || !doctor.isActive) throw notFound('Doctor not found or inactive')

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
    } else {
      if (!body.patientId) throw badRequest('patientId required')
      patient = store.byId<any>('patients', body.patientId)
      if (!patient) throw notFound('Patient not found')
    }

    const dupe = store.find<any>(
      'waitlist',
      (w) => w.doctorId === doctor.id && w.patientId === patient.id && ACTIVE.includes(w.status),
    )
    if (dupe) throw conflict('Already on the waitlist for this doctor')

    const position =
      store.filter<any>('waitlist', (w) => w.doctorId === doctor.id && ACTIVE.includes(w.status)).length + 1

    const entry = store.insert('waitlist', {
      id: uuid(),
      hospitalId: doctor.hospitalIds[0],
      doctorId: doctor.id,
      patientId: patient.id,
      requestedAt: nowIso(),
      status: 'WAITING',
      offeredAt: null,
      position,
    })

    bus.publish(
      TOPICS.waitlistJoined,
      { waitlistId: entry.id, doctorId: doctor.id, patientId: patient.id, patientUserId: patient.userId ?? null, position },
      busCtx(req),
    )
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: entry })
  })

  app.get('/api/scheduling/waitlists/mine', { preHandler: requireAuth }, async (req) => {
    const p = findPatientByUser(store, req.user!.sub)
    const items = store
      .filter<any>('waitlist', (w) => w.patientId === p?.id)
      .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)))
    return { status: 'ok', code: 'OK', data: { items, total: items.length } }
  })

  app.delete('/api/scheduling/waitlists/:id', { preHandler: requireAuth }, async (req) => {
    const entry = store.byId<any>('waitlist', (req.params as any).id)
    if (!entry) throw notFound('Waitlist entry not found')
    const p = findPatientByUser(store, req.user!.sub)
    if (!p || entry.patientId !== p.id) throw forbidden('Not your waitlist entry')
    if (entry.status === 'LEFT') throw conflict('Already left the waitlist')
    store.patch('waitlist', entry.id, { status: 'LEFT' })
    return { status: 'ok', code: 'OK', data: store.byId('waitlist', entry.id) }
  })

  app.post('/api/scheduling/waitlists/:id/convert', { preHandler: requireAuth }, async (req) => {
    const entry = store.byId<any>('waitlist', (req.params as any).id)
    if (!entry) throw notFound('Waitlist entry not found')
    const p = findPatientByUser(store, req.user!.sub)
    if (!p || entry.patientId !== p.id) throw forbidden('Not your waitlist entry')
    const body = parseBody(z.object({ appointmentId: z.string().uuid() }), req.body)
    const appt = store.byId<any>('appointments', body.appointmentId)
    if (!appt) throw notFound('Appointment not found')
    if (appt.patientId !== entry.patientId) throw forbidden('Appointment belongs to another patient')
    if (appt.doctorId !== entry.doctorId) throw badRequest('Appointment doctor does not match the waitlist entry')
    if (entry.status === 'CONVERTED') throw conflict('Waitlist entry already converted')
    store.patch('waitlist', entry.id, { status: 'CONVERTED' })
    return { status: 'ok', code: 'OK', data: store.byId('waitlist', entry.id) }
  })
}
