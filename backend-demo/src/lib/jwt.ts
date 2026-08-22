import { SignJWT, jwtVerify } from 'jose'
import { cfg } from '../config.js'
import { unauthorized } from './errors.js'

const secret = new TextEncoder().encode(cfg.jwtSecret)

export type AccessClaims = {
  sub: string
  roles: string[]
  hospitalId: string | null
  sid: string
}

export async function signAccess(claims: AccessClaims, ttlSeconds = 900): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('hms-demo')
    .setAudience('hms-clients')
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret)
}

export async function verifyAccess(token: string): Promise<AccessClaims> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'hms-demo',
      audience: 'hms-clients',
      algorithms: ['HS256'],
    })
    return payload as unknown as AccessClaims
  } catch {
    throw unauthorized('Invalid or expired token')
  }
}
