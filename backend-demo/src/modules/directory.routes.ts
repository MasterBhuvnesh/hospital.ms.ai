import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { uuid } from '../lib/ids.js'
import { badRequest, conflict, forbidden, notFound, validationError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { audit } from '../lib/audit.js'
import type { Store } from '../lib/json-db.js'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function parseBody<T extends z.ZodTypeAny>(schema: T, body: any): z.infer<T> {
  const r = schema.safeParse(body)
  if (!r.success) {
    throw validationError(r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))
  }
  return r.data
}

function hospitalTz(store: Store, hospitalId?: string | null): string {
  return store.byId<any>('hospitals', hospitalId ?? '')?.timezone ?? 'Asia/Kolkata'
}

export function directoryRoutes(app: FastifyInstance) {
  const { store, bus } = app

  app.post(
    '/api/directory/hospitals',
    { preHandler: requireRole('PLATFORM_ADMIN') },
    async (req) => {
      const body = parseBody(
        z.object({
          name: z.string().min(2),
          city: z.string().min(2),
          address: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          timezone: z.string().default('Asia/Kolkata'),
        }),
        req.body,
      )
      const hospital = store.insert('hospitals', { id: uuid(), ...body })
      audit(store, bus, {
        actorId: req.user!.sub,
        actorRole: req.user!.roles[0],
        action: 'directory.hospital.created',
        resource: 'hospital',
        resourceId: hospital.id,
        ip: req.ip,
        correlationId: req.correlationId,
      })
      return { status: 'ok', code: 'CREATED', data: hospital }
    },
  )

  app.get('/api/directory/hospitals', async (req) => {
    const q = String((req.query as any)?.q ?? '').toLowerCase()
    let items = [...store.col<any>('hospitals')].reverse()
    if (q) items = items.filter((h) => h.name?.toLowerCase().includes(q) || h.city?.toLowerCase().includes(q))
    return { status: 'ok', code: 'OK', data: { items, total: items.length } }
  })

  app.get('/api/directory/hospitals/:id', async (req) => {
    const h = store.byId<any>('hospitals', (req.params as any).id)
    if (!h) throw notFound('Hospital not found')
    const departments = store.filter<any>('departments', (d) => d.hospitalId === h.id)
    const doctorCount = store.filter<any>('doctors', (d) => d.hospitalIds?.includes(h.id)).length
    return { status: 'ok', code: 'OK', data: { ...h, departments, doctorCount } }
  })

  app.patch(
    '/api/directory/hospitals/:id',
    { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') },
    async (req) => {
      const h = store.byId<any>('hospitals', (req.params as any).id)
      if (!h) throw notFound('Hospital not found')
      if (!req.user!.roles.includes('PLATFORM_ADMIN') && req.user!.hospitalId !== h.id) {
        throw forbidden('Not your hospital')
      }
      const body = parseBody(
        z.object({
          name: z.string().min(2).optional(),
          city: z.string().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          timezone: z.string().optional(),
        }),
        req.body,
      )
      store.patch('hospitals', h.id, body)
      audit(store, bus, {
        actorId: req.user!.sub,
        action: 'directory.hospital.updated',
        resource: 'hospital',
        resourceId: h.id,
        before: h,
        after: body,
        ip: req.ip,
        correlationId: req.correlationId,
      })
      return { status: 'ok', code: 'OK', data: store.byId('hospitals', h.id) }
    },
  )

  app.post(
    '/api/directory/hospitals/:id/departments',
    { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') },
    async (req) => {
      const h = store.byId<any>('hospitals', (req.params as any).id)
      if (!h) throw notFound('Hospital not found')
      const body = parseBody(z.object({ name: z.string().min(2), description: z.string().optional() }), req.body)
      const dept = store.insert('departments', { id: uuid(), hospitalId: h.id, ...body })
      return { status: 'ok', code: 'CREATED', data: dept }
    },
  )

  app.get('/api/directory/departments/:id', async (req) => {
    const d = store.byId<any>('departments', (req.params as any).id)
    if (!d) throw notFound('Department not found')
    return { status: 'ok', code: 'OK', data: d }
  })

  app.patch(
    '/api/directory/departments/:id',
    { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') },
    async (req) => {
      const d = store.byId<any>('departments', (req.params as any).id)
      if (!d) throw notFound('Department not found')
      store.patch('departments', d.id, parseBody(z.object({ name: z.string().optional(), description: z.string().optional() }), req.body))
      return { status: 'ok', code: 'OK', data: store.byId('departments', d.id) }
    },
  )

  app.post(
    '/api/directory/doctors',
    { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') },
    async (req) => {
      const body = parseBody(
        z.object({
          userId: z.string().uuid().nullish(),
          fullName: z.string().min(2),
          specializations: z.array(z.string()).min(1),
          qualification: z.string().optional(),
          registrationNumber: z.string().min(2),
          experienceYears: z.number().int().nonnegative().default(0),
          hospitalIds: z.array(z.string().uuid()).min(1),
          departmentId: z.string().uuid().nullish(),
          feeAmount: z.number().positive(),
          feeCurrency: z.string().length(3).default('INR'),
          roomNumber: z.string().optional(),
        }),
        req.body,
      )
      for (const hid of body.hospitalIds) {
        if (!store.byId<any>('hospitals', hid)) throw badRequest(`Unknown hospital ${hid}`)
      }
      const doctor = store.insert('doctors', {
        id: uuid(),
        userId: body.userId ?? null,
        fullName: body.fullName,
        specializations: body.specializations,
        qualification: body.qualification ?? null,
        registrationNumber: body.registrationNumber,
        experienceYears: body.experienceYears,
        hospitalIds: body.hospitalIds,
        departmentId: body.departmentId ?? null,
        roomNumber: body.roomNumber ?? null,
        feeConfig: { version: 1, amount: body.feeAmount, currency: body.feeCurrency, effectiveFrom: new Date().toISOString() },
        feeHistory: [],
        isActive: true,
      })
      audit(store, bus, {
        actorId: req.user!.sub,
        action: 'directory.doctor.created',
        resource: 'doctor',
        resourceId: doctor.id,
        ip: req.ip,
        correlationId: req.correlationId,
      })
      return { status: 'ok', code: 'CREATED', data: doctor }
    },
  )

  app.get('/api/directory/doctors', async (req) => {
    const q = String((req.query as any)?.q ?? '').toLowerCase()
    const specialization = String((req.query as any)?.specialization ?? '').toLowerCase()
    const hospitalId = String((req.query as any)?.hospitalId ?? '')
    let items = store.col<any>('doctors').filter((d) => d.isActive)
    if (q)
      items = items.filter(
        (d) =>
          d.fullName?.toLowerCase().includes(q) ||
          d.specializations?.some((s: string) => s.toLowerCase().includes(q)),
      )
    if (specialization) items = items.filter((d) => d.specializations?.some((s: string) => s.toLowerCase().includes(specialization)))
    if (hospitalId) items = items.filter((d) => d.hospitalIds?.includes(hospitalId))
    return { status: 'ok', code: 'OK', data: { items, total: items.length } }
  })

  app.get('/api/directory/doctors/:id', async (req) => {
    const d = store.byId<any>('doctors', (req.params as any).id)
    if (!d) throw notFound('Doctor not found')
    const schedule = store.find<any>('schedules', (s) => s.doctorId === d.id)
    return { status: 'ok', code: 'OK', data: { ...d, schedule: schedule?.weekly ?? null } }
  })

  app.patch(
    '/api/directory/doctors/:id',
    { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') },
    async (req) => {
      const d = store.byId<any>('doctors', (req.params as any).id)
      if (!d) throw notFound('Doctor not found')
      const body = parseBody(
        z.object({
          fullName: z.string().optional(),
          specializations: z.array(z.string()).optional(),
          experienceYears: z.number().int().nonnegative().optional(),
          isActive: z.boolean().optional(),
          feeAmount: z.number().positive().optional(),
          feeCurrency: z.string().length(3).optional(),
        }),
        req.body,
      )
      const beforeFee = d.feeConfig
      const patch: any = {}
      if (body.fullName !== undefined) patch.fullName = body.fullName
      if (body.specializations !== undefined) patch.specializations = body.specializations
      if (body.experienceYears !== undefined) patch.experienceYears = body.experienceYears
      if (body.isActive !== undefined) patch.isActive = body.isActive
      if (body.feeAmount !== undefined && body.feeAmount !== d.feeConfig.amount) {
        patch.feeHistory = [
          ...(d.feeHistory ?? []),
          { ...beforeFee, retiredAt: new Date().toISOString() },
        ]
        patch.feeConfig = {
          version: beforeFee.version + 1,
          amount: body.feeAmount,
          currency: body.feeCurrency ?? d.feeConfig.currency,
          effectiveFrom: new Date().toISOString(),
        }
      }
      store.patch('doctors', d.id, patch)
      audit(store, bus, {
        actorId: req.user!.sub,
        action: 'directory.doctor.updated',
        resource: 'doctor',
        resourceId: d.id,
        before: beforeFee.version,
        after: patch.feeConfig?.version ?? beforeFee.version,
        ip: req.ip,
        correlationId: req.correlationId,
      })
      return { status: 'ok', code: 'OK', data: store.byId('doctors', d.id) }
    },
  )

  app.put(
    '/api/directory/doctors/:id/schedule',
    { preHandler: requireAuth },
    async (req) => {
      const d = store.byId<any>('doctors', (req.params as any).id)
      if (!d) throw notFound('Doctor not found')
      const body = parseBody(
        z.object({
          weekly: z
            .array(
              z.object({
                dayOfWeek: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
                start: z.string().regex(/^\d{2}:\d{2}$/),
                end: z.string().regex(/^\d{2}:\d{2}$/),
                breakStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
                breakEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
              }),
            )
            .max(7),
          slotMinutes: z.number().int().min(5).max(60).default(15),
        }),
        req.body,
      )
      const existing = store.find<any>('schedules', (s) => s.doctorId === d.id)
      if (existing) {
        store.patch('schedules', existing.id, { weekly: body.weekly, slotMinutes: body.slotMinutes })
        return { status: 'ok', code: 'OK', data: store.byId('schedules', existing.id) }
      }
      const s = store.insert('schedules', { id: uuid(), doctorId: d.id, weekly: body.weekly, slotMinutes: body.slotMinutes })
      return { status: 'ok', code: 'CREATED', data: s }
    },
  )

  app.get('/api/directory/doctors/:id/schedule', async (req) => {
    const s = store.find<any>('schedules', (sc) => sc.doctorId === (req.params as any).id)
    if (!s) throw notFound('No schedule configured')
    return { status: 'ok', code: 'OK', data: s }
  })

  function toMinutes(hhmm: string) {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }

  app.get('/api/directory/doctors/:id/availability', async (req) => {
    const d = store.byId<any>('doctors', (req.params as any).id)
    if (!d) throw notFound('Doctor not found')
    const date = String((req.query as any)?.date ?? '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badRequest('date query param required (YYYY-MM-DD)')
    const tz = hospitalTz(store, (req.query as any)?.hospitalId ?? d.hospitalIds?.[0])

    const schedule = store.find<any>('schedules', (s) => s.doctorId === d.id)
    const dayName = DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]
    const daySchedule = schedule?.weekly?.find((w: any) => w.dayOfWeek === dayName)

    const approvedLeave = store
      .filter<any>('leaves', (l) => l.doctorId === d.id && l.status === 'APPROVED' && l.from <= date && l.to >= date)
    const attendanceToday = store.find<any>(
      'attendance',
      (a) => a.doctorId === d.id && a.date === date,
    )

    const slots: { time: string; available: boolean; reason?: string }[] = []
    if (approvedLeave.length > 0) {
      return { status: 'ok', code: 'OK', data: { doctorId: d.id, date, timezone: tz, onLeave: true, slots } }
    }

    if (daySchedule) {
      const startM = attendanceToday ? Math.max(toMinutes(daySchedule.start), toMinutes(attendanceToday.checkedInAt ?? daySchedule.start)) : toMinutes(daySchedule.start)
      const endM = toMinutes(daySchedule.end)
      const breakStartM = daySchedule.breakStart ? toMinutes(daySchedule.breakStart) : -1
      const breakEndM = daySchedule.breakEnd ? toMinutes(daySchedule.breakEnd) : -1
      const step = schedule.slotMinutes ?? 15

      const booked = store
        .filter<any>('appointments', (a) => a.doctorId === d.id && a.date === date && !['CANCELLED'].includes(a.status))
        .map((a) => new Date(a.startsAt).getTime())

      for (let m = startM; m + step <= endM; m += step) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0')
        const mm = String(m % 60).padStart(2, '0')
        const time = `${hh}:${mm}`
        let available = true
        let reason: string | undefined
        if (breakStartM >= 0 && m >= breakStartM && m < breakEndM) {
          available = false
          reason = 'break'
        }
        const slotTime = new Date(`${date}T${time}:00`)
        if (booked.some((b) => Math.abs(b - slotTime.getTime()) < step * 60_000)) {
          available = false
          reason = 'booked'
        }
        slots.push({ time, available, reason })
      }
    }

    return {
      status: 'ok',
      code: 'OK',
      data: {
        doctorId: d.id,
        date,
        timezone: tz,
        checkedIn: Boolean(attendanceToday),
        onLeave: false,
        slots,
      },
    }
  })

  app.post(
    '/api/directory/doctors/:id/attendance/check-in',
    { preHandler: requireRole('DOCTOR', 'RECEPTIONIST', 'HOSPITAL_ADMIN') },
    async (req) => {
      const d = store.byId<any>('doctors', (req.params as any).id)
      if (!d) throw notFound('Doctor not found')
      const tz = hospitalTz(store, (req.body as any)?.hospitalId ?? d.hospitalIds?.[0])
      const { nowIso, dateInTimezone } = await import('../lib/ids.js')
      const date = dateInTimezone(tz)
      const existing = store.find<any>('attendance', (a) => a.doctorId === d.id && a.date === date)
      if (existing?.checkedInAt && !existing.checkedOutAt) throw conflict('Already checked in')
      if (existing) {
        store.patch('attendance', existing.id, { checkedInAt: new Date().toTimeString().slice(0, 5), checkedOutAt: null })
      } else {
        store.insert('attendance', {
          id: uuid(),
          doctorId: d.id,
          hospitalId: d.hospitalIds?.[0],
          date,
          checkedInAt: new Date().toTimeString().slice(0, 5),
          checkedOutAt: null,
        })
      }
      audit(store, bus, {
        actorId: req.user!.sub,
        action: 'directory.attendance.check_in',
        resource: 'doctor',
        resourceId: d.id,
        ip: req.ip,
        correlationId: req.correlationId,
      })
      return { status: 'ok', code: 'OK', data: { doctorId: d.id, date, checkedInAt: new Date().toTimeString().slice(0, 5) } }
    },
  )

  app.post(
    '/api/directory/doctors/:id/attendance/check-out',
    { preHandler: requireRole('DOCTOR', 'RECEPTIONIST', 'HOSPITAL_ADMIN') },
    async (req) => {
      const d = store.byId<any>('doctors', (req.params as any).id)
      if (!d) throw notFound('Doctor not found')
      const tz = hospitalTz(store, (req.body as any)?.hospitalId ?? d.hospitalIds?.[0])
      const { dateInTimezone } = await import('../lib/ids.js')
      const date = dateInTimezone(tz)
      const record = store.find<any>('attendance', (a) => a.doctorId === d.id && a.date === date)
      if (!record || !record.checkedInAt) throw conflict('Not checked in today')
      store.patch('attendance', record.id, { checkedOutAt: new Date().toTimeString().slice(0, 5) })
      return { status: 'ok', code: 'OK', data: store.byId('attendance', record.id) }
    },
  )

  app.post(
    '/api/directory/doctors/:id/leave',
    { preHandler: requireRole('DOCTOR', 'HOSPITAL_ADMIN') },
    async (req) => {
      const d = store.byId<any>('doctors', (req.params as any).id)
      if (!d) throw notFound('Doctor not found')
      const body = parseBody(
        z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().min(3) }),
        req.body,
      )
      if (body.to < body.from) throw badRequest('`to` must be on or after `from`')
      const leave = store.insert('leaves', { id: uuid(), doctorId: d.id, ...body, status: 'PENDING' })
      audit(store, bus, {
        actorId: req.user!.sub,
        action: 'directory.leave.requested',
        resource: 'leave',
        resourceId: leave.id,
        ip: req.ip,
        correlationId: req.correlationId,
      })
      return { status: 'ok', code: 'CREATED', data: leave }
    },
  )

  app.get('/api/directory/doctors/:id/leave', async (req) => {
    const items = store.filter<any>('leaves', (l) => l.doctorId === (req.params as any).id)
    return { status: 'ok', code: 'OK', data: { items } }
  })

  app.patch(
    '/api/directory/leaves/:id',
    { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') },
    async (req) => {
      const leave = store.byId<any>('leaves', (req.params as any).id)
      if (!leave) throw notFound('Leave request not found')
      const body = parseBody(z.object({ status: z.enum(['APPROVED', 'REJECTED']) }), req.body)
      store.patch('leaves', leave.id, { status: body.status, decidedBy: req.user!.sub })
      return { status: 'ok', code: 'OK', data: store.byId('leaves', leave.id) }
    },
  )

  app.get('/api/directory/search', async (req) => {
    const q = String((req.query as any)?.q ?? '').toLowerCase()
    if (q.length < 2) throw badRequest('q must be at least 2 characters')
    const hospitals = store
      .filter<any>('hospitals', (h) => h.name?.toLowerCase().includes(q) || h.city?.toLowerCase().includes(q))
      .map((h) => ({ type: 'hospital', id: h.id, name: h.name, city: h.city }))
    const doctors = store
      .filter<any>(
        'doctors',
        (d) =>
          d.isActive &&
          (d.fullName?.toLowerCase().includes(q) ||
            d.specializations?.some((s: string) => s.toLowerCase().includes(q))),
      )
      .map((d) => ({ type: 'doctor', id: d.id, name: d.fullName, specializations: d.specializations, fee: d.feeConfig }))
    return { status: 'ok', code: 'OK', data: { hospitals, doctors } }
  })
}
