import argon2 from 'argon2';

/**
 * argon2id, the OWASP default for password storage: resistant to both GPU
 * cracking and side-channel attacks, unlike argon2d and argon2i respectively.
 *
 * Parameters are the OWASP minimum (19 MiB, 2 iterations, 1 degree of
 * parallelism). They are named here rather than left to the library default so
 * that a library upgrade cannot silently weaken every password in the database.
 */
const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

/**
 * Returns false rather than throwing on a malformed hash, so a corrupt row
 * reads as a failed login instead of a 500 that tells the caller the row is
 * special.
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
