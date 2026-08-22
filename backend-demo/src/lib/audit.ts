import type { Store } from './json-db.js'
import type { Bus } from './events.js'
import { TOPICS } from './events.js'
import { uuid } from './ids.js'

export type AuditInput = {
  actorId?: string | null
  actorRole?: string | null
  action: string
  resource: string
  resourceId?: string | null
  hospitalId?: string | null
  before?: any
  after?: any
  ip?: string | null
  correlationId?: string | null
  reason?: string | null
}

export function audit(store: Store, bus: Bus, input: AuditInput) {
  const row = {
    id: uuid(),
    timestamp: new Date().toISOString(),
    ...input,
  }
  store.insert('auditLogs', row as any)
  bus.publish(TOPICS.auditRecorded, { auditId: row.id, action: input.action, resource: input.resource }, {
    hospitalId: input.hospitalId ?? null,
    actorId: input.actorId ?? null,
  })
  return row
}
