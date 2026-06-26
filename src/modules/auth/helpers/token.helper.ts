import { createHash, randomBytes } from 'crypto';
import {
  EMAIL_VERIFY_TTL_MS,
  PASSWORD_RESET_TTL_MS,
} from '../constants/auth.constants';

export function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function getEmailVerifyExpiry(): Date {
  return new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
}

export function getPasswordResetExpiry(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MS);
}
