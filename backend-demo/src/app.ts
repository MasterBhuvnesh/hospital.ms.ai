import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import type { Store } from './lib/json-db.js'
import { Bus } from './lib/events.js'
import { registerCorrelation } from './middleware/auth.js'
import { registerErrorHandler } from './middleware/errors.js'
import { identityRoutes } from './modules/identity.routes.js'
import { directoryRoutes } from './modules/directory.routes.js'
import { schedulingRoutes } from './modules/scheduling.routes.js'
import { clinicalRoutes, registerClinicalConsumers } from './modules/clinical.routes.js'
import { commerceRoutes, registerCommerceConsumers } from './modules/commerce.routes.js'
import { commsRoutes } from './modules/comms.routes.js'
import { aiRoutes } from './modules/ai.routes.js'
import { adminRoutes } from './modules/admin.routes.js'
import { registerCommsConsumers } from './comms/engine.js'
import { memoryStatus } from './vector/memories.js'
import { has, cfg } from './config.js'

export async function buildApp(opts: { store: Store }) {
  const app = Fastify({ logger: false })
  app.decorate('store', opts.store)
  app.decorate('bus', new Bus())

  await app.register(helmet)
  await app.register(cors, { origin: true })

  registerCorrelation(app)
  registerErrorHandler(app)

  app.get('/health/live', async () => ({ status: 'ok', code: 'OK', data: { live: true } }))
  app.get('/health/ready', async () => {
    const memory = memoryStatus()
    return {
      status: 'ok',
      code: 'OK',
      data: {
        ready: true,
        components: {
          jsonStore: true,
          pgvectorMemory: memory.available,
          smtpEmail: has.smtp,
          s3Storage: has.s3,
          llm: has.llm,
          twilioSms: has.twilioSms || 'console-fallback',
          twilioWhatsapp: has.twilioWhatsapp || 'console-fallback',
        },
        memoryLastError: memory.available ? null : memory.lastError,
      },
    }
  })

  app.get('/api/config/app', async () => ({
    status: 'ok',
    code: 'OK',
    data: {
      minSupportedVersion: cfg.minSupportedVersion || null,
      storeUrl: null,
    },
  }))

  identityRoutes(app)
  directoryRoutes(app)
  schedulingRoutes(app)
  clinicalRoutes(app)
  commerceRoutes(app)
  commsRoutes(app)
  aiRoutes(app)
  adminRoutes(app)

  registerCommsConsumers(app)
  registerCommerceConsumers(app)
  registerClinicalConsumers(app)

  return app
}
