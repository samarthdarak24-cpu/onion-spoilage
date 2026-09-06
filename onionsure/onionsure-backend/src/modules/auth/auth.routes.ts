/**
 * Auth routes (spec §6).
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/logout
 *   POST /api/v1/auth/refresh
 *   GET  /api/v1/auth/me
 *   POST /api/v1/auth/register   (ADMIN only)
 */
import { Router } from 'express';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireRole } from '../../middleware/auth';
import { authLimiter, registerLimiter } from '../../middleware/rateLimit';
import { ok, created, noContent } from '../../utils/response';
import { recordAudit, requestContext } from '../audit/audit.service';
import { loginSchema, refreshSchema, registerSchema } from './auth.schema';
import * as authService from './auth.service';

const router = Router();

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, requestContext(req));
    ok(res, result);
  }),
);

router.post(
  '/refresh',
  authLimiter,
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const tokens = await authService.refresh(req.body.refreshToken);
    ok(res, tokens);
  }),
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    // JWTs are stateless; the client discards tokens and we record the event.
    await recordAudit({
      userId: req.user?.id,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: req.user?.id,
      ...requestContext(req),
    });
    noContent(res);
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await authService.me(req.user!.id));
  }),
);

router.post(
  '/register',
  requireAuth,
  requireRole('ADMIN'),
  registerLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    created(res, await authService.register(req.body, req.user!.id));
  }),
);

export default router;
