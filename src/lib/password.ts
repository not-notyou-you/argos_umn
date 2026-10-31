import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const COMMON = new Set([
  'password1234', 'passwordpassword', '123456789012', '1234567890123', 'qwertyuiop12', 'qwertyuiop123',
  'adminadmin12', 'administrator', 'argosargos12', 'argosclubumn', 'universitasmultimedia', 'iloveyou1234',
]);

export const hashPassword = (password: string) => hash(password, OPTIONS);
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password, OPTIONS);

/** Mengembalikan kunci pesan error, atau null jika valid. */
export function passwordProblem(password: string): 'tooShort' | 'tooCommon' | null {
  if (password.length < 12) return 'tooShort';
  if (COMMON.has(password.toLowerCase())) return 'tooCommon';
  return null;
}

/** Password sementara: 16 karakter tanpa huruf yang mudah tertukar. */
export function temporaryPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(16), (b) => alphabet[b % alphabet.length]).join('');
}
