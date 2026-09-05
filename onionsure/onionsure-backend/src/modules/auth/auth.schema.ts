/** Request validation schemas for the auth module (spec §6). */
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'username is required').max(64),
  password: z.string().min(1, 'password is required').max(256),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8, 'password must be at least 8 characters').max(256),
  name: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().max(32).optional(),
  role: z.enum(['PROCUREMENT_OFFICER', 'FPO', 'FARMER', 'BUYER', 'ADMIN']),
  fpoId: z.string().cuid().optional(),
  centreId: z.string().cuid().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
