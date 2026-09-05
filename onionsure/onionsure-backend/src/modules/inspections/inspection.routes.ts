/**
 * Inspection lifecycle routes (spec §9 / §10).
 *
 * Each step maps 1:1 to a state-machine transition. The server is the single
 * source of truth: invalid transitions return 409 INVALID_STATE_TRANSITION,
 * and the frontend merely drives the buttons.
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireOfficer } from '../../middleware/auth';
import { ok, created, paginated, buildPagination } from '../../utils/response';
import { uploadImage } from '../../middleware/upload';
import {
  createInspection,
  assignSample,
  bindDevice,
  completeStabilization,
  addImage,
  runAnalysis,
  runFusion,
  issueCertificate,
  complete,
  cancel,
  getInspection,
  listInspections,
  getTimeline,
} from './inspection.service';
import {
  createInspectionSchema,
  assignSampleSchema,
  bindDeviceSchema,
} from './inspection.schema';

const router = Router();

router.use(requireAuth);

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  status: z.string().optional(),
  lotId: z.string().cuid().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

router.get('/', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  const q = req.query as unknown as z.infer<typeof listQuerySchema>;
  const { rows, total } = await listInspections(req.user!, q);
  paginated(res, rows, buildPagination(total, q.page, q.pageSize));
}));

router.post(
  '/',
  requireOfficer,
  validate({ body: createInspectionSchema }),
  asyncHandler(async (req, res) => {
    created(res, await createInspection(req.user!, req.body.lotId, req.body.centreId));
  }),
);

router.get('/:id', asyncHandler(async (req, res) => {
  ok(res, await getInspection(req.user!, req.params.id));
}));

router.get('/:id/timeline', asyncHandler(async (req, res) => {
  ok(res, await getTimeline(req.params.id));
}));

router.post(
  '/:id/sample',
  requireOfficer,
  validate({ body: assignSampleSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await assignSample(req.user!, req.params.id, req.body.sampleSize, req.body.weight));
  }),
);

router.post(
  '/:id/device',
  requireOfficer,
  validate({ body: bindDeviceSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await bindDevice(req.user!, req.params.id, req.body.deviceCode));
  }),
);

router.post(
  '/:id/stabilization/complete',
  requireOfficer,
  asyncHandler(async (req, res) => {
    ok(res, await completeStabilization(req.user!, req.params.id));
  }),
);

router.post(
  '/:id/images',
  requireOfficer,
  uploadImage,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      ok(res, { message: 'No image provided' });
      return;
    }
    created(res, await addImage(req.user!, req.params.id, req.file));
  }),
);

router.post(
  '/:id/analyze',
  requireOfficer,
  asyncHandler(async (req, res) => {
    ok(res, await runAnalysis(req.user!, req.params.id));
  }),
);

router.post(
  '/:id/fuse',
  requireOfficer,
  asyncHandler(async (req, res) => {
    ok(res, await runFusion(req.user!, req.params.id));
  }),
);

router.post(
  '/:id/certificate',
  requireOfficer,
  asyncHandler(async (req, res) => {
    ok(res, await issueCertificate(req.user!, req.params.id));
  }),
);

router.post(
  '/:id/complete',
  requireOfficer,
  asyncHandler(async (req, res) => {
    ok(res, await complete(req.user!, req.params.id));
  }),
);

router.post(
  '/:id/cancel',
  requireOfficer,
  asyncHandler(async (req, res) => {
    ok(res, await cancel(req.user!, req.params.id));
  }),
);

export { router as inspectionsRouter };
export default router;
