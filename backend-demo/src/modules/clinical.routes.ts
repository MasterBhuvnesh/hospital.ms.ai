import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { uuid, nowIso } from '../lib/ids.js'
import { badRequest, conflict, forbidden, notFound, validationError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import type { Store } from '../lib/json-db.js'
import { audit } from '../lib/audit.js'
import { TOPICS } from '../lib/events.js'
import { parseBody } from './scheduling.routes.js'
import { renderPdf } from '../providers/pdf.js'
import { putObject, presignGet } from '../providers/storage.js'
import { has } from '../config.js'

type AccessMode = 'SELF' | 'CONSULTATION' | 'CONSENT' | 'BREAK_GLASS'

export function assertRecordAccess(app: FastifyInstance, req: any, patientId: string): AccessMode {
  const { store } = app
  const roles: string[] = req.user.roles
  const patient = store.byId<any>('patients', patientId)
  if (!patient) throw notFound('Patient not found')

  if (roles.includes('PLATFORM_ADMIN')) {
    throw forbidden('Platform admins have no clinical access')
  }

  const hasStaffRole = roles.some((r) => r !== 'PATIENT')
  if (!hasStaffRole) {
    if (patient.userId === req.user.sub) return 'SELF'
    throw forbidden('You can only access your own record')
  }

  const clinicalRoles = roles.filter((r) => ['DOCTOR', 'NURSE'].includes(r))
  if (clinicalRoles.length > 0) {
    const active = store.find<any>(
      'tokens',
      (t) =>
        t.patientId === patientId &&
        t.doctorId !== null &&
        ['CALLED', 'IN_CONSULTATION'].includes(t.status),
    )
    if (active && roles.includes('DOCTOR')) return 'CONSULTATION'
    if (active && roles.includes('NURSE') && !roles.includes('DOCTOR')) return 'CONSULTATION'

    const consent = store.find<any>(
      'consents',
      (c) =>
        c.grantToUserId === req.user.sub &&
        c.grantorUserId === patient.userId &&
        !c.revokedAt &&
        (!c.expiresAt || new Date(c.expiresAt) > new Date()),
    )
    if (consent) return 'CONSENT'
  }

  const bg = store.find<any>(
    'breakGlassGrants',
    (g) => g.patientId === patientId && g.grantedTo === req.user.sub && new Date(g.expiresAt) > new Date(),
  )
  if (bg) return 'BREAK_GLASS'

  throw forbidden('No active consultation, consent, or break-glass authorization for this record')
}

export function recordPhiAccess(
  app: FastifyInstance,
  req: any,
  patient: any,
  mode: AccessMode,
  detail = '',
) {
  const { store, bus } = app
  const reason = mode === 'BREAK_GLASS' ? 'break-glass administrative access' : `${mode.toLowerCase()} access`
  bus.publish(
    TOPICS.phiAccessed,
    {
      patientId: patient.id,
      patientUserId: patient?.userId ?? null,
      accessorId: req.user.sub,
      accessorRole: req.user.roles[0],
      mode,
      reason,
      detail,
      notifyPatient: mode === 'BREAK_GLASS',
    },
    {},
  )
  audit(store, bus, {
    actorId: req.user.sub,
    actorRole: req.user.roles[0],
    action: 'phi.accessed',
    resource: 'patient_record',
    resourceId: patient.id,
    ip: req.ip,
    correlationId: req.correlationId,
  })
}

export function buildPatientSheet(app: FastifyInstance, patientId: string) {
  const { store } = app
  const patient = store.byId<any>('patients', patientId)
  if (!patient) throw notFound('Patient not found')

  const allergies = store.filter<any>('allergies', (a) => a.patientId === patientId)
  const conditions = store.filter<any>('conditions', (c) => c.patientId === patientId && c.active)
  const medications = store.filter<any>('medications', (m) => m.patientId === patientId && m.active)

  const completedTokens = store
    .filter<any>('tokens', (t) => t.patientId === patientId && t.status === 'COMPLETED')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 5)

  const releasedLabs = store
    .filter<any>('labOrders', (l) => l.patientId === patientId && l.status === 'RELEASED')
    .sort((a, b) => (b.releasedAt ?? '').localeCompare(a.releasedAt ?? ''))
    .slice(0, 5)

  const recentPrescriptions = store
    .filter<any>('prescriptions', (p) => p.patientId === patientId && p.status !== 'DRAFT')
    .sort((a, b) => (b.signedAt ?? '').localeCompare(a.signedAt ?? ''))
    .slice(0, 3)

  return {
    generatedAt: nowIso(),
    source: 'deterministic',
    patient: {
      id: patient.id,
      fullName: patient.fullName,
      dob: patient.dob,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup ?? null,
      phone: patient.phone,
    },
    alerts: allergies.map((a) => ({ severity: a.severity, substance: a.substance, reaction: a.reaction })),
    allergies,
    conditions,
    medications,
    recentVisits: completedTokens.map((t) => ({
      consultationId: t.consultationId,
      date: t.tokenDate,
      doctorName: t.doctorName,
      completedAt: t.completedAt,
    })),
    recentLabs: releasedLabs.map((l) => ({
      id: l.id,
      releasedAt: l.releasedAt,
      priority: l.priority,
      tests: l.tests,
      resultsCount: (l.results ?? []).length,
    })),
    recentPrescriptions: recentPrescriptions.map((p) => ({
      id: p.id,
      signedAt: p.signedAt,
      doctorName: p.doctorSnapshot?.name,
      itemCount: p.items.length,
      pdfUrl: p.pdfUrl ?? null,
    })),
  }
}

