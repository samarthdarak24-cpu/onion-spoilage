/**
 * Analytics routes (spec §25). Role-aware; the backend derives everything.
 *   GET /api/v1/analytics/dashboard  — returns the dashboard for the caller's role
 *   GET /api/v1/analytics/overview   — cross-cut overview (ADMIN)
 */
import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { ok } from '../../utils/response';
import {
  dashboardFor,
  adminDashboard,
  officerDashboard,
  fpoDashboard,
  farmerDashboard,
  buyerDashboard,
} from './analytics.service';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', asyncHandler(async (req, res) => {
  ok(res, await dashboardFor(req.user!));
}));

// Explicit role endpoints (handy for the frontend's named dashboards).
router.get('/officer', asyncHandler(async (req, res) => { ok(res, await officerDashboard(req.user!)); }));
router.get('/fpo', asyncHandler(async (req, res) => { ok(res, await fpoDashboard(req.user!)); }));
router.get('/farmer', asyncHandler(async (req, res) => { ok(res, await farmerDashboard(req.user!)); }));
router.get('/buyer', asyncHandler(async (req, res) => { ok(res, await buyerDashboard(req.user!)); }));

router.get('/overview', requireAdmin, asyncHandler(async (req, res) => {
  ok(res, await adminDashboard(req.user!));
}));

export { router as analyticsRouter };
export default router;
