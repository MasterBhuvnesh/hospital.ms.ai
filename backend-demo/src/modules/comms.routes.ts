import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { uuid } from '../lib/ids.js'
import { badRequest, notFound, validationError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { DEFAULT_MATRIX, type Category, type Channel } from '../comms/engine.js'

const CATEGORIES = Object.keys(DEFAULT_MATRIX) as Category[]
const CHANNELS: Channel[] = ['INAPP', 'EMAIL', 'SMS', 'WHATSAPP']

export function commsRoutes(app: FastifyInstance) {
  const { store } = app

  app.get('/api/comms/notifications', { preHandler: requireAuth }, async (req) => {
    const items = store
      .filter<any>('notifications', (n) => n.userId === req.user!.sub)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return {
      status: 'ok',
      code: 'OK',
      data: {
        items: items.slice(0, Number((req.query as any)?.limit ?? 50)),
        unreadCount: items.filter((n) => !n.readAt).length,
        total: items.length,
      },
    }
  })

  app.post('/api/comms/notifications/:id/read', { preHandler: requireAuth }, async (req) => {
    const n = store.byId<any>('notifications', (req.params as any).id)
    if (!n || n.userId !== req.user!.sub) throw notFound('Notification not found')
    if (!n.readAt) store.patch('notifications', n.id, { readAt: new Date().toISOString() })
    return { status: 'ok', code: 'OK', data: store.byId('notifications', n.id) }
  })

  app.post('/api/comms/notifications/read-all', { preHandler: requireAuth }, async (req) => {
    let count = 0
    for (const n of store.filter<any>('notifications', (x) => x.userId === req.user!.sub && !x.readAt)) {
      n.readAt = new Date().toISOString()
      count++
    }
    if (count > 0) store.save('notifications')
    return { status: 'ok', code: 'OK', data: { marked: count } }
  })

  app.get('/api/comms/preferences', { preHandler: requireAuth }, async (req) => {
    const pref = store.find<any>('notificationPrefs', (p) => p.userId === req.user!.sub)
    return {
      status: 'ok',
      code: 'OK',
      data: pref?.categories ?? DEFAULT_MATRIX,
    }
  })

  app.put('/api/comms/preferences', { preHandler: requireAuth }, async (req) => {
    const parsed = z
      .object({
        categories: z.record(z.array(z.enum(['INAPP', 'EMAIL', 'SMS', 'WHATSAPP']))),
      })
      .safeParse(req.body)
    if (!parsed.success) throw validationError(parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))

    for (const [category, channels] of Object.entries(parsed.data.categories)) {
      if (!CATEGORIES.includes(category as Category)) throw badRequest(`Unknown category: ${category}`)
      if ((channels as string[]).length === 0 && category !== 'MARKETING') {
        throw badRequest(`${category} must keep at least the INAPP channel`)
      }
    }

    const existing = store.find<any>('notificationPrefs', (p) => p.userId === req.user!.sub)
    if (existing) {
      existing.categories = { ...DEFAULT_MATRIX, ...existing.categories, ...parsed.data.categories }
      store.save('notificationPrefs')
      return { status: 'ok', code: 'OK', data: existing.categories }
    }
    const row = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      userId: req.user!.sub,
      categories: { ...DEFAULT_MATRIX, ...parsed.data.categories },
    }
    store.insert('notificationPrefs', row)
    return { status: 'ok', code: 'OK', data: row.categories }
  })

  app.post('/api/comms/test-send', { preHandler: requireRole('HOSPITAL_ADMIN', 'PLATFORM_ADMIN') }, async (req) => {
    const r = z
      .object({
        channel: z.enum(['INAPP', 'EMAIL', 'SMS', 'WHATSAPP']),
        subject: z.string().min(1),
        body: z.string().min(1),
      })
      .parse(req.body)
    const { notifyUser } = await import('../comms/engine.js')
    const row = await notifyUser(app, {
      userId: req.user!.sub,
      category: 'SYSTEM',
      subject: r.subject,
      body: r.body,
      channels: [r.channel],
    })
    return { status: 'ok', code: 'OK', data: row }
  })
}
