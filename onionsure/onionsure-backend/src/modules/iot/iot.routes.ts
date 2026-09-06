/**
 * IoT device routes (spec §14 / §15).
 *   POST /api/v1/iot/devices                  — register (ADMIN)
 *   GET  /api/v1/iot/devices                  — list (auth, centre-scoped)
 *   GET  /api/v1/iot/devices/:code            — device + recent readings
 *   POST /api/v1/iot/devices/:code/heartbeat  — liveness ping
 *   POST /api/v1/iot/devices/:code/readings    — ingest a batch of readings
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/client';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { ok, created, paginated, buildPagination } from '../../utils/response';
import { registerProbe } from '../../health/registry';
import {
  registerDevice,
  heartbeat,
  ingestReadings,
  listDevices,
  getDevice,
} from './iot.service';
import {
  registerDeviceSchema,
  heartbeatSchema,
  readingsBatchSchema,
} from './iot.schema';

const router = Router();

// Replace the placeholder 'unknown' probe registered at boot (spec §42).
registerProbe('iot', async () => {
  const online = await prisma.ioTDevice.count({ where: { status: 'ONLINE' } });
  const total = await prisma.ioTDevice.count();
  return {
    status: total > 0 ? 'up' : 'down',
    detail: `${online}/${total} devices online`,
  };
});

router.use(requireAuth);

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']).optional(),
});

router.post(
  '/',
  requireAdmin,
  validate({ body: registerDeviceSchema }),
  asyncHandler(async (req, res) => {
    created(res, await registerDevice(req.body));
  }),
);

router.get('/', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  const { page, pageSize, status } = req.query as unknown as z.infer<typeof listQuerySchema>;
  const centreId = req.user!.role === 'PROCUREMENT_OFFICER' ? req.user!.centreId ?? undefined : undefined;
  const [total, rows] = await Promise.all([
    prisma.ioTDevice.count({ where: { ...(centreId && { centreId }), ...(status && { status }) } }),
    listDevices({ centreId: centreId ?? undefined, status }),
  ]);
  // listDevices already applied filters; paginate the in-memory result.
  const start = (page - 1) * pageSize;
  paginated(res, rows.slice(start, start + pageSize), buildPagination(total, page, pageSize));
}));

router.get('/:code', asyncHandler(async (req, res) => {
  ok(res, await getDevice(req.params.code));
}));

router.post(
  '/:code/heartbeat',
  validate({ body: heartbeatSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await heartbeat(req.params.code, req.body, req.user!.id));
  }),
);

router.post(
  '/:code/readings',
  validate({ body: readingsBatchSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await ingestReadings(req.params.code, req.body.readings));
  }),
);

export { router as iotRouter };
export default router;
