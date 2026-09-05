/**
 * Report routes (spec §26).
 *   GET /api/v1/reports/inspection/:id  — full inspection report
 */
import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { ok } from '../../utils/response';
import { buildReport } from './reports.service';

const router = Router();

router.use(requireAuth);

router.get('/inspection/:id', asyncHandler(async (req, res) => {
  ok(res, await buildReport(req.user!, req.params.id));
}));

export { router as reportsRouter };
export default router;
