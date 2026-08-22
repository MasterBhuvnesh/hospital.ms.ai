import OpenAI from 'openai'
import { cfg, has } from '../config.js'
import { AppError } from '../lib/errors.js'
import { sha256 } from '../lib/ids.js'

let client: OpenAI | null = null

export function llmClient(): OpenAI {
  if (!has.llm) {
    throw new AppError(503, 'AI_UNAVAILABLE', 'NVIDIA API key not configured (NVIDIA_API_KEY)')
  }
  if (!client) {
    client = new OpenAI({ apiKey: cfg.llm.apiKey, baseURL: cfg.llm.baseUrl })
  }
  return client
}

export function requireLlm(): OpenAI {
  return llmClient()
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function chatComplete(opts: {
  messages: ChatMessage[]
  temperature?: number
  topP?: number
  maxTokens?: number
  jsonMode?: boolean
}): Promise<{ content: string; reasoning: string; finishReason: string; model: string; promptHash: string }> {
  const c = llmClient()
  const body: any = {
    model: cfg.llm.model,
    messages: opts.messages,
    temperature: opts.temperature ?? cfg.llm.temperature,
    top_p: opts.topP ?? cfg.llm.topP,
    max_tokens: opts.maxTokens ?? cfg.llm.maxTokens,
    chat_template_kwargs: { enable_thinking: true },
  }
  if (opts.jsonMode) body.response_format = { type: 'json_object' }

  const completion = await c.chat.completions.create(body as any)
  const choice = completion.choices[0] as any
  const promptHash = sha256(JSON.stringify(opts.messages.map((m) => m.content)))
  return {
    content: choice?.message?.content ?? '',
    reasoning: choice?.message?.reasoning_content ?? '',
    finishReason: choice?.finish_reason ?? '',
    model: (completion as any).model ?? cfg.llm.model,
    promptHash,
  }
}

export async function* chatStream(opts: {
  messages: ChatMessage[]
  temperature?: number
  topP?: number
  maxTokens?: number
}): AsyncGenerator<{ content?: string; reasoning?: string }> {
  const c = llmClient()
  const stream = await c.chat.completions.create({
    model: cfg.llm.model,
    messages: opts.messages as any,
    temperature: opts.temperature ?? cfg.llm.temperature,
    top_p: opts.topP ?? cfg.llm.topP,
    max_tokens: opts.maxTokens ?? cfg.llm.maxTokens,
    chat_template_kwargs: { enable_thinking: true },
    stream: true,
  } as any)

  for await (const chunk of stream as any) {
    const delta = chunk.choices?.[0]?.delta
    if (!delta) continue
    if (delta.reasoning_content) yield { reasoning: delta.reasoning_content }
    if (delta.content) yield { content: delta.content }
  }
}

export async function embed(texts: string[]): Promise<number[][]> {
  const c = llmClient()
  const res: any = await c.embeddings.create({
    model: cfg.llm.embeddingModel,
    input: texts,
  })
  const sorted = [...res.data].sort((a: any, b: any) => a.index - b.index)
  return sorted.map((d: any) => d.embedding as number[])
}
