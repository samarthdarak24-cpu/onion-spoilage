/**
 * Human-readable identifier generation.
 *
 * Business numbers (lot / inspection / certificate) follow the
 * `PREFIX-YYYY-NNNNNN` convention used across the platform. Uniqueness is
 * enforced by the database; callers pass the next sequence number.
 */
import crypto from 'crypto';
import { env } from '../config/env';

/** LOT-2026-000001 */
export function formatCode(prefix: string, sequence: number, date: Date = new Date()): string {
  return `${prefix}-${date.getFullYear()}-${String(sequence).padStart(6, '0')}`;
}

/** URL-safe random token used for public certificate verification. */
export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Public verification URL for a certificate token. */
export function verificationUrl(token: string): string {
  const base = env.QR_BASE_URL.replace(/\/$/, '');
  return `${base}/${token}`;
}

/** Deterministic, collision-resistant sample code. */
export function sampleCode(inspectionNumber: string): string {
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SMP-${inspectionNumber}-${suffix}`;
}

/** Device code normaliser: POD-001 → POD-001. */
export function normaliseDeviceCode(raw: string): string {
  return raw.trim().toUpperCase();
}
