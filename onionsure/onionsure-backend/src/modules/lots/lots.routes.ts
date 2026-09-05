/**
 * Lots (spec §8).
 *   POST   /api/v1/lots
 *   GET    /api/v1/lots           (filters + pagination)
 *   GET    /api/v1/lots/:id
 *   PATCH  /api/v1/lots/:id
 *   POST   /api/v1/lots/:id/close
 */
import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/client';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { ok, created, paginated, buildPagination } from '../../utils/response';
import { notFound, conflict } from '../../utils/errors';
import { recordAudit } from '../audit/audit.service';
import { formatCode } from '../../utils/ids';

const router = Router();

const createSchema = z.object({
  farmerId: z.string().cuid(),
  fpoId: z.string().cuid().optional(),
  centreId: z.string().cuid().optional(),
  crop: z.string().max(64).default('ONION'),
  quantity: z.coerce.number().positive(),
  unit: z.string().max(16).default('KG'),
  harvestDate: z.coerce.date().optional(),
  status: z.enum([
    'REGISTERED', 'READY_FOR_INSPECTION', 'INSPECTION_IN_PROGRESS',
    'GRADED', 'CERTIFIED', 'REJECTED', 'CLOSED',
  ]).default('REGISTERED'),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum([
    'REGISTERED', 'READY_FOR_INSPECTION', 'INSPECTION_IN_PROGRESS',
    'GRADED', 'CERTIFIED', 'REJECTED', 'CLOSED',
  ]).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  farmerId: z.string().cuid().optional(),
  fpoId: z.string().cuid().optional(),
  centreId: z.string().cuid().optional(),
  status: z.enum([
    'REGISTERED', 'READY_FOR_INSPECTION', 'INSPECTION_IN_PROGRESS',
    'GRADED', 'CERTIFIED', 'REJECTED', 'CLOSED',
  ]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

router.use(requireAuth);

/** Apply role-based row-level ownership (spec §40). */
function scopeFor(user: NonNullable<Express.Request['user']>): Prisma.LotWhereInput {
  if (user.role === 'FARMER') return { farmerId: user.farmerId ?? '__none__' };
  if (user.role === 'FPO') return { fpoId: user.fpoId ?? '__none__' };
  if (user.role === 'PROCUREMENT_OFFICER') return { centreId: user.centreId ?? '__none__' };
  return {};
}

router.get('/', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  const {
    page, pageSize, search, farmerId, fpoId, centreId, status, dateFrom, dateTo, sortBy, sortOrder,
  } = req.query as unknown as z.infer<typeof listQuerySchema>;

  const where: Prisma.LotWhereInput = { AND: [scopeFor(req.user!)] };

  const and = where.AND as Prisma.LotWhereInput[];
  if (farmerId) and.push({ farmerId });
  if (fpoId) and.push({ fpoId });
  if (centreId) and.push({ centreId });
  if (status) and.push({ status });
  if (dateFrom || dateTo) {
    and.push({ createdAt: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } });
  }
  if (search) {
    and.push({
      OR: [
        { lotNumber: { contains: search, mode: 'insensitive' } },
        { farmer: { name: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }

  const orderBy = { [sortBy]: sortOrder } as Prisma.LotOrderByWithRelationInput;

  const [total, rows] = await Promise.all([
    prisma.lot.count({ where }),
    prisma.lot.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        farmer: { select: { id: true, name: true, farmerCode: true } },
        fpo: { select: { id: true, name: true } },
        centre: { select: { id: true, name: true } },
      },
    }),
  ]);

  paginated(res, rows, buildPagination(total, page, pageSize));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const lot = await prisma.lot.findUnique({
    where: { id: req.params.id },
    include: {
      farmer: true,
      fpo: true,
      centre: true,
      inspections: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!lot) throw notFound('Lot', req.params.id);
  ok(res, lot);
}));

router.post('/', validate({ body: createSchema }), asyncHandler(async (req, res) => {
  const sequence = (await prisma.lot.count()) + 1;
  const lot = await prisma.lot.create({
    data: { ...req.body, lotNumber: formatCode('LOT', sequence) },
  });

  await recordAudit({
    userId: req.user!.id, action: 'LOT_CREATED', entityType: 'Lot', entityId: lot.id,
    metadata: { lotNumber: lot.lotNumber },
  });

  created(res, lot);
}));

router.patch('/:id', validate({ body: updateSchema }), asyncHandler(async (req, res) => {
  const lot = await prisma.lot.update({ where: { id: req.params.id }, data: req.body });
  await recordAudit({
    userId: req.user!.id, action: 'LOT_UPDATED', entityType: 'Lot', entityId: lot.id,
  });
  ok(res, lot);
}));

router.post('/:id/close', asyncHandler(async (req, res) => {
  const lot = await prisma.lot.findUnique({ where: { id: req.params.id } });
  if (!lot) throw notFound('Lot', req.params.id);
  if (lot.status === 'CLOSED') throw conflict('Lot is already closed');

  const updated = await prisma.lot.update({
    where: { id: req.params.id },
    data: { status: 'CLOSED' },
  });

  await recordAudit({
    userId: req.user!.id, action: 'LOT_UPDATED', entityType: 'Lot', entityId: updated.id,
    metadata: { closed: true },
  });

  ok(res, updated);
}));

export { router as lotsRouter };
export default router;
