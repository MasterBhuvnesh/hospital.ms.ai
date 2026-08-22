import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Store } from './lib/json-db.js'
import { initMemoryStore } from './vector/memories.js'
import { buildApp } from './app.js'
import { cfg } from './config.js'
import { seedDemoData } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const store = new Store(path.resolve(__dirname, '../data'))
  store.load()

  console.log('[boot] initializing pgvector memory store...')
  await initMemoryStore()
  if (cfg.databaseUrl) {
    const ok = (await import('./vector/memories.js')).memoryStatus().available
    console.log(`[boot] pgvector memory: ${ok ? 'ready' : 'DEGRADED'}`)
  }

  const app = await buildApp({ store })

  if (cfg.autoSeed) {
    const seeded = await seedDemoData(store)
    if (seeded) {
      console.log('[seed] demo data created. Accounts:')
      for (const a of seeded.accounts) {
        console.log(`   ${a.label.padEnd(28)} ${a.login.padEnd(26)} ${a.password}`)
      }
    }
  }

  await app.listen({ port: cfg.port, host: cfg.host })
  console.log(`[boot] backend-demo listening on http://localhost:${cfg.port}`)

  const shutdown = async () => {
    console.log('\n[shutdown] flushing JSON store...')
    store.flushAll()
    try {
      await app.close()
    } catch {}
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((e) => {
  console.error('[boot] fatal:', e)
  process.exit(1)
})
