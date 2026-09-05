/**
 * Farmer Producer Organisations (spec §4 / §7).
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/client';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { ok, created, paginated, buildPagination } from '../../utils/response';
import { notFound } from '../../utils/errors';

const router = Router();

const createSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(160),
  registrationNumber: z.string().max(64).optional(),
  district: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  contactPerson: z.string().max(120).optional(),
  phone: z.string().max(32).optional(),
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
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { code: { contains: search, mode: 'insensitive' as const } }] }
    : {};

  const [total, rows] = await Promise.all([
    prisma.fpo.count({ where }),
    prisma.fpo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { farmers: true } } },
    }),
  ]);

  paginated(res, rows, buildPagination(total, page, pageSize));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const fpo = await prisma.fpo.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { farmers: true } } },
  });
  if (!fpo) throw notFound('FPO', req.params.id);
  ok(res, fpo);
}));

router.post('/', requireAdmin, validate({ body: createSchema }), asyncHandler(async (req, res) => {
  created(res, await prisma.fpo.create({ data: req.body }));
}));

router.patch('/:id', requireAdmin, validate({ body: updateSchema }), asyncHandler(async (req, res) => {
  ok(res, await prisma.fpo.update({ where: { id: req.params.id }, data: req.body }));
}));

export default router;
