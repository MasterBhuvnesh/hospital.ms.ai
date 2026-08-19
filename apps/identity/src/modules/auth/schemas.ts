import { z } from 'zod';
import { E164Phone, Role } from '@hms/contracts';

/**
 * Registration takes email OR phone, and requires at least one.
 *
 * Both are optional individually because this product is phone-first: a patient
 * at a district hospital has a number and no address. Making email required
 * would lock out the majority user, and making phone required would lock out an
 * administrator who has only a work address.
 */
export const RegisterRequest = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    email: z.email().optional(),
    phone: E164Phone.optional(),
    // 12 is the NIST minimum for a password with no composition rules. Rules
    // like "one symbol" measurably produce weaker passwords, so there are none.
    password: z.string().min(12).max(200),
  })
  .refine((v) => v.email !== undefined || v.phone !== undefined, {
    message: 'Either email or phone is required',
    path: ['email'],
  });

export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z
  .object({
    email: z.email().optional(),
    phone: E164Phone.optional(),
    password: z.string().min(1).max(200),
  })
  .refine((v) => v.email !== undefined || v.phone !== undefined, {
    message: 'Either email or phone is required',
    path: ['email'],
  });

export type LoginRequest = z.infer<typeof LoginRequest>;

export const OtpPurpose = z.enum(['LOGIN', 'VERIFY_CONTACT', 'RESET_PASSWORD']);

export type OtpPurpose = z.infer<typeof OtpPurpose>;

export const OtpRequest = z
  .object({
    email: z.email().optional(),
    phone: E164Phone.optional(),
    purpose: OtpPurpose.default('LOGIN'),
  })
  .refine((v) => v.email !== undefined || v.phone !== undefined, {
    message: 'Either email or phone is required',
    path: ['phone'],
  });

export type OtpRequest = z.infer<typeof OtpRequest>;

export const OtpVerifyRequest = z
  .object({
    email: z.email().optional(),
    phone: E164Phone.optional(),
    code: z.string().regex(/^\d{4,10}$/),
    purpose: OtpPurpose.default('LOGIN'),
  })
  .refine((v) => v.email !== undefined || v.phone !== undefined, {
    message: 'Either email or phone is required',
    path: ['phone'],
  });

export type OtpVerifyRequest = z.infer<typeof OtpVerifyRequest>;

export const RefreshRequest = z.object({ refreshToken: z.string().min(1) });

export type RefreshRequest = z.infer<typeof RefreshRequest>;

export const TokenPair = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  tokenType: z.literal('Bearer'),
});

export type TokenPair = z.infer<typeof TokenPair>;

export const UserProfile = z.object({
  id: z.uuid(),
  fullName: z.string(),
  email: z.email().nullable(),
  emailVerified: z.boolean(),
  phone: E164Phone.nullable(),
  phoneVerified: z.boolean(),
  roles: z.array(z.object({ hospitalId: z.string(), role: Role, isPrimary: z.boolean() })),
});

export type UserProfile = z.infer<typeof UserProfile>;
