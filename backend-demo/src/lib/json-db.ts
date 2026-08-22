import fs from 'node:fs'
import path from 'node:path'
import { nowIso } from './ids.js'

export class Store {
  private data = new Map<string, any[]>()
  private timers = new Map<string, NodeJS.Timeout>()

  constructor(private dir: string) {}

  load() {
    fs.mkdirSync(this.dir, { recursive: true })
    for (const f of fs.readdirSync(this.dir)) {
      if (!f.endsWith('.json')) continue
      try {
        this.data.set(f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8')))
      } catch {
        this.data.set(f.slice(0, -5), [])
      }
    }
  }

  col<T = any>(name: string): T[] {
    let c = this.data.get(name)
    if (!c) {
      c = []
      this.data.set(name, c)
    }
    return c
  }

  save(name: string) {
    const t = this.timers.get(name)
    if (t) clearTimeout(t)
    const timer = setTimeout(() => this.flush(name), 25)
    timer.unref()
    this.timers.set(name, timer)
  }

  flush(name: string) {
    fs.mkdirSync(this.dir, { recursive: true })
    const file = path.join(this.dir, `${name}.json`)
    const tmp = `${file}.tmp`
    try {
      fs.writeFileSync(tmp, JSON.stringify(this.col(name), null, 2))
      fs.renameSync(tmp, file)
    } catch {
      fs.writeFileSync(file, JSON.stringify(this.col(name), null, 2))
    }
  }

  flushAll() {
    for (const k of new Set([...this.data.keys(), ...this.timers.keys()])) this.flush(k)
  }

  insert<T extends Record<string, any>>(name: string, row: T): T {
    if (!row.createdAt) (row as any).createdAt = nowIso()
    this.col(name).push(row)
    this.save(name)
    return row
  }

  find<T = any>(name: string, pred: (r: T) => boolean): T | undefined {
    return this.col<T>(name).find(pred)
  }

  byId<T = any>(name: string, id: string): T | undefined {
    return this.col<T>(name).find((r) => (r as any).id === id)
  }

  filter<T = any>(name: string, pred: (r: T) => boolean): T[] {
    return this.col<T>(name).filter(pred)
  }

  patch(name: string, id: string, patch: Record<string, any>) {
    const r = this.byId(name, id)
    if (!r) return undefined
    Object.assign(r, patch, { updatedAt: nowIso() })
    this.save(name)
    return r
  }

  remove<T = any>(name: string, pred: (r: T) => boolean): number {
    const c = this.col(name)
    const kept = c.filter((r) => !pred(r))
    const removed = c.length - kept.length
    if (removed > 0) {
      this.data.set(name, kept)
      this.save(name)
    }
    return removed
  }
}
