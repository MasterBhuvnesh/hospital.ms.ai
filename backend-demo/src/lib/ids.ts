import { createHash, randomBytes, randomInt } from 'node:crypto'

export const uuid = () => randomUUID()
export const nowIso = () => new Date().toISOString()
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
export const randomToken = () => randomBytes(32).toString('hex')
export const otpCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

function randomUUID() {
  return crypto.randomUUID()
}

export function dateInTimezone(tz: string, d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export const addMinutes = (iso: string, m: number) => new Date(new Date(iso).getTime() + m * 60_000).toISOString()
export const minutesBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000)
