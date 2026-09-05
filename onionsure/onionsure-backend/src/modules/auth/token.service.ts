/**
 * JWT issuing & verification (spec §6).
 *
 * Access payload: `{ sub, role }`. Refresh tokens carry a separate secret and a
 * `typ` claim so an access token can never be replayed as a refresh token.
 */
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../../config/env';

const ALGORITHM = 'HS256' as const;

export interface AccessPayload {
  sub: string;
  role: Role;
}

export interface RefreshPayload {
  sub: string;
  typ: 'refresh';
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] }) as AccessPayload & { typ?: string };
    // Reject refresh tokens presented as access tokens.
    if (decoded.typ === 'refresh' || !decoded.sub || !decoded.role) return null;
    return { sub: decoded.sub, role: decoded.role };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALGORITHM] }) as RefreshPayload;
    if (decoded.typ !== 'refresh' || !decoded.sub) return null;
    return { sub: decoded.sub, typ: 'refresh' };
  } catch {
    return null;
  }
}

/** Extract `Bearer <token>` from an Authorization header. */
export function extractBearerToken(header?: string): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
