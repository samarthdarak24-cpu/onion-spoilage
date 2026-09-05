/**
 * Admin configuration routes (spec §32).
 *   GET  /api/v1/config/fusion        — active + history
 *   PUT  /api/v1/config/fusion        — create a new active version (ADMIN)
 *   GET  /api/v1/config/grading       — active thresholds
 *   PUT  /api/v1/config/grading       — update thresholds (ADMIN)
 */
import { Router } from 'express';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { ok } from '../../utils/response';
import { recordAudit } from '../audit/audit.service';
import { realtimeHub } from '../../services/realtime/hub';
import {
  getActiveFusionConfig,
  listFusionConfigs,
  updateFusionConfig,
  getGradingThresholds,
  updateGradingThresholds,
} from './config.service';
import { fusionConfigSchema, gradingThresholdsSchema } from './config.schema';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/fusion', asyncHandler(async (_req, res) => {
  const [active, history] = await Promise.all([getActiveFusionConfig(), listFusionConfigs()]);
  ok(res, { active, history });
}));

router.put('/fusion', validate({ body: fusionConfigSchema }), asyncHandler(async (req, res) => {
  const updated = await updateFusionConfig(req.body, req.user!.id);
  await recordAudit({
    userId: req.user!.id, action: 'CONFIG_UPDATED', entityType: 'FusionConfig',
    entityId: updated.id, metadata: { version: updated.version },
  });
  realtimeHub.publishGlobal('config_fusion_updated', updated);
  ok(res, updated);
}));

router.get('/grading', asyncHandler(async (_req, res) => {
  ok(res, await getGradingThresholds());
}));

router.put('/grading', validate({ body: gradingThresholdsSchema }), asyncHandler(async (req, res) => {
  const updated = await updateGradingThresholds(req.body, req.user!.id);
  await recordAudit({
    userId: req.user!.id, action: 'CONFIG_UPDATED', entityType: 'QualityThreshold',
    metadata: { gradeA: updated.gradeA, urs: updated.urs },
  });
  realtimeHub.publishGlobal('config_grading_updated', updated);
  ok(res, updated);
}));

export { router as configRouter };
export default router;