export function clinicalRoutes(app: FastifyInstance) {
  const { store, bus } = app

  app.post('/api/clinical/patients', { preHandler: requireAuth }, async (req, reply) => {
    const body = parseBody(
      z.object({
        fullName: z.string().min(2),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
        bloodGroup: z.string().max(5).optional(),
        photoUrl: z.string().url().optional(),
        emergencyContact: z
          .object({ name: z.string(), phone: z.string() })
          .partial({ name: true, phone: true })
          .optional(),
        insurance: z.object({ provider: z.string(), number: z.string() }).optional(),
      }),
      req.body,
    )
    let userId: string | null = null
    const isStaff = req.user!.roles.some((r: string) => r !== 'PATIENT')
    if (!isStaff) {
      const own = store.find<any>('patients', (p) => p.userId === req.user!.sub)
      if (own) throw conflict('Your user already has a patient record')
      userId = req.user!.sub
    }
    const patient = store.insert('patients', {
      id: uuid(),
      userId,
      fullName: body.fullName,
      phone: body.phone ?? null,
      email: body.email?.toLowerCase() ?? null,
      dob: body.dob ?? null,
      gender: body.gender ?? null,
      bloodGroup: body.bloodGroup ?? null,
      registrations: [],
    })
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: patient })
  })

  app.get('/api/clinical/patients/me', { preHandler: requireAuth }, async (req) => {
    const p = store.find<any>('patients', (x) => x.userId === req.user!.sub)
    return { status: 'ok', code: 'OK', data: p ?? null }
  })

  app.get('/api/clinical/patients/:id', { preHandler: requireAuth }, async (req) => {
    const id = (req.params as any).id
    const patient = store.byId<any>('patients', id)
    if (!patient) throw notFound('Patient not found')
    const roles: string[] = req.user!.roles
    if (roles.includes('PLATFORM_ADMIN')) throw forbidden('Platform admins have no clinical access')
    if (!patient.userId || patient.userId !== req.user!.sub) {
      audit(store, bus, {
        actorId: req.user!.sub,
        actorRole: roles[0],
        action: 'phi.profile_viewed',
        resource: 'patient',
        resourceId: id,
        ip: req.ip,
        correlationId: req.correlationId,
      })
    }
    return { status: 'ok', code: 'OK', data: patient }
  })

  app.patch('/api/clinical/patients/:id', { preHandler: requireAuth }, async (req) => {
    const id = (req.params as any).id
    const patient = store.byId<any>('patients', id)
    if (!patient) throw notFound('Patient not found')
    const roles: string[] = req.user!.roles
    const isStaff = roles.some((r) => r !== 'PATIENT')
    if (!isStaff && patient.userId !== req.user!.sub) throw forbidden('Not your record')

    const body = parseBody(
      z.object({
        fullName: z.string().min(2).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
        bloodGroup: z.string().max(5).optional(),
        photoUrl: z.string().url().nullable().optional(),
        emergencyContact: z
          .object({ name: z.string(), phone: z.string() })
          .partial({ name: true, phone: true })
          .nullable()
          .optional(),
        insurance: z.object({ provider: z.string(), number: z.string() }).nullable().optional(),
      }),
      req.body,
    )
    store.patch('patients', id, body as any)
    return { status: 'ok', code: 'OK', data: store.byId('patients', id) }
  })

  app.post('/api/clinical/patients/:id/register-at', { preHandler: requireAuth }, async (req, reply) => {
    const patient = store.byId<any>('patients', (req.params as any).id)
    if (!patient) throw notFound('Patient not found')
    const body = parseBody(z.object({ hospitalId: z.string().uuid() }), req.body)
    if (!store.byId<any>('hospitals', body.hospitalId)) throw badRequest('Unknown hospital')

    ;(patient.registrations ??= [])
    const existing = patient.registrations.find((r: any) => r.hospitalId === body.hospitalId)
    if (existing) return { status: 'ok', code: 'OK', data: { registration: existing } }

    const mrnSeq = store.col<any>('patients').reduce((acc, p) => {
      for (const r of p.registrations ?? []) {
        if (r.hospitalId === body.hospitalId) acc = Math.max(acc, Number(r.mrn.split('-').pop()) || 0)
      }
      return acc
    }, 0)
    const registration = { hospitalId: body.hospitalId, mrn: `MRN-${String(mrnSeq + 1).padStart(6, '0')}`, registeredAt: nowIso() }
    patient.registrations.push(registration)
    store.save('patients')
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: { registration } })
  })

  const nestedResource = (
    path: string,
    collection: string,
    schema: z.ZodTypeAny,
  ) => {
    app.get(`/api/clinical/patients/:id/${path}`, { preHandler: requireAuth }, async (req) => {
      const patientId = (req.params as any).id
      assertRecordAccess(app, req as any, patientId)
      const items = store.filter<any>(collection, (r) => r.patientId === patientId)
      return { status: 'ok', code: 'OK', data: { items } }
    })

    app.post(`/api/clinical/patients/:id/${path}`, { preHandler: requireAuth }, async (req, reply) => {
      const patientId = (req.params as any).id
      const mode = assertRecordAccess(app, req as any, patientId)
      const body = parseBody(schema, req.body)
      const row = store.insert(collection, { id: uuid(), patientId, ...body })
      recordPhiAccess(app, req as any, store.byId('patients', patientId), mode, `${collection}.add`)
      return reply.code(201).send({ status: 'ok', code: 'CREATED', data: row })
    })

    app.delete(`/api/clinical/patients/:id/${path}/:rowId`, { preHandler: requireAuth }, async (req) => {
      const patientId = (req.params as any).id
      const mode = assertRecordAccess(app, req as any, patientId)
      const removed = store.remove<any>(collection, (r) => r.id === (req.params as any).rowId && r.patientId === patientId)
      if (!removed) throw notFound('Record not found')
      recordPhiAccess(app, req as any, store.byId('patients', patientId), mode, `${collection}.remove`)
      return { status: 'ok', code: 'NO_CONTENT' }
    })
  }

  nestedResource(
    'allergies',
    'allergies',
    z.object({
      substance: z.string().min(2),
      severity: z.enum(['MILD', 'MODERATE', 'SEVERE']),
      reaction: z.string().optional(),
    }),
  )
  nestedResource(
    'conditions',
    'conditions',
    z.object({
      name: z.string().min(2),
      since: z.string().optional(),
      notes: z.string().optional(),
      active: z.boolean().default(true),
    }),
  )
  nestedResource(
    'medications',
    'medications',
    z.object({
      drug: z.string().min(2),
      dose: z.string().min(1),
      frequency: z.string().min(1),
      active: z.boolean().default(true),
    }),
  )

  function tokenByConsultation(cid: string) {
    const t = store.find<any>('tokens', (x) => x.consultationId === cid)
    if (!t) throw notFound('Consultation not found')
    return t
  }

  app.get('/api/clinical/consultations/:cid/content', { preHandler: requireAuth }, async (req) => {
    const t = tokenByConsultation((req.params as any).cid)
    assertRecordAccess(app, req as any, t.patientId)
    const content = store.find<any>('consultationContents', (c) => c.consultationId === t.consultationId)
    return { status: 'ok', code: 'OK', data: content ?? null }
  })

  app.put('/api/clinical/consultations/:cid/content', { preHandler: requireRoleDoctorNurse() }, async (req) => {
    const cid = (req.params as any).cid
    const t = tokenByConsultation(cid)
    if (t.status !== 'IN_CONSULTATION') throw conflict('Consultation is not in progress')
    const body = parseBody(
      z.object({
        complaint: z.string().optional(),
        vitals: z.record(z.union([z.string(), z.number()])).optional(),
        examination: z.string().optional(),
        assessment: z.string().optional(),
        diagnosis: z.string().optional(),
        plan: z.string().optional(),
        followUpAt: z.string().datetime().nullish(),
      }),
      req.body,
    )
    let content = store.find<any>('consultationContents', (c) => c.consultationId === cid)
    if (!content) {
      content = store.insert('consultationContents', {
        id: uuid(),
        consultationId: cid,
        tokenId: t.id,
        patientId: t.patientId,
        doctorId: t.doctorId,
        ...body,
        savedBy: req.user!.sub,
        updatedAt: nowIso(),
      })
    } else {
      store.patch('consultationContents', content.id, { ...body, savedBy: req.user!.sub, updatedAt: nowIso() } as any)
    }
    bus.publish(
      TOPICS.consultationContentSaved,
      { consultationId: cid, patientId: t.patientId, savedBy: req.user!.sub },
      {},
    )
    return { status: 'ok', code: 'OK', data: store.byId('consultationContents', content.id) }
  })

  app.get('/api/clinical/patients/:id/sheet', { preHandler: requireAuth }, async (req) => {
    const patientId = (req.params as any).id
    const mode = assertRecordAccess(app, req as any, patientId)
    const sheet = buildPatientSheet(app, patientId)
    if (mode !== 'SELF') {
      recordPhiAccess(app, req as any, store.byId('patients', patientId), mode, 'sheet.view')
    }
    return { status: 'ok', code: 'OK', data: sheet }
  })

  app.post('/api/clinical/consultations/:cid/prescriptions', { preHandler: requireRoleDoctorNurse() }, async (req, reply) => {
    const cid = (req.params as any).cid
    const t = tokenByConsultation(cid)
    if (!['IN_CONSULTATION', 'COMPLETED'].includes(t.status)) throw conflict('No active or completed consultation')
    const body = parseBody(
      z.object({
        items: z
          .array(
            z.object({
              drug: z.string().min(2),
              dose: z.string().min(1),
              frequency: z.string().min(1),
              durationDays: z.number().int().positive(),
              instructions: z.string().optional(),
            }),
          )
          .min(1),
        notes: z.string().optional(),
      }),
      req.body,
    )
    const rx = store.insert('prescriptions', {
      id: uuid(),
      consultationId: cid,
      patientId: t.patientId,
      hospitalId: t.hospitalId,
      doctorUserId: req.user!.sub,
      status: 'DRAFT',
      items: body.items,
      notes: body.notes ?? null,
      contentHash: null,
      pdfKey: null,
      pdfUrl: null,
      signedAt: null,
      fulfilledAt: null,
      doctorSnapshot: null,
    })
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: rx })
  })

  app.post('/api/clinical/prescriptions/:id/sign', { preHandler: requireRoleDoctorNurse() }, async (req) => {
    const rx = store.byId<any>('prescriptions', (req.params as any).id)
    if (!rx) throw notFound('Prescription not found')
    if (rx.status !== 'DRAFT') throw conflict(`Already ${rx.status}`)
    if (rx.doctorUserId !== req.user!.sub) throw forbidden('Only the authoring doctor can sign')

    const doctorProfile = store.find<any>('doctors', (d) => d.userId === req.user!.sub)
    const patient = store.byId<any>('patients', rx.patientId)
    const signedAt = nowIso()

    const canonical = JSON.stringify({ items: rx.items, notes: rx.notes, patientId: rx.patientId, signedAt })
    const contentHash = (await import('../lib/ids.js')).sha256(canonical)

    const doctorSnapshot = {
      name: doctorProfile?.fullName ?? store.byId<any>('users', req.user!.sub)?.fullName ?? 'Doctor',
      registrationNumber: doctorProfile?.registrationNumber ?? 'PENDING-REGISTRATION',
      qualification: doctorProfile?.qualification ?? null,
      signedBy: req.user!.sub,
    }

    const allergyList = store.filter<any>('allergies', (a) => a.patientId === rx.patientId)
    const sections: any[] = [
      {
        heading: 'Patient',
        rows: [
          ['Name', patient?.fullName ?? ''],
          ['DOB', patient?.dob ?? '-'],
          ['Blood group', patient?.bloodGroup ?? '-'],
          ['Date', signedAt.slice(0, 10)],
        ],
      },
    ]
    if (allergyList.length > 0) {
      sections.push({
        heading: 'Allergies',
        text: allergyList.map((a) => `${a.substance} (${a.severity})`).join(', '),
      })
    }
    sections.push({
      heading: 'Rx',
      table: {
        columns: ['Drug', 'Dose', 'Frequency', 'Days', 'Instructions'],
        rows: rx.items.map((i: any) => [i.drug, i.dose, i.frequency, String(i.durationDays), i.instructions ?? '']),
      },
    })
    if (rx.notes) sections.push({ heading: 'Notes', text: rx.notes })
    sections.push({
      heading: 'Signature',
      rows: [
        ['Doctor', doctorSnapshot.name],
        ['Registration', doctorSnapshot.registrationNumber],
        ['Content hash', contentHash],
      ],
    })

    let pdfKey: string | null = null
    let pdfUrl: string | null = null
    try {
      const buffer = await renderPdf('Prescription', `Consultation ${rx.consultationId}`, sections)
      pdfKey = `prescriptions/${rx.id}.pdf`
      const res = await putObject(pdfKey, buffer, 'application/pdf')
      pdfUrl = res.publicUrl
    } catch (e: any) {
      console.error('[pdf] prescription upload failed:', e?.message)
    }

    store.patch('prescriptions', rx.id, {
      status: 'SIGNED',
      signedAt,
      contentHash,
      pdfKey,
      pdfUrl,
      doctorSnapshot,
    } as any)

    bus.publish(
      TOPICS.prescriptionSigned,
      {
        prescriptionId: rx.id,
        consultationId: rx.consultationId,
        patientId: rx.patientId,
        patientUserId: patient?.userId ?? null,
        patientName: patient?.fullName,
        doctorName: doctorSnapshot.name,
        pdfUrl,
        contentHash,
      },
      {},
    )
    return { status: 'ok', code: 'OK', data: store.byId('prescriptions', rx.id) }
  })

  app.get('/api/clinical/prescriptions/:id', { preHandler: requireAuth }, async (req) => {
    const rx = store.byId<any>('prescriptions', (req.params as any).id)
    if (!rx) throw notFound('Prescription not found')
    assertRecordAccess(app, req as any, rx.patientId)
    let downloadUrl = rx.pdfUrl
    if (rx.pdfKey && has.s3) {
      try {
        downloadUrl = await presignGet(rx.pdfKey, 300)
      } catch {}
    }
    return { status: 'ok', code: 'OK', data: { ...rx, downloadUrl } }
  })

  app.get('/api/clinical/patients/:id/prescriptions', { preHandler: requireAuth }, async (req) => {
    const patientId = (req.params as any).id
    assertRecordAccess(app, req as any, patientId)
    const items = store
      .filter<any>('prescriptions', (p) => p.patientId === patientId)
      .sort((a, b) => (b.signedAt ?? b.createdAt).localeCompare(a.signedAt ?? a.createdAt))
    return { status: 'ok', code: 'OK', data: { items } }
  })

  app.post('/api/clinical/consultations/:cid/lab-orders', { preHandler: requireRoleDoctorNurse() }, async (req, reply) => {
    const cid = (req.params as any).cid
    const t = tokenByConsultation(cid)
    if (!['IN_CONSULTATION', 'COMPLETED'].includes(t.status)) throw conflict('No active or completed consultation')
    const body = parseBody(
      z.object({
        tests: z.array(z.object({ code: z.string(), name: z.string().min(2) })).min(1),
        priority: z.enum(['ROUTINE', 'URGENT']).default('ROUTINE'),
        notes: z.string().optional(),
      }),
      req.body,
    )
    const order = store.insert('labOrders', {
      id: uuid(),
      consultationId: cid,
      patientId: t.patientId,
      hospitalId: t.hospitalId,
      orderedBy: req.user!.sub,
      tests: body.tests,
      priority: body.priority,
      notes: body.notes ?? null,
      status: 'ORDERED',
      results: [],
      collectedAt: null,
      releasedAt: null,
    })
    bus.publish(
      TOPICS.labOrderCreated,
      {
        labOrderId: order.id,
        patientId: t.patientId,
        testNames: body.tests.map((x) => x.name).join(', '),
        priority: body.priority,
      },
      {},
    )
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: order })
  })

  app.post('/api/clinical/lab-orders/:id/collect', { preHandler: requireRole('LAB_TECH', 'NURSE') }, async (req) => {
    const order = store.byId<any>('labOrders', (req.params as any).id)
    if (!order) throw notFound('Lab order not found')
    if (order.status !== 'ORDERED') throw conflict(`Cannot collect at ${order.status}`)
    store.patch('labOrders', order.id, { status: 'COLLECTED', collectedAt: nowIso() })
    bus.publish(TOPICS.labSampleCollected, { labOrderId: order.id, patientId: order.patientId }, {})
    return { status: 'ok', code: 'OK', data: store.byId('labOrders', order.id) }
  })

  app.post('/api/clinical/lab-orders/:id/results', { preHandler: requireRole('LAB_TECH') }, async (req) => {
    const order = store.byId<any>('labOrders', (req.params as any).id)
    if (!order) throw notFound('Lab order not found')
    if (!['COLLECTED', 'ENTERED'].includes(order.status)) throw conflict(`Cannot enter results at ${order.status}`)
    const body = parseBody(
      z.object({
        results: z
          .array(
            z.object({
              parameter: z.string().min(1),
              value: z.string().min(1),
              unit: z.string().optional(),
              referenceRange: z.string().optional(),
              flag: z.enum(['NORMAL', 'HIGH', 'LOW', 'CRITICAL']).optional(),
            }),
          )
          .min(1),
      }),
      req.body,
    )
    store.patch('labOrders', order.id, { status: 'ENTERED', results: body.results })
    return { status: 'ok', code: 'OK', data: store.byId('labOrders', order.id) }
  })

  app.post('/api/clinical/lab-orders/:id/release', { preHandler: requireRole('LAB_TECH', 'DOCTOR') }, async (req) => {
    const order = store.byId<any>('labOrders', (req.params as any).id)
    if (!order) throw notFound('Lab order not found')
    if (order.status !== 'ENTERED') throw conflict(`Only entered results can be verified and released (current: ${order.status})`)
    store.patch('labOrders', order.id, { status: 'RELEASED', releasedAt: nowIso(), releasedBy: req.user!.sub })
    const patient = store.byId<any>('patients', order.patientId)
    bus.publish(
      TOPICS.labResultReleased,
      {
        labOrderId: order.id,
        patientId: order.patientId,
        patientUserId: patient?.userId ?? null,
        testNames: order.tests.map((t: any) => t.name).join(', '),
      },
      {},
    )
    return { status: 'ok', code: 'OK', data: store.byId('labOrders', order.id) }
  })

  app.get('/api/clinical/lab-orders/:id', { preHandler: requireAuth }, async (req) => {
    const order = store.byId<any>('labOrders', (req.params as any).id)
    if (!order) throw notFound('Lab order not found')
    const roles: string[] = req.user!.roles
    const isStaff = roles.some((r) => r !== 'PATIENT')
    if (!isStaff) {
      const p = store.byId<any>('patients', order.patientId)
      if (p?.userId !== req.user!.sub) throw notFound('Lab order not found')
      if (order.status !== 'RELEASED') throw notFound('Lab order not found')
    } else if (roles.includes('PLATFORM_ADMIN')) {
      throw forbidden('Platform admins have no clinical access')
    }
    return { status: 'ok', code: 'OK', data: order }
  })

  app.get('/api/clinical/patients/:id/lab-orders', { preHandler: requireAuth }, async (req) => {
    const patientId = (req.params as any).id
    const roles: string[] = req.user!.roles
    const isStaff = roles.some((r) => r !== 'PATIENT')
    let items = store.filter<any>('labOrders', (l) => l.patientId === patientId)
    if (!isStaff) {
      assertSelf(store, req as any, patientId)
      items = items.filter((l) => l.status === 'RELEASED')
    } else if (['DOCTOR', 'NURSE'].some((r) => roles.includes(r))) {
      assertRecordAccess(app, req as any, patientId)
    } else if (roles.includes('LAB_TECH')) {
      // full visibility for lab techs
    } else {
      throw forbidden('Not permitted')
    }
    return { status: 'ok', code: 'OK', data: { items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) } }
  })

  app.post('/api/clinical/documents', { preHandler: requireAuth }, async (req, reply) => {
    const body = parseBody(
      z.object({
        patientId: z.string().uuid(),
        fileName: z.string().min(1).max(200),
        contentType: z.string().min(3).max(100),
        label: z.string().max(120).optional(),
        dataBase64: z.string().min(4),
      }),
      req.body,
    )
    const mode = assertRecordAccess(app, req as any, body.patientId)
    const buffer = Buffer.from(body.dataBase64, 'base64')
    if (buffer.length > 10 * 1024 * 1024) throw badRequest('File too large (10MB max)')
    const ext = body.fileName.includes('.') ? body.fileName.split('.').pop() : 'bin'
    const key = `documents/${uuid()}.${ext}`
    let s3Info: any
    try {
      s3Info = await putObject(key, buffer, body.contentType)
    } catch (e: any) {
      throw new (await import('../lib/errors.js')).AppError(503, 'STORAGE_UNAVAILABLE', e?.message ?? 'upload failed')
    }
    const doc = store.insert('documents', {
      id: uuid(),
      patientId: body.patientId,
      uploadedBy: req.user!.sub,
      label: body.label ?? body.fileName,
      fileName: body.fileName,
      contentType: body.contentType,
      sizeBytes: buffer.length,
      s3Key: s3Info.key,
      publicUrl: s3Info.publicUrl,
    })
    recordPhiAccess(app, req as any, store.byId('patients', body.patientId), mode, 'document.upload')
    let downloadUrl: string | null = s3Info.publicUrl
    if (has.s3) {
      try {
        downloadUrl = await presignGet(s3Info.key, 300)
      } catch {}
    }
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: { ...doc, downloadUrl } })
  })

  app.get('/api/clinical/documents/:id', { preHandler: requireAuth }, async (req) => {
    const doc = store.byId<any>('documents', (req.params as any).id)
    if (!doc) throw notFound('Document not found')
    assertRecordAccess(app, req as any, doc.patientId)
    let downloadUrl: string | null = doc.publicUrl
    if (has.s3 && doc.s3Key) {
      try {
        downloadUrl = await presignGet(doc.s3Key, 300)
      } catch {}
    }
    return { status: 'ok', code: 'OK', data: { ...doc, downloadUrl } }
  })

  app.get('/api/clinical/patients/:id/documents', { preHandler: requireAuth }, async (req) => {
    const patientId = (req.params as any).id
    assertRecordAccess(app, req as any, patientId)
    const items = store.filter<any>('documents', (d) => d.patientId === patientId)
    return { status: 'ok', code: 'OK', data: { items } }
  })

  app.post('/api/clinical/consents', { preHandler: requireAuth }, async (req, reply) => {
    const body = parseBody(
      z.object({
        grantToUserId: z.string().uuid(),
        scope: z.array(z.enum(['RECORDS', 'LABS', 'PRESCRIPTIONS'])).min(1).default(['RECORDS']),
        expiresAt: z.string().datetime().optional(),
      }),
      req.body,
    )
    const me = store.find<any>('patients', (p) => p.userId === req.user!.sub)
    if (!me) throw forbidden('Only patients can grant consent')
    if (body.grantToUserId === req.user!.sub) throw badRequest('Cannot grant consent to yourself')
    const grantee = store.byId<any>('users', body.grantToUserId)
    if (!grantee) throw badRequest('Grantee user does not exist')

    const consent = store.insert('consents', {
      id: uuid(),
      grantorUserId: req.user!.sub,
      grantorPatientId: me.id,
      grantToUserId: body.grantToUserId,
      scope: body.scope,
      expiresAt: body.expiresAt ?? null,
      revokedAt: null,
    })
    bus.publish(
      TOPICS.consentGranted,
      { consentId: consent.id, grantorUserId: req.user!.sub, grantToUserId: body.grantToUserId },
      {},
    )
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: consent })
  })

  app.delete('/api/clinical/consents/:id', { preHandler: requireAuth }, async (req) => {
    const consent = store.byId<any>('consents', (req.params as any).id)
    if (!consent) throw notFound('Consent not found')
    if (consent.grantorUserId !== req.user!.sub) throw forbidden('Only the granting patient can revoke')
    store.patch('consents', consent.id, { revokedAt: nowIso() })
    bus.publish(
      TOPICS.consentRevoked,
      { consentId: consent.id, grantorUserId: req.user!.sub, grantToUserId: consent.grantToUserId },
      {},
    )
    return { status: 'ok', code: 'OK', data: store.byId('consents', consent.id) }
  })

  app.get('/api/clinical/consents/mine', { preHandler: requireAuth }, async (req) => {
    const given = store.filter<any>('consents', (c) => c.grantorUserId === req.user!.sub)
    const received = store.filter<any>('consents', (c) => c.grantToUserId === req.user!.sub && !c.revokedAt)
    return { status: 'ok', code: 'OK', data: { given, received } }
  })

  app.get('/api/clinical/audit/mine', { preHandler: requireAuth }, async (req) => {
    const me = store.find<any>('patients', (p) => p.userId === req.user!.sub)
    const myIds = me ? [me.id] : []
    const items = store
      .filter<any>('auditLogs', (a) => a.resource === 'patient_record' && myIds.includes(a.resourceId))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 100)
    return { status: 'ok', code: 'OK', data: { items } }
  })
}

