import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { badRequest, forbidden, notFound, validationError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { chatComplete, chatStream } from '../providers/llm.js'
import { has } from '../config.js'
import { TOPICS } from '../lib/events.js'
import { memoryStatus, searchMemories } from '../vector/memories.js'
import { assertRecordAccess, buildPatientSheet } from './clinical.routes.js'
import { findPatientByUser } from './scheduling.routes.js'

function extractJson(text: string): any | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

async function memoryContext(userId?: string | null): Promise<string> {
  if (!userId) return ''
  try {
    const { results } = await searchMemories(userId, 'patient context preferences history', 5)
    if (!results.length) return ''
    const lines = results.map((r: any) => `- (${r.kind}) ${r.content}`)
    return `\n\nKnown context about this user:\n${lines.join('\n')}`
  } catch {
    return ''
  }
}

export function aiRoutes(app: FastifyInstance) {
  const { store, bus } = app

  app.get('/api/ai/status', async () => {
    return {
      status: 'ok',
      code: 'OK',
      data: {
        llm: has.llm,
        model: process.env.LLM_MODEL ?? null,
        embeddingModel: process.env.EMBEDDING_MODEL ?? null,
        memory: memoryStatus(),
      },
    }
  })

  app.post('/api/ai/chat', { preHandler: requireAuth }, async (req) => {
    const body = validationParse(
      z.object({
        message: z.string().min(1).max(8000).optional(),
        messages: z
          .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) }))
          .optional(),
      }),
      req.body,
    )
    const history = body.messages ?? []
    const lastMessage = body.message ?? history[history.length - 1]?.content
    if (!lastMessage) throw badRequest('message or messages required')

    const mem = await memoryContext(req.user!.sub)
    const completion = await chatComplete({
      messages: [
        {
          role: 'system',
          content:
            'You are the Atelier Health patient copilot. You help patients understand appointments, prescriptions, lab results and general wellness. You never provide a definitive diagnosis, always recommend consulting a doctor for clinical decisions, and you never invent medical records.' +
            mem,
        },
        ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: lastMessage },
      ],
    })

    try {
      const memories = await import('../vector/memories.js')
      await memories.addMemory({
        userId: req.user!.sub,
        kind: 'EPISODIC',
        content: `Copilot chat - patient asked: ${lastMessage.slice(0, 300)}`,
        metadata: { type: 'chat' },
      })
    } catch {}

    bus.publish(TOPICS.auditRecorded, { action: 'ai.chat' }, {})
    return {
      status: 'ok',
      code: 'OK',
      data: {
        content: completion.content,
        reasoning: completion.reasoning,
        finishReason: completion.finishReason,
        model: completion.model,
      },
    }
  })

  app.post('/api/ai/chat/stream', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({ message: z.string().min(1).max(8000) }).parse(req.body)

    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })

    const mem = await memoryContext(req.user!.sub)
    try {
      for await (const delta of chatStream({
        messages: [
          {
            role: 'system',
            content: 'You are the Atelier Health patient copilot. Be concise and safe.' + mem,
          },
          { role: 'user', content: body.message },
        ],
      })) {
        if (delta.reasoning) {
          reply.raw.write(`event: reasoning\ndata: ${JSON.stringify({ text: delta.reasoning })}\n\n`)
        }
        if (delta.content) {
          reply.raw.write(`event: content\ndata: ${JSON.stringify({ text: delta.content })}\n\n`)
        }
      }
      reply.raw.write(`data: [DONE]\n\n`)
    } catch (e: any) {
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: e?.message })}\n\n`)
    }
    reply.raw.end()
    return reply
  })

  app.post('/api/ai/patients/:id/sheet-draft', { preHandler: requireRole('DOCTOR', 'NURSE') }, async (req) => {
    const patientId = (req.params as any).id
    assertRecordAccess(app, req as any, patientId)
    const sheet = buildPatientSheet(app, patientId)

    const completion = await chatComplete({
      jsonMode: true,
      maxTokens: 1500,
      messages: [
        {
          role: 'system',
          content:
            'You are the Atelier Health patient-sheet agent. Given structured patient data, produce a JSON object with keys: summary (string), alerts (string[] - especially allergies and dangerous interactions), suggestedQuestions (string[] - what the doctor should explore). Respond with ONLY the JSON.',
        },
        { role: 'user', content: JSON.stringify(sheet) },
      ],
    })

    const parsed = extractJson(completion.content)
    bus.publish(TOPICS.auditRecorded, { action: 'ai.sheet_draft', resourceId: patientId }, {})
    return {
      status: 'ok',
      code: 'OK',
      data: {
        source: 'ai',
        draft: parsed ?? { summary: completion.content, alerts: [], suggestedQuestions: [] },
        rawModel: completion.content,
        finishReason: completion.finishReason,
        baseline: sheet,
      },
    }
  })

  app.post('/api/ai/consultations/:cid/scribe', { preHandler: requireRole('DOCTOR') }, async (req) => {
    const cid = (req.params as any).cid
    const token = store.find<any>('tokens', (t) => t.consultationId === cid)
    if (!token) throw notFound('Consultation not found')
    const body = z.object({ transcript: z.string().min(10).max(20000) }).parse(req.body)

    const completion = await chatComplete({
      jsonMode: true,
      maxTokens: 2000,
      messages: [
        {
          role: 'system',
          content:
            'You are a medical scribe. Convert the consultation transcript into a JSON SOAP note with keys: subjective, objective, assessment, plan, redFlags (string[] of anything alarming requiring escalation). Respond with ONLY the JSON. This is a DRAFT - a doctor will review and sign it.',
        },
        { role: 'user', content: `Consultation transcript:\n${body.transcript}` },
      ],
    })

    const parsed = extractJson(completion.content)
    return {
      status: 'ok',
      code: 'OK',
      data: {
        draft: parsed ?? { subjective: '', objective: '', assessment: '', plan: '', redFlags: [], raw: completion.content },
        finishReason: completion.finishReason,
        note: 'This is a draft. The doctor must review and save it through the consultation content endpoint before it becomes part of the record.',
      },
    }
  })

  app.post('/api/ai/memory', { preHandler: requireAuth }, async (req, reply) => {
    const body = validationParse(
      z.object({
        kind: z.enum(['PROFILE', 'EPISODIC', 'PREFERENCE']).default('EPISODIC'),
        content: z.string().min(2).max(2000),
        metadata: z.record(z.any()).optional(),
      }),
      req.body,
    )
    const memories = await import('../vector/memories.js')
    const result = await memories.addMemory({ userId: req.user!.sub, ...body })
    return reply.code(201).send({ status: 'ok', code: 'CREATED', data: result })
  })

  app.get('/api/ai/memory', { preHandler: requireAuth }, async (req) => {
    const limit = Number((req.query as any)?.limit ?? 50)
    const memories = await import('../vector/memories.js')
    const items = await memories.listMemories(req.user!.sub, limit)
    return { status: 'ok', code: 'OK', data: { items } }
  })

  app.post('/api/ai/memory/search', { preHandler: requireAuth }, async (req) => {
    const body = validationParse(
      z.object({ query: z.string().min(2).max(500), k: z.number().int().min(1).max(50).default(8) }),
      req.body,
    )
    const memories = await import('../vector/memories.js')
    const result = await memories.searchMemories(req.user!.sub, body.query, body.k)
    return { status: 'ok', code: 'OK', data: result }
  })

  app.delete('/api/ai/memory', { preHandler: requireAuth }, async (req) => {
    const memories = await import('../vector/memories.js')
    const result = await memories.deleteMemories(req.user!.sub)
    return { status: 'ok', code: 'OK', data: result }
  })
}

function validationParse<T extends z.ZodTypeAny>(schema: T, body: any): z.infer<T> {
  const r = schema.safeParse(body)
  if (!r.success) throw validationError(r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))
  return r.data
}
