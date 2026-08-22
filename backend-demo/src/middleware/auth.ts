import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { verifyAccess } from '../lib/jwt.js'
import { unauthorized, forbidden } from '../lib/errors.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: { sub: string; roles: string[]; hospitalId: string | null; sid: string }
    correlationId?: string
  }
}

export async function authenticate(req: FastifyRequest): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw unauthorized('Missing bearer token')
  req.user = await verifyAccess(header.slice(7))
}

export function requireRole(...roles: string[]) {
  return async (req: FastifyRequest) => {
    await authenticate(req)
    if (roles.length > 0 && !req.user!.roles.some((r) => roles.includes(r))) {
      throw forbidden(`Requires role: ${roles.join(' or ')}`)
    }
  }
}

export const requireAuth = requireRole()

export function registerCorrelation(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    req.correlationId =
      (req.headers['x-correlation-id'] as string) || `cid_${Math.random().toString(36).slice(2, 12)}`
    reply.header('x-correlation-id', req.correlationId)
  })

  app.addHook('onRequest', async (req) => {
    for (const h of Object.keys(req.headers)) {
      if (h.toLowerCase().startsWith('x-user-')) delete (req.headers as any)[h]
    }
  })
}
