import type { FastifyInstance } from 'fastify'
import { TOPICS } from '../lib/events.js'
import { sendSms, sendWhatsApp } from '../providers/sms.js'
import { sendEmail } from '../providers/email.js'

export type Channel = 'INAPP' | 'EMAIL' | 'SMS' | 'WHATSAPP'
export type Category =
  | 'SECURITY'
  | 'APPOINTMENT'
  | 'QUEUE'
  | 'BILLING'
  | 'DOCUMENT'
  | 'ALERT'
  | 'SYSTEM'

export const DEFAULT_MATRIX: Record<Category, Channel[]> = {
  SECURITY: ['INAPP', 'SMS'],
  APPOINTMENT: ['INAPP', 'EMAIL'],
  QUEUE: ['INAPP', 'SMS'],
  BILLING: ['INAPP', 'EMAIL'],
  DOCUMENT: ['INAPP', 'EMAIL'],
  ALERT: ['INAPP', 'EMAIL'],
  SYSTEM: ['INAPP'],
}

export type NotifyInput = {
  userId: string
  category: Category
  subject: string
  body: string
  link?: string
  meta?: Record<string, any>
  channels?: Channel[]
}

type NotificationRow = {
  id: string
  createdAt: string
  userId: string
  category: Category
  subject: string
  body: string
  link?: string
  meta?: Record<string, any>
  readAt: string | null
  deliveries: { channel: Channel; status: string; provider?: string; error?: string; at: string }[]
}

async function dispatch(app: FastifyInstance, user: any, channel: Channel, subject: string, body: string) {
  switch (channel) {
    case 'INAPP':
      return { status: 'DELIVERED', provider: 'inapp' }
    case 'EMAIL': {
      if (!user.email) return { status: 'SKIPPED_NO_ADDRESS', provider: 'email' }
      try {
        await sendEmail({ to: user.email, subject, text: body, html: `<p>${body}</p>` })
        return { status: 'SENT', provider: 'smtp' }
      } catch (e: any) {
        console.error('[comms] email failed:', e?.message)
        return { status: 'FAILED', provider: 'smtp', error: e?.message }
      }
    }
    case 'SMS': {
      if (!user.phone) return { status: 'SKIPPED_NO_ADDRESS', provider: 'sms' }
      const r = await sendSms(user.phone, `${subject}\n${body}`)
      return r.ok ? { status: 'SENT', provider: r.provider } : { status: 'FAILED', provider: r.provider, error: r.error }
    }
    case 'WHATSAPP': {
      if (!user.phone) return { status: 'SKIPPED_NO_ADDRESS', provider: 'whatsapp' }
      const r = await sendWhatsApp(user.phone, `${subject}\n${body}`)
      return r.ok ? { status: 'SENT', provider: r.provider } : { status: 'FAILED', provider: r.provider, error: r.error }
    }
  }
}

export async function notifyUser(app: FastifyInstance, input: NotifyInput) {
  const { store } = app
  const user = store.byId<any>('users', input.userId)
  if (!user) return null

  const pref = store.find<any>('notificationPrefs', (p) => p.userId === input.userId)
  const resolvedChannels: Channel[] =
    input.channels ?? pref?.categories?.[input.category] ?? [...DEFAULT_MATRIX[input.category]]

  const row: NotificationRow = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    userId: input.userId,
    category: input.category,
    subject: input.subject,
    body: input.body,
    link: input.link,
    meta: input.meta,
    readAt: null,
    deliveries: [],
  }
  store.insert('notifications', row)

  for (const ch of resolvedChannels) {
    const result = await dispatch(app, user, ch, input.subject, input.body)
    row.deliveries.push({ channel: ch, at: new Date().toISOString(), ...result })
  }
  store.save('notifications')
  return row
}

const seen = new Set<string>()

function once(envelope: any): boolean {
  if (seen.has(envelope.messageId)) return false
  seen.add(envelope.messageId)
  if (seen.size > 5000) {
    const first = seen.values().next().value
    if (first) seen.delete(first)
  }
  return true
}

