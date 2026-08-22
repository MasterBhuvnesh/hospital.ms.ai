import type { FastifyInstance } from 'fastify'
import type { Store } from './lib/json-db.js'
import type { Bus } from './lib/events.js'

declare module 'fastify' {
  interface FastifyInstance {
    store: Store
    bus: Bus
  }
}
