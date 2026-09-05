/**
 * Procurement centres (spec §4 / §33).
 * Simple CRUD — persistence only, no business rules, so controllers call
 * Prisma directly. Real domain logic lives in services.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/client';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { ok, created, paginated, buildPagination } from '../../utils/response';
import { notFound } from '../../utils/errors';
import { recordAudit } from '../audit/audit.service';

const router = Router();

const createSchema = z.object({
  centreCode: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  location: z.string().max(160).optional(),
  district: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().optional(),
});

router.use(requireAuth);

router.get('/', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  const { page, pageSize, search } = req.query as unknown as z.infer<typeof listQuerySchema>;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { centreCode: { contains: search, mode: 'insensitive' as const } },
          { district: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.procurementCentre.count({ where }),
    prisma.procurementCentre.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  paginated(res, rows, buildPagination(total, page, pageSize));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const centre = await prisma.procurementCentre.findUnique({ where: { id: req.params.id } });
  if (!centre) throw notFound('Procurement centre', req.params.id);
  ok(res, centre);
}));

router.post('/', requireAdmin, validate({ body: createSchema }), asyncHandler(async (req, res) => {
  const centre = await prisma.procurementCentre.create({ data: req.body });
  await recordAudit({
    userId: req.user!.id, action: 'CONFIG_UPDATED', entityType: 'ProcurementCentre', entityId: centre.id,
    metadata: { centreCode: centre.centreCode },
  });
  created(res, centre);
}));

router.patch('/:id', requireAdmin, validate({ body: updateSchema }), asyncHandler(async (req, res) => {
  const centre = await prisma.procurementCentre.update({ where: { id: req.params.id }, data: req.body });
  ok(res, centre);
}));

export default router;
