/**
 * Authentication business logic (spec §6 / §39).
 *
 * - Passwords are bcrypt-hashed and NEVER returned (DTO projection).
 * - Roles are re-read from the database on every request; the JWT role is only
 *   a hint, never the authority.
 * - Failed logins return a generic message to avoid user enumeration.
 */
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { prisma } from '../../database/client';
import { env } from '../../config/env';
import { unauthorized, conflict } from '../../utils/errors';
import { recordAudit } from '../audit/audit.service';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './token.service';
import type { LoginInput, RegisterInput } from './auth.schema';

/** Public user shape — deliberately excludes passwordHash (spec §6). */
export interface UserDto {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: Role;
  status: string;
  fpoId: string | null;
  centreId: string | null;
  farmerId: string | null;
  buyerId: string | null;
  createdAt: Date;
}

const USER_SELECT = {
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
  passwordHash: true,
  createdAt: true,
} as const;

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: Role;
  status: string;
  fpoId: string | null;
  centreId: string | null;
  farmer: { id: string } | null;
  buyer: { id: string } | null;
  passwordHash: string;
  createdAt: Date;
};

function toDto(row: UserRow): UserDto {
  const { passwordHash: _omit, farmer, buyer, ...rest } = row;
  return {
    ...rest,
    farmerId: farmer?.id ?? null,
    buyerId: buyer?.id ?? null,
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export async function login(input: LoginInput, ctx?: { ip?: string | null; userAgent?: string | null }): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
    select: USER_SELECT,
  }) as UserRow | null;

  // Generic message for both unknown-user and bad-password (no enumeration).
  const invalid = unauthorized('Invalid username or password');

  if (!user) {
    await recordAudit({ action: 'LOGIN', metadata: { username: input.username, outcome: 'unknown_user' }, ...ctx });
    throw invalid;
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    await recordAudit({ userId: user.id, action: 'LOGIN', metadata: { outcome: 'bad_password' }, ...ctx });
    throw invalid;
  }

  if (user.status !== 'ACTIVE') {
    await recordAudit({ userId: user.id, action: 'LOGIN', metadata: { outcome: 'inactive' }, ...ctx });
    throw unauthorized('Account is not active');
  }

  const dto = toDto(user);
  const accessToken = signAccessToken({ sub: dto.id, role: dto.role });
  const refreshToken = signRefreshToken({ sub: dto.id, typ: 'refresh' });

  await recordAudit({
    userId: dto.id,
    action: 'LOGIN',
    entityType: 'User',
    entityId: dto.id,
    metadata: { outcome: 'success', role: dto.role },
    ...ctx,
  });

  return { accessToken, refreshToken, user: dto };
}

export async function register(input: RegisterInput, actorId?: string): Promise<UserDto> {
  const existing = await prisma.user.findUnique({ where: { username: input.username } });
  if (existing) throw conflict('Username already exists');

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  const created = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      role: input.role,
      fpoId: input.fpoId ?? null,
      centreId: input.centreId ?? null,
    },
    select: USER_SELECT,
  }) as UserRow;

  await recordAudit({
    userId: actorId,
    action: 'LOT_CREATED',
    entityType: 'User',
    entityId: created.id,
    metadata: { username: created.username, role: created.role },
  });

  return toDto(created);
}

/** Exchange a refresh token for a fresh pair. */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) throw unauthorized('Invalid or expired refresh token');

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: USER_SELECT,
  }) as UserRow | null;

  if (!user || user.status !== 'ACTIVE') throw unauthorized('Account is not active');

  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    refreshToken: signRefreshToken({ sub: user.id, typ: 'refresh' }),
  };
}

export async function me(userId: string): Promise<UserDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  }) as UserRow | null;

  if (!user) throw unauthorized('User not found');
  return toDto(user);
}
