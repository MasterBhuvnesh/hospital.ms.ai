export const ROLES = [
  'PATIENT',
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'PHARMACIST',
  'LAB_TECH',
  'HOSPITAL_ADMIN',
  'PLATFORM_ADMIN',
] as const

export type Role = (typeof ROLES)[number]

export const ADMIN_ROLES: Role[] = ['HOSPITAL_ADMIN', 'PLATFORM_ADMIN']
export const CLINICAL_STAFF_ROLES: Role[] = ['DOCTOR', 'NURSE']
export const STAFF_ROLES: Role[] = ['RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', ...CLINICAL_STAFF_ROLES]
export const ALL_STAFF: Role[] = [...STAFF_ROLES, ...ADMIN_ROLES]
