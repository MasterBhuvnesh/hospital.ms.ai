import { EventEmitter } from 'node:events'
import { uuid, nowIso } from './ids.js'
import type { FastifyRequest } from 'fastify'

export const TOPICS = {
  userRegistered: 'user.registered',
  appointmentCreated: 'appointment.created',
  appointmentRescheduled: 'appointment.rescheduled',
  appointmentCancelled: 'appointment.cancelled',
  appointmentNoShow: 'appointment.no_show',
  queueTokenCreated: 'queue.token.created',
  queueTokenUpdated: 'queue.token.updated',
  queueTokenSkipped: 'queue.token.skipped',
  queueTokenRecalled: 'queue.token.recalled',
  queuePatientNearTurn: 'queue.patient.near_turn',
  consultationStarted: 'consultation.started',
  consultationCompleted: 'consultation.completed',
  consultationContentSaved: 'consultation.content.saved',
  patientSheetReady: 'patient_sheet.ready',
  prescriptionSigned: 'prescription.signed',
  consentGranted: 'consent.granted',
  consentRevoked: 'consent.revoked',
  labOrderCreated: 'lab.order.created',
  labSampleCollected: 'lab.sample.collected',
  labResultReleased: 'lab.result.released',
  invoiceGenerated: 'invoice.generated',
  paymentCaptured: 'payment.captured',
  refundCompleted: 'refund.completed',
  pharmacyDispensed: 'pharmacy.dispensed',
  pharmacyOrderPlaced: 'pharmacy.order.placed',
  pharmacyOrderDispensed: 'pharmacy.order.dispensed',
  stockLow: 'stock.low',
  waitlistJoined: 'waitlist.joined',
  appointmentReminderDue: 'appointment.reminder.due',
  auditRecorded: 'audit.recorded',
  phiAccessed: 'phi.accessed',
} as const

export type Envelope = {
  messageId: string
  correlationId: string | null
  causationId?: string | null
  occurredAt: string
  topic: string
  hospitalId: string | null
  actorId: string | null
  payload: any
}

type Ctx = { correlationId?: string; hospitalId?: string | null; actorId?: string | null }

export class Bus extends EventEmitter {
  private log: { at: string; envelope: Envelope }[] = []
  private delayed = new Map<() => void, NodeJS.Timeout>()

  constructor() {
    super()
    this.setMaxListeners(100)
  }

  publish(topic: string, payload: any, ctx: Ctx = {}): Envelope {
    const envelope: Envelope = {
      messageId: uuid(),
      correlationId: ctx.correlationId ?? null,
      occurredAt: nowIso(),
      topic,
      hospitalId: ctx.hospitalId ?? null,
      actorId: ctx.actorId ?? null,
      payload,
    }
    this.log.unshift({ at: nowIso(), envelope })
    if (this.log.length > 200) this.log.pop()
    this.emit(topic, envelope)
    return envelope
  }

  publishLater(topic: string, payload: any, delayMs: number, ctx: Ctx = {}) {
    const t = setTimeout(() => {
      this.publish(topic, payload, ctx)
      this.delayed.delete(fn)
    }, delayMs)
    t.unref()
    const fn = () => {}
    this.delayed.set(fn, t)
  }

  recent(limit = 50) {
    return this.log.slice(0, limit)
  }
}

export function busCtx(req?: FastifyRequest): Ctx {
  if (!req) return {}
  return {
    correlationId: (req as any).correlationId ?? null,
    hospitalId: (req as any)?.user?.hospitalId ?? null,
    actorId: (req as any)?.user?.sub ?? null,
  }
}
