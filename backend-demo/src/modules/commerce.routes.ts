import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { uuid } from '../lib/ids.js'
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import type { Store } from '../lib/json-db.js'
import { audit } from '../lib/audit.js'
import { TOPICS } from '../lib/events.js'
import { parseBody } from './scheduling.routes.js'
import { renderPdf } from '../providers/pdf.js'
import { putObject, presignGet } from '../providers/storage.js'
import { has } from '../config.js'

export async function createInvoiceForCompletion(
  app: FastifyInstance,
  payload: {
    consultationId: string
    tokenId: string
    patientId: string
    patientUserId: string | null
    hospitalId: string
    doctorName: string
    feeSnapshot: { version: number; amount: number; currency: string }
  },
  ctx: any = {},
) {
  const { store, bus } = app
  const existing = store.find<any>('invoices', (i) => i.consultationId === payload.consultationId)
  if (existing) return existing

  const counter = store.byId<any>('counters', 'invoices')
  const nextNo = (counter?.value ?? 0) + 1
  if (counter) store.patch('counters', 'invoices', { value: nextNo })
  else store.insert('counters', { id: 'invoices' as any, value: 1 })
  const invoiceNo = `INV-${String(nextNo).padStart(6, '0')}`

  const lineItems = [
    {
      description: `Consultation fee - ${payload.doctorName}`,
      amount: payload.feeSnapshot.amount,
      currency: payload.feeSnapshot.currency,
    },
  ]
  const total = lineItems.reduce((s, li) => s + li.amount, 0)

  const id = uuid()
  let pdfKey: string | null = null
  let pdfUrl: string | null = null
  try {
    const buffer = await renderPdf('Invoice', `${invoiceNo}`, [
      { heading: 'Details', rows: [['Invoice no', invoiceNo], ['Consultation', payload.consultationId], ['Doctor', payload.doctorName], ['Fee config version', String(payload.feeSnapshot.version)]] },
      {
        heading: 'Line items',
        table: {
          columns: ['Description', 'Amount'],
          rows: lineItems.map((li) => [li.description, `${li.amount} ${li.currency}`]),
        },
      },
      { heading: 'Total', text: `${total} ${payload.feeSnapshot.currency}` },
    ])
    pdfKey = `invoices/${id}.pdf`
    const res = await putObject(pdfKey, buffer, 'application/pdf')
    pdfUrl = res.publicUrl
  } catch (e: any) {
    console.error('[pdf] invoice upload failed:', e?.message)
  }

  const invoice = store.insert('invoices', {
    id,
    invoiceNo,
    consultationId: payload.consultationId,
    tokenId: payload.tokenId,
    patientId: payload.patientId,
    patientUserId: payload.patientUserId,
    doctorName: payload.doctorName,
    hospitalId: payload.hospitalId,
    lineItems,
    total,
    currency: payload.feeSnapshot.currency,
    status: 'UNPAID',
    pdfKey,
    pdfUrl,
  })

  bus.publish(
    TOPICS.invoiceGenerated,
    {
      invoiceId: invoice.id,
      invoiceNo,
      total,
      currency: invoice.currency,
      pdfUrl,
      patientUserId: payload.patientUserId,
      patientId: payload.patientId,
    },
    ctx,
  )
  return invoice
}

