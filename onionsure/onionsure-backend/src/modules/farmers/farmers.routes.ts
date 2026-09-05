/**
 * Farmers (spec §4 / §40).
 * FPO users are scoped to their own FPO's farmers at the query level.
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
  farmerCode: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  phone: z.string().max(32).optional(),
  village: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  fpoId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().optional(),
  fpoId: z.string().cuid().optional(),
});

router.use(requireAuth);

router.get('/', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  const { page, pageSize, search, fpoId } = req.query as unknown as z.infer<typeof listQuerySchema>;
  const user = req.user!;

  const where: Record<string, unknown> = {};

  // Data ownership (spec §40): FPO sees only its own farmers.
  if (user.role === 'FPO') where.fpoId = user.fpoId;
  else if (fpoId) where.fpoId = fpoId;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { farmerCode: { contains: search, mode: 'insensitive' } },
      { village: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.farmer.count({ where: where as never }),
    prisma.farmer.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { fpo: { select: { id: true, name: true } } },
    }),
  ]);

  paginated(res, rows, buildPagination(total, page, pageSize));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const farmer = await prisma.farmer.findUnique({
    where: { id: req.params.id },
    include: { fpo: { select: { id: true, name: true } } },
  });
  if (!farmer) throw notFound('Farmer', req.params.id);

  // A farmer may only read their own profile.
  if (req.user!.role === 'FARMER' && req.user!.farmerId !== farmer.id) {
    throw notFound('Farmer', req.params.id);
  }

  ok(res, farmer);
}));

router.post('/', requireAdmin, validate({ body: createSchema }), asyncHandler(async (req, res) => {
  const farmer = await prisma.farmer.create({ data: req.body });
  await recordAudit({
    userId: req.user!.id, action: 'LOT_CREATED', entityType: 'Farmer', entityId: farmer.id,
    metadata: { farmerCode: farmer.farmerCode },
  });
  created(res, farmer);
}));

router.patch('/:id', requireAdmin, validate({ body: updateSchema }), asyncHandler(async (req, res) => {
  const farmer = await prisma.farmer.update({ where: { id: req.params.id }, data: req.body });
  ok(res, farmer);
}));

export default router;
