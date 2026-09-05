/**
 * Demo routes (spec §34).
 *   GET  /api/v1/demo/scenarios  — list available scenarios
 *   POST /api/v1/demo/run        — run a full end-to-end scenario (OFFICER+)
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireOfficer } from '../../middleware/auth';
import { ok } from '../../utils/response';
import { runScenario, SCENARIOS } from './demo.service';

const router = Router();

const runSchema = z.object({
  scenario: z.enum(SCENARIOS),
  lotId: z.string().cuid().optional(),
});

router.use(requireAuth);

router.get('/scenarios', (_req, res) => {
  ok(res, { scenarios: SCENARIOS });
});

router.post(
  '/run',
  requireOfficer,
  validate({ body: runSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await runScenario(req.user!, req.body.scenario, req.body.lotId));
  }),
);

export { router as demoRouter };
export default router;
