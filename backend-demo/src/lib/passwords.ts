import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(_scrypt) as (p: string, s: Buffer, k: number) => Promise<Buffer>

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored?.startsWith('scrypt$')) return false
  const [, saltHex, hashHex] = stored.split('$')
  try {
    const hash = await scrypt(password, Buffer.from(saltHex, 'hex'), 64)
    return timingSafeEqual(hash, Buffer.from(hashHex, 'hex'))
  } catch {
    return false
  }
}