function requireRoleDoctorNurse() {
  return requireRoleSafe('DOCTOR', 'NURSE')
}

function requireRoleSafe(...roles: string[]) {
  return requireRole(...roles)
}

export function registerClinicalConsumers(app: FastifyInstance) {
  const { bus, store } = app
  bus.on(TOPICS.queuePatientNearTurn, async (env: any) => {
    const p = env.payload
    if (!p.tokenId || !p.position) return
    const token = store.byId<any>('tokens', p.tokenId)
    if (!token) return
    const existing = store.find<any>(
      'patientSheets',
      (s) => s.consultationId === token.consultationId && s.tokenVersion >= token.version,
    )
    if (existing) return
    try {
      const sheet = buildPatientSheet(app, token.patientId)
      store.insert('patientSheets', {
        id: uuid(),
        consultationId: token.consultationId,
        tokenVersion: token.version,
        patientId: token.patientId,
        doctorId: token.doctorId,
        sheet,
      })
      bus.publish(
        TOPICS.patientSheetReady,
        { consultationId: token.consultationId, tokenId: token.id, doctorId: token.doctorId },
        {},
      )
    } catch (e: any) {
      console.error('[sheet] generation failed:', e?.message)
    }
  })
}

function assertSelf(store: Store, req: any, patientId: string) {
  const p = store.byId<any>('patients', patientId)
  if (!p || p.userId !== req.user.sub) throw notFound('Not found')
}
