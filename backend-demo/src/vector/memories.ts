import { Pool } from 'pg'
import { cfg, has } from '../config.js'
import { embed } from '../providers/llm.js'
import { uuid } from '../lib/ids.js'
import { AppError } from '../lib/errors.js'

let pool: Pool | null = null
let available = false
let lastError: string | null = null
export let embeddingDimensions = 0

function getPool(): Pool {
  if (!has.pg) throw new Error('DATABASE_URL not configured')
  if (!pool) {
    const u = new URL(cfg.databaseUrl)
    pool = new Pool({
      host: u.hostname,
      port: Number(u.port || 5432),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000,
    })
  }
  return pool
}

export async function initMemoryStore() {
  if (!has.pg) {
    lastError = 'DATABASE_URL not configured'
    return
  }
  try {
    const p = getPool()
    await p.query('CREATE EXTENSION IF NOT EXISTS vector')
    await p.query(`
      CREATE TABLE IF NOT EXISTS ai_memories (
        id uuid PRIMARY KEY,
        user_id text NOT NULL,
        kind text NOT NULL DEFAULT 'EPISODIC',
        content text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        embedding vector,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await p.query('CREATE INDEX IF NOT EXISTS ai_memories_user_idx ON ai_memories(user_id)')
    available = true
  } catch (e: any) {
    available = false
    lastError = e?.message ?? String(e)
    console.error('[pgvector] init failed:', lastError)
  }
}

function assertAvailable() {
  if (!available) {
    throw new AppError(503, 'MEMORY_UNAVAILABLE', `pgvector store unavailable: ${lastError ?? 'not initialised'}`)
  }
}

const toVec = (v: number[]) => `[${v.join(',')}]`

export async function addMemory(input: { userId: string; kind?: string; content: string; metadata?: any }) {
  assertAvailable()
  let vec: number[] | null = null
  try {
    ;[vec] = await embed([input.content])
    embeddingDimensions = vec!.length
  } catch (e: any) {
    console.error('[pgvector] embed failed, storing unembedded:', e?.message)
  }
  const id = uuid()
  await getPool().query(
    `INSERT INTO ai_memories (id, user_id, kind, content, metadata, embedding)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector)`,
    [
      id,
      input.userId,
      input.kind && ['PROFILE', 'EPISODIC', 'PREFERENCE'].includes(input.kind) ? input.kind : 'EPISODIC',
      input.content,
      JSON.stringify(input.metadata ?? {}),
      vec ? toVec(vec) : null,
    ],
  )
  return { id, embedded: Boolean(vec), dimensions: vec?.length ?? 0 }
}

export async function searchMemories(userId: string, query: string, k = 8) {
  assertAvailable()
  try {
    const [v] = await embed([query])
    embeddingDimensions = v.length
    const res = await getPool().query(
      `SELECT id, kind, content, metadata, created_at, round((1 - (embedding <=> $2::vector))::numeric, 4) AS score
       FROM ai_memories
       WHERE user_id = $1 AND embedding IS NOT NULL
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
      [userId, toVec(v), k],
    )
    return { mode: 'vector', results: res.rows }
  } catch (e: any) {
    console.error('[pgvector] vector search failed, keyword fallback:', e?.message)
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .slice(0, 5)
    const clauses = terms.map((_, i) => `content ILIKE $${i + 2}`)
    const sql = `SELECT id, kind, content, metadata, created_at
                 FROM ai_memories
                 WHERE user_id = $1 ${clauses.length ? `AND (${clauses.join(' OR ')})` : ''}
                 ORDER BY created_at DESC
                 LIMIT ${Math.min(k, 50)}`
    const res = await getPool().query(sql, [userId, ...terms.map((t) => `%${t}%`)])
    return { mode: 'keyword-fallback', results: res.rows }
  }
}

export async function listMemories(userId: string, limit = 50) {
  assertAvailable()
  const res = await getPool().query(
    `SELECT id, kind, content, metadata, (embedding IS NOT NULL) AS embedded, created_at
     FROM ai_memories WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, Math.min(limit, 200)],
  )
  return res.rows
}

export async function deleteMemories(userId: string) {
  assertAvailable()
  const res = await getPool().query('DELETE FROM ai_memories WHERE user_id = $1', [userId])
  return { deleted: res.rowCount ?? 0 }
}

export function memoryStatus() {
  return {
    available,
    lastError,
    provider: 'neon-postgres-pgvector',
    embeddingModel: cfg.llm.embeddingModel,
    embeddingDimensions,
  }
}
