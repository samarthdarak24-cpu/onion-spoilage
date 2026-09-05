/**
 * Authentication & role guards (spec §6 / §40).
 *
 * `requireAuth` resolves the FULL user row from the database on every request.
 * Role is therefore authoritative server-side — a forged role claim in a JWT
 * cannot grant access because the DB record is what gets enforced.
 */
import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../database/client';
import { forbidden, unauthorized } from '../utils/errors';
import { extractBearerToken, verifyAccessToken } from '../modules/auth/token.service';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) throw unauthorized('Authentication required');

    const payload = verifyAccessToken(token);
    if (!payload) throw unauthorized('Invalid or expired token');

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        status: true,
        fpoId: true,
        centreId: true,
        farmer: { select: { id: true } },
        buyer: { select: { id: true } },
      },
    });

    if (!user) throw unauthorized('User no longer exists');
    if (user.status !== 'ACTIVE') throw unauthorized('Account is not active');

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      fpoId: user.fpoId,
      centreId: user.centreId,
      farmerId: user.farmer?.id ?? null,
      buyerId: user.buyer?.id ?? null,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/** Allow only the listed roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`Requires role: ${roles.join(' | ')}`));
    }
    next();
  };
}

/** Semantic alias — allow any one of the listed roles. */
export const requireAnyRole = requireRole;

/** Convenience guards for the five platform roles. */
export const requireAdmin = requireRole('ADMIN');
export const requireOfficer = requireRole('PROCUREMENT_OFFICER', 'ADMIN');
export const requireFpo = requireRole('FPO', 'ADMIN');
export const requireFarmer = requireRole('FARMER', 'ADMIN');
export const requireBuyer = requireRole('BUYER', 'ADMIN');