export function commerceRoutes(app: FastifyInstance) {
  const { store, bus } = app

  app.get('/api/commerce/invoices', { preHandler: requireAuth }, async (req) => {
    const q = req.query as any
    const roles: string[] = req.user!.roles
    const isStaff = roles.some((r) => r !== 'PATIENT')
    let items = [...store.col<any>('invoices')].reverse()
    if (!isStaff) items = items.filter((i) => i.patientUserId === req.user!.sub || store.byId<any>('patients', i.patientId)?.userId === req.user!.sub)
    if (q.patientId && isStaff) items = items.filter((i) => i.patientId === q.patientId)
    if (q.status) items = items.filter((i) => i.status === q.status)
    if (q.consultationId) items = items.filter((i) => i.consultationId === q.consultationId)
    return { status: 'ok', code: 'OK', data: { items: items.slice(0, Number(q.limit ?? 100)), total: items.length } }
  })

  app.get('/api/commerce/invoices/:id', { preHandler: requireAuth }, async (req) => {
    const inv = store.byId<any>('invoices', (req.params as any).id)
    if (!inv) throw notFound('Invoice not found')
    const roles: string[] = req.user!.roles
    const isStaff = roles.some((r) => r !== 'PATIENT')
    if (!isStaff) {
      const ownUser = inv.patientUserId === req.user!.sub
      const ownPatient = store.byId<any>('patients', inv.patientId)?.userId === req.user!.sub
      if (!ownUser && !ownPatient) throw notFound('Invoice not found')
    }
    let downloadUrl = inv.pdfUrl
    if (inv.pdfKey && has.s3) {
      try {
        downloadUrl = await presignGet(inv.pdfKey, 300)
      } catch {}
    }
    return { status: 'ok', code: 'OK', data: { ...inv, downloadUrl } }
  })

  app.post('/api/commerce/payments/intent', { preHandler: requireAuth }, async (req, reply) => {
    const body = parseBody(z.object({ invoiceId: z.string().uuid() }), req.body)
    const inv = store.byId<any>('invoices', body.invoiceId)
    if (!inv) throw notFound('Invoice not found')
    if (inv.status === 'PAID') throw conflict('Invoice already paid')

    const pending = store.find<any>(
      'payments',
      (p) => p.invoiceId === inv.id && p.status === 'PENDING',
    )
    if (pending) return { status: 'ok', code: 'OK', data: pending }

    const counter = store.byId<any>('counters', 'orders')
    const n = (counter?.value ?? 0) + 1
    if (counter) store.patch('counters', 'orders', { value: n })
    else store.insert('counters', { id: 'orders' as any, value: 1 })

    const payment = store.insert('payments', {
      id: uuid(),
      invoiceId: inv.id,
      patientId: inv.patientId,
      patientUserId: inv.patientUserId,
      orderId: `order_demo_${String(n).padStart(8, '0')}`,
      amount: inv.total,
      currency: inv.currency,
      status: 'PENDING',
      method: 'upi',
      provider: 'mock-razorpay',
      capturedAt: null,
    })
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: payment })
  })

  app.post('/api/commerce/payments/mock-capture', { preHandler: requireAuth }, async (req) => {
    const body = parseBody(z.object({ paymentId: z.string().uuid() }), req.body)
    const payment = store.byId<any>('payments', body.paymentId)
    if (!payment) throw notFound('Payment not found')
    if (payment.status !== 'PENDING') throw conflict(`Payment already ${payment.status}`)

    store.patch('payments', payment.id, { status: 'CAPTURED', capturedAt: new Date().toISOString(), method: 'upi-demo' })

    const inv = store.byId<any>('invoices', payment.invoiceId)
    if (inv && inv.status === 'UNPAID') {
      store.patch('invoices', inv.id, { status: 'PAID', paidAt: new Date().toISOString() })
      const token = inv.tokenId ? store.byId<any>('tokens', inv.tokenId) : undefined
      if (token) store.patch('tokens', token.id, { paymentStatus: 'PAID' })

      bus.publish(
        TOPICS.paymentCaptured,
        {
          paymentId: payment.id,
          invoiceId: inv.id,
          invoiceNo: inv.invoiceNo,
          amount: inv.total,
          currency: inv.currency,
          patientId: inv.patientId,
          patientUserId: inv.patientUserId ?? store.byId<any>('patients', inv.patientId)?.userId ?? null,
        },
        {},
      )
      audit(store, bus, {
        actorId: req.user!.sub,
        actorRole: req.user!.roles[0],
        action: 'commerce.payment_captured',
        resource: 'payment',
        resourceId: payment.id,
        after: { amount: inv.total, invoice: inv.invoiceNo },
        ip: req.ip,
        correlationId: req.correlationId,
      })
    }
    return { status: 'ok', code: 'OK', data: store.byId('payments', payment.id) }
  })

  app.get('/api/commerce/payments/:id', { preHandler: requireAuth }, async (req) => {
    const p = store.byId<any>('payments', (req.params as any).id)
    if (!p) throw notFound('Payment not found')
    const roles: string[] = req.user!.roles
    const isStaff = roles.some((r) => r !== 'PATIENT')
    if (!isStaff && p.patientUserId !== req.user!.sub) throw notFound('Payment not found')
    return { status: 'ok', code: 'OK', data: p }
  })

  app.get('/api/commerce/payments/mine/list', { preHandler: requireAuth }, async (req) => {
    const items = [...store.col<any>('payments')]
      .reverse()
      .filter((p) => p.patientUserId === req.user!.sub)
    return { status: 'ok', code: 'OK', data: { items } }
  })

  app.post('/api/commerce/refunds', { preHandler: requireRole('HOSPITAL_ADMIN', 'RECEPTIONIST') }, async (req, reply) => {
    const body = parseBody(
      z.object({
        paymentId: z.string().uuid(),
        amount: z.number().positive().optional(),
        reason: z.string().min(3),
      }),
      req.body,
    )
    const payment = store.byId<any>('payments', body.paymentId)
    if (!payment) throw notFound('Payment not found')
    if (payment.status !== 'CAPTURED') throw conflict(`Cannot refund a ${payment.status} payment`)
    const amount = Math.min(body.amount ?? payment.amount, payment.amount)

    const refund = store.insert('refunds', {
      id: uuid(),
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      patientId: payment.patientId,
      patientUserId: payment.patientUserId,
      amount,
      currency: payment.currency,
      reason: body.reason,
      processedBy: req.user!.sub,
      status: 'COMPLETED',
    })
    store.patch('payments', payment.id, { status: amount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED' })

    bus.publish(
      TOPICS.refundCompleted,
      {
        refundId: refund.id,
        amount,
        currency: payment.currency,
        patientId: payment.patientId,
        patientUserId: payment.patientUserId,
        reason: body.reason,
      },
      {},
    )
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: refund })
  })

  app.post('/api/commerce/pharmacy/items', { preHandler: requireRole('PHARMACIST', 'HOSPITAL_ADMIN') }, async (req, reply) => {
    const body = parseBody(
      z.object({
        name: z.string().min(2),
        form: z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'DROPS', 'OINTMENT', 'OTHER']),
        strength: z.string().min(1),
        manufacturer: z.string().optional(),
        price: z.number().positive(),
        currency: z.string().length(3).default('INR'),
        sku: z.string().min(2),
        lowStockThreshold: z.number().int().nonnegative().default(10),
      }),
      req.body,
    )
    if (store.find<any>('pharmacyItems', (i) => i.sku.toLowerCase() === body.sku.toLowerCase())) {
      throw conflict('SKU already exists')
    }
    const item = store.insert('pharmacyItems', { id: uuid(), ...body, active: true })
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: item })
  })

  app.get('/api/commerce/pharmacy/catalog', async (req) => {
    const q = String((req.query as any)?.q ?? '').toLowerCase()
    let items = store.col<any>('pharmacyItems').filter((i) => i.active)
    if (q) items = items.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    const withStock = items.map((i) => ({
      ...i,
      qtyOnHand: stockOnHand(store, i.id),
    }))
    return { status: 'ok', code: 'OK', data: { items: withStock, total: withStock.length } }
  })

  app.patch('/api/commerce/pharmacy/items/:id', { preHandler: requireRole('PHARMACIST', 'HOSPITAL_ADMIN') }, async (req) => {
    const item = store.byId<any>('pharmacyItems', (req.params as any).id)
    if (!item) throw notFound('Item not found')
    const body = parseBody(
      z.object({
        price: z.number().positive().optional(),
        lowStockThreshold: z.number().int().nonnegative().optional(),
        active: z.boolean().optional(),
        manufacturer: z.string().optional(),
      }),
      req.body,
    )
    store.patch('pharmacyItems', item.id, body)
    return { status: 'ok', code: 'OK', data: store.byId('pharmacyItems', item.id) }
  })

  function stockOnHand(store: Store, itemId: string): number {
    return store
      .filter<any>('inventoryBatches', (b) => b.itemId === itemId)
      .reduce((s: number, b: any) => s + b.qtyRemaining, 0)
  }

  app.post('/api/commerce/inventory/stock-in', { preHandler: requireRole('PHARMACIST', 'HOSPITAL_ADMIN') }, async (req, reply) => {
    const body = parseBody(
      z.object({
        itemId: z.string().uuid(),
        qty: z.number().int().positive(),
        batchNo: z.string().min(1),
        expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
      req.body,
    )
    const item = store.byId<any>('pharmacyItems', body.itemId)
    if (!item) throw notFound('Item not found')
    const batch = store.insert('inventoryBatches', {
      id: uuid(),
      itemId: body.itemId,
      batchNo: body.batchNo,
      expiryDate: body.expiryDate,
      qtyOriginal: body.qty,
      qtyRemaining: body.qty,
    })
    store.insert('stockMovements', { id: uuid(), itemId: body.itemId, batchId: batch.id, deltaQty: body.qty, reason: 'STOCK_IN', refId: batch.id })
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: batch })
  })

  app.get('/api/commerce/inventory/stock', { preHandler: requireRole('PHARMACIST', 'HOSPITAL_ADMIN', 'DOCTOR') }, async (req) => {
    const itemId = String((req.query as any)?.itemId ?? '')
    if (!itemId) throw badRequest('itemId query param required')
    const item = store.byId<any>('pharmacyItems', itemId)
    if (!item) throw notFound('Item not found')
    const batches = store
      .filter<any>('inventoryBatches', (b) => b.itemId === itemId)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
    const qtyOnHand = batches.reduce((s, b) => s + b.qtyRemaining, 0)
    return {
      status: 'ok',
      code: 'OK',
      data: {
        item: { id: item.id, name: item.name, sku: item.sku },
        qtyOnHand,
        belowThreshold: qtyOnHand <= item.lowStockThreshold,
        batches,
      },
    }
  })

  app.get('/api/commerce/inventory/low-stock', { preHandler: requireRole('PHARMACIST', 'HOSPITAL_ADMIN') }, async () => {
    const items = store
      .col<any>('pharmacyItems')
      .filter((i) => i.active)
      .map((i) => ({ item: i, qtyOnHand: stockOnHand(store, i.id) }))
      .filter((x) => x.qtyOnHand <= x.item.lowStockThreshold)
    return { status: 'ok', code: 'OK', data: { items } }
  })

  app.post('/api/commerce/dispense', { preHandler: requireRole('PHARMACIST', 'HOSPITAL_ADMIN') }, async (req, reply) => {
    const body = parseBody(z.object({ prescriptionId: z.string().uuid() }), req.body)
    const rx = store.byId<any>('prescriptions', body.prescriptionId)
    if (!rx) throw notFound('Prescription not found')
    if (rx.status !== 'SIGNED') throw conflict(`Only signed prescriptions can be dispensed (current: ${rx.status})`)
    if (rx.fulfilledAt) throw conflict('Prescription already dispensed')

    const lines: any[] = []
    for (const item of rx.items) {
      const match =
        store.col<any>('pharmacyItems').find((i) => i.active && i.name.toLowerCase() === item.drug.toLowerCase()) ??
        store.col<any>('pharmacyItems').find((i) => i.active && i.name.toLowerCase().includes(item.drug.toLowerCase()))
      if (!match) throw badRequest(`Drug "${item.drug}" not in pharmacy catalog`)
      const batches = store
        .filter<any>('inventoryBatches', (b) => b.itemId === match.id && b.qtyRemaining > 0)
        .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
      const available = batches.reduce((s, b) => s + b.qtyRemaining, 0)
      const need = Math.max(1, Math.ceil(item.durationDays / 5))
      if (available < need) {
        throw conflict(`Insufficient stock for ${match.name}: need ${need}, have ${available}`)
      }
      let remaining = need
      const allocations: any[] = []
      for (const b of batches) {
        if (remaining <= 0) break
        const take = Math.min(b.qtyRemaining, remaining)
        b.qtyRemaining -= take
        remaining -= take
        allocations.push({ batchId: b.id, batchNo: b.batchNo, expiryDate: b.expiryDate, qty: take })
        store.insert('stockMovements', { id: uuid(), itemId: match.id, batchId: b.id, deltaQty: -take, reason: 'DISPENSE', refId: rx.id })
      }
      store.save('inventoryBatches')
      lines.push({ drug: match.name, requested: item.drug, qty: need, unitPrice: match.price, allocations })
    }

    const dispense = store.insert('dispenses', {
      id: uuid(),
      prescriptionId: rx.id,
      patientId: rx.patientId,
      items: lines,
      dispensedBy: req.user!.sub,
      counter: (req.headers['x-counter'] as string) ?? 'main',
    })
    store.patch('prescriptions', rx.id, { status: 'DISPENSED', fulfilledAt: new Date().toISOString() })

    for (const l of lines) {
      const itemRow = store.col<any>('pharmacyItems').find((i) => i.name === l.drug)
      if (!itemRow) continue
      const onHand = stockOnHand(store, itemRow.id)
      if (onHand <= itemRow.lowStockThreshold) {
        bus.publish(TOPICS.stockLow, { itemId: itemRow.id, name: itemRow.name, qtyOnHand: onHand, threshold: itemRow.lowStockThreshold }, {})
      }
    }

    bus.publish(
      TOPICS.pharmacyDispensed,
      {
        dispenseId: dispense.id,
        prescriptionId: rx.id,
        patientId: rx.patientId,
        patientUserId: store.byId<any>('patients', rx.patientId)?.userId ?? null,
        items: lines.map((l) => ({ drug: l.drug, qty: l.qty })),
      },
      {},
    )
    audit(store, bus, {
      actorId: req.user!.sub,
      actorRole: req.user!.roles[0],
      action: 'commerce.dispensed',
      resource: 'dispense',
      resourceId: dispense.id,
      after: { prescriptionId: rx.id },
      ip: req.ip,
      correlationId: req.correlationId,
    })
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: dispense })
  })

  app.get('/api/commerce/dispenses/:id', { preHandler: requireAuth }, async (req) => {
    const d = store.byId<any>('dispenses', (req.params as any).id)
    if (!d) throw notFound('Dispense record not found')
    const roles: string[] = req.user!.roles
    const isStaff = roles.some((r) => r !== 'PATIENT')
    if (!isStaff) {
      const own = store.byId<any>('patients', d.patientId)?.userId === req.user!.sub
      if (!own) throw notFound('Dispense record not found')
    }
    return { status: 'ok', code: 'OK', data: d }
  })
}

export function registerCommerceConsumers(app: FastifyInstance) {
  const { bus, store } = app
  bus.on(TOPICS.appointmentCancelled, async (env: any) => {
    const apptId = env.payload.appointmentId
    const appt = apptId ? store.byId<any>('appointments', apptId) : null
    const tokenId = appt?.tokenId
    const token = tokenId ? store.byId<any>('tokens', tokenId) : null
    if (!token) return
    const invoice = store.find<any>('invoices', (i) => i.consultationId === token.consultationId && i.status === 'UNPAID')
    if (invoice) {
      store.patch('invoices', invoice.id, { status: 'VOID' })
    }
  })
}
