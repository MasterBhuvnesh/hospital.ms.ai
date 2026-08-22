import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from './lib/ids.js'

export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const isoAt = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:30`).toISOString()
export const dayOffset = (n: number) => {
  const d = new Date(Date.now() + n * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function canonicalHash(obj: unknown): string {
  return sha256(JSON.stringify(obj))
}

const __filename = fileURLToPath(import.meta.url)
export const dataDirOf = () => path.resolve(path.dirname(__filename), '../data')
