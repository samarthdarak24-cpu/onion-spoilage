/**
 * Certificate routes (spec §21–§24).
 *   GET  /api/v1/certificates            — list (auth)
 *   GET  /api/v1/certificates/:id        — detail (auth)
 *   POST /api/v1/certificates/:id/revoke — revoke (ADMIN)
 * Public, unauthenticated verification lives in the verification module.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/client';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { ok, paginated, buildPagination } from '../../utils/response';
import { notFound } from '../../utils/errors';
import { revokeCertificate } from '../../services/certificate/certificate.service';
import { recordAudit } from '../audit/audit.service';

const router = Router();

router.use(requireAuth);

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  status: z.enum(['VALID', 'REVOKED', 'EXPIRED']).optional(),
});

router.get('/', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  const { page, pageSize, status } = req.query as unknown as z.infer<typeof listQuerySchema>;
  const where = status ? { status } : {};
  const [total, rows] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where, orderBy: { issuedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      include: { inspection: { select: { inspectionNumber: true, grade: true } } },
    }),
  ]);
  paginated(res, rows, buildPagination(total, page, pageSize));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const cert = await prisma.certificate.findUnique({
    where: { id: req.params.id },
    include: { inspection: { include: { lot: true } } },
  });
  if (!cert) throw notFound('Certificate', req.params.id);
  ok(res, cert);
}));

router.post('/:id/revoke', requireAdmin, asyncHandler(async (req, res) => {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
  const updated = await revokeCertificate(req.params.id, req.user!.id, reason);
  await recordAudit({
    userId: req.user!.id, action: 'CERTIFICATE_REVOKED', entityType: 'Certificate',
    entityId: req.params.id, metadata: { reason: reason ?? null },
  });
  ok(res, updated);
}));

export { router as certificatesRouter };
export default router;
