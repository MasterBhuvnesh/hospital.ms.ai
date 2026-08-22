export function normalizePhone(input: string): string {
  const digits = input.replace(/[^\d]/g, '')
  if (input.startsWith('+')) return input
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return input.startsWith('+') ? input : `+${digits}`
}

export const isValidPhone = (p: string) => /^\+[1-9]\d{7,14}$/.test(p)

export function publicUser(u: any) {
  const { passwordHash, ...rest } = u ?? {}
  return rest
}
