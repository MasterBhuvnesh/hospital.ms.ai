import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { uuid } from '../lib/ids.js'
import { badRequest, notFound } from '../lib/errors.js'
import { requireRole } from '../middleware/auth.js'
import { audit } from '../lib/audit.js'
import { TOPICS } from '../lib/events.js'

export function adminRoutes(app: FastifyInstance) {
  const { store, bus } = app

  app.get('/api/admin/audit', { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') }, async (req) => {
    const q = req.query as any
    let items = [...store.col<any>('auditLogs')].reverse()
    if (q.actorId) items = items.filter((a) => a.actorId === q.actorId)
    if (q.action) items = items.filter((a) => a.action?.includes(String(q.action)))
    if (q.resourceId) items = items.filter((a) => a.resourceId === q.resourceId)
    if (q.hospitalId) items = items.filter((a) => a.hospitalId === q.hospitalId || !a.hospitalId)
    if (q.from) items = items.filter((a) => a.timestamp >= String(q.from))
    if (q.to) items = items.filter((a) => a.timestamp <= String(q.to))
    return { status: 'ok', code: 'OK', data: { items: items.slice(0, Number(q.limit ?? 100)), total: items.length } }
  })

  app.get('/api/admin/events', { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') }, async () => {
    return { status: 'ok', code: 'OK', data: { events: app.bus.recent(100).map((e) => e.envelope) } }
  })

  app.post('/api/admin/break-glass', { preHandler: requireRole('HOSPITAL_ADMIN') }, async (req) => {
    const r = z
      .object({
        patientId: z.string().uuid(),
        reason: z.string().min(10),
        ttlMinutes: z.number().int().min(1).max(60).default(15),
      })
      .safeParse(req.body)
    if (!r.success) {
      throw badRequest('reason (min 10 chars) is required for break-glass access')
    }
    const { patientId, reason, ttlMinutes } = r.data
    const patient = store.byId<any>('patients', patientId)
    if (!patient) throw notFound('Patient not found')

    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString()
    const grant = store.insert('breakGlassGrants', {
      id: uuid(),
      grantedTo: req.user!.sub,
      grantedRole: req.user!.roles[0],
      patientId,
      reason,
      expiresAt,
    })

    bus.publish(
      TOPICS.phiAccessed,
      {
        patientId,
        patientUserId: patient.userId ?? null,
        accessorId: req.user!.sub,
        accessorRole: req.user!.roles[0],
        mode: 'BREAK_GLASS',
        reason,
        notifyPatient: true,
      },
      {},
    )
    audit(store, bus, {
      actorId: req.user!.sub,
      actorRole: req.user!.roles[0],
      action: 'phi.break_glass',
      resource: 'patient_record',
      resourceId: patientId,
      hospitalId: req.user!.hospitalId,
      reason,
      after: { grantId: grant.id, expiresAt },
      ip: req.ip,
      correlationId: req.correlationId,
    })

    return {
      status: 'ok',
      code: 'CREATED',
      data: { grant, note: `Clinical access authorized for ${ttlMinutes} minutes. The patient has been notified and this access is audited.` },
    }
  })

  app.get('/api/admin/break-glass', { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') }, async () => {
    const now = new Date().toISOString()
    const grants = store.filter<any>('breakGlassGrants', (g) => g.expiresAt > now)
    return { status: 'ok', code: 'OK', data: { active: grants } }
  })

  app.get('/api/admin/patients/:id/summary', { preHandler: requireRole('HOSPITAL_ADMIN') }, async (req) => {
    const patient = store.byId<any>('patients', (req.params as any).id)
    if (!patient) throw notFound('Patient not found')
    const tokens = store.filter<any>('tokens', (t) => t.patientId === patient.id)
    const invoices = store.filter<any>('invoices', (i) => i.patientId === patient.id)
    return {
      status: 'ok',
      code: 'OK',
      data: {
        patient: {
          id: patient.id,
          fullName: patient.fullName,
          phone: patient.phone,
          registrations: patient.registrations,
        },
        visitCount: tokens.length,
        completedVisits: tokens.filter((t) => t.status === 'COMPLETED').length,
        noShows: tokens.filter((t) => t.status === 'NO_SHOW').length,
        invoiceTotal: invoices.reduce((s, i) => s + i.total, 0),
        outstanding: invoices.filter((i) => i.status === 'UNPAID').length,
        clinicalNote: 'Use break-glass to view clinical content. Administrative summaries only.',
      },
    }
  })
}
