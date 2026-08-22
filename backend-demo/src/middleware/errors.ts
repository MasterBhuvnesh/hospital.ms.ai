import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { AppError, validationError } from '../lib/errors.js'

export function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.url} not found`, details: [] },
    })
  })

  app.setErrorHandler((err: any, req: FastifyRequest, reply: FastifyReply) => {
    if (err instanceof ZodError) {
      const ve = validationError(err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))
      return reply.status(ve.statusCode).send({
        error: { code: ve.code, message: ve.message, details: ve.details },
      })
    }
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details ?? [] },
      })
    }
    if (err?.statusCode && err.statusCode < 500) {
      return reply.status(err.statusCode).send({
        error: { code: err.code ?? 'BAD_REQUEST', message: err.message, details: [] },
      })
    }
    req.log.error(err)
    return reply.status(500).send({
      error: { code: 'INTERNAL', message: 'Something went wrong', details: [] },
    })
  })
}
