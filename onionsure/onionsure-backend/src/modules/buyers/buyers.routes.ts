/**
 * Buyers (spec §4 / §7).
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
  companyName: z.string().min(1).max(160),
  buyerCode: z.string().min(1).max(32),
  location: z.string().max(160).optional(),
  phone: z.string().max(32).optional(),
  userId: z.string().cuid().optional(),
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
    ? { OR: [{ companyName: { contains: search, mode: 'insensitive' as const } }, { buyerCode: { contains: search, mode: 'insensitive' as const } }] }
    : {};

  const [total, rows] = await Promise.all([
    prisma.buyer.count({ where }),
    prisma.buyer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  paginated(res, rows, buildPagination(total, page, pageSize));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const buyer = await prisma.buyer.findUnique({ where: { id: req.params.id } });
  if (!buyer) throw notFound('Buyer', req.params.id);
  ok(res, buyer);
}));

router.post('/', requireAdmin, validate({ body: createSchema }), asyncHandler(async (req, res) => {
  created(res, await prisma.buyer.create({ data: req.body }));
}));

router.patch('/:id', requireAdmin, validate({ body: updateSchema }), asyncHandler(async (req, res) => {
  ok(res, await prisma.buyer.update({ where: { id: req.params.id }, data: req.body }));
}));

export default router;