export function registerCommsConsumers(app: FastifyInstance) {
  const { bus, store } = app

  bus.on(TOPICS.userRegistered, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.userId,
      category: 'SYSTEM',
      subject: 'Welcome to Atelier Health',
      body: `Hi ${p.fullName}, your account is ready.`,
    })
  })

  bus.on(TOPICS.appointmentCreated, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'APPOINTMENT',
      subject: 'Appointment confirmed',
      body: `Your appointment with ${p.doctorName} on ${p.startsAt} is confirmed.`,
      meta: { appointmentId: p.appointmentId },
    })
  })

  bus.on(TOPICS.appointmentRescheduled, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'APPOINTMENT',
      subject: 'Appointment rescheduled',
      body: `Your appointment with ${p.doctorName} moved to ${p.startsAt}.`,
      meta: { appointmentId: p.appointmentId },
    })
  })

  bus.on(TOPICS.appointmentCancelled, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'APPOINTMENT',
      subject: 'Appointment cancelled',
      body: `Your appointment with ${p.doctorName} was cancelled.`,
      meta: { appointmentId: p.appointmentId },
    })
  })

  bus.on(TOPICS.appointmentNoShow, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'APPOINTMENT',
      subject: 'Marked as no-show',
      body: `You were marked no-show for the visit with ${p.doctorName}. Contact reception to rebook.`,
    })
  })

  bus.on(TOPICS.queueTokenCreated, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'QUEUE',
      subject: `Token #${p.tokenNumber}`,
      body: `Token ${p.tokenNumber} for ${p.doctorName}. Approx wait ${p.estimatedWaitMin ?? '?'} min.`,
      link: `/queue/${p.tokenId}`,
      meta: { tokenId: p.tokenId },
    })
  })

  bus.on(TOPICS.queuePatientNearTurn, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'QUEUE',
      subject: 'Almost your turn',
      body: `You are ${p.position} away. Please head to ${p.doctorName}'s area.`,
      link: `/queue/${p.tokenId}`,
    })
  })

  bus.on(TOPICS.queueTokenSkipped, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'QUEUE',
      subject: 'Missed turn',
      body: `Your turn with ${p.doctorName} was skipped. Ask reception to recall you.`,
      link: `/queue/${p.tokenId}`,
    })
  })

  bus.on(TOPICS.queueTokenRecalled, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'QUEUE',
      subject: 'It is your turn',
      body: `${p.doctorName} recalled your token. Please come in now.`,
      link: `/queue/${p.tokenId}`,
    })
  })

  bus.on(TOPICS.consultationStarted, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'QUEUE',
      subject: 'Consultation started',
      body: `Your consultation with ${p.doctorName} has started.`,
    })
  })

  bus.on(TOPICS.prescriptionSigned, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'DOCUMENT',
      subject: 'Prescription ready',
      body: `Dr. ${p.doctorName} signed your prescription. PDF: ${p.pdfUrl ?? 'available in-app'}`,
      meta: { prescriptionId: p.prescriptionId },
    })
  })

  bus.on(TOPICS.labResultReleased, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'DOCUMENT',
      subject: 'Lab results released',
      body: `Results for ${p.testNames} are now visible to you.`,
      meta: { labOrderId: p.labOrderId },
    })
  })

  bus.on(TOPICS.invoiceGenerated, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'BILLING',
      subject: `Invoice ${p.invoiceNo}`,
      body: `Invoice ${p.invoiceNo}: ${p.total} ${p.currency}. Pay: /payments`,
      meta: { invoiceId: p.invoiceId },
    })
  })

  bus.on(TOPICS.paymentCaptured, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'BILLING',
      subject: `Payment received for ${p.invoiceNo}`,
      body: `We received ${p.amount} ${p.currency}. Thank you.`,
      meta: { invoiceId: p.invoiceId },
    })
  })

  bus.on(TOPICS.refundCompleted, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'BILLING',
      subject: 'Refund completed',
      body: `Refund of ${p.amount} ${p.currency} has been processed.`,
    })
  })

  bus.on(TOPICS.pharmacyDispensed, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    await notifyUser(app, {
      userId: p.patientUserId,
      category: 'DOCUMENT',
      subject: 'Medicines dispensed',
      body: `Your medicines are ready/collected (${(p.items ?? []).map((i: any) => i.drug).join(', ')}).`,
    })
  })

  bus.on(TOPICS.stockLow, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    const staff = store.filter<any>('users', (u) =>
      u.isActive && (u.roles ?? []).some((r: any) => ['PHARMACIST', 'HOSPITAL_ADMIN'].includes(r.role)),
    )
    for (const s of staff) {
      await notifyUser(app, {
        userId: s.id,
        category: 'ALERT',
        subject: 'Low stock',
        body: `${p.name} is low: ${p.qtyOnHand} left (threshold ${p.threshold}).`,
      })
    }
  })

  bus.on(TOPICS.phiAccessed, async (env: any) => {
    if (!once(env)) return
    const p = env.payload
    if (p.notifyPatient !== false && p.patientUserId) {
      await notifyUser(app, {
        userId: p.patientUserId,
        category: 'SECURITY',
        subject: 'Your record was accessed',
        body: `${p.accessorRole ?? 'Staff'} accessed your record. Reason: ${p.reason ?? 'care'}.`,
      })
    }
  })
}
