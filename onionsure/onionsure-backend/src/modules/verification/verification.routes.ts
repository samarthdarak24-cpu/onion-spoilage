/**
 * Public certificate verification (spec §24).
 *
 * No authentication. Anyone with a verification token can confirm a
 * certificate's authenticity and integrity. The hash recomputation proves the
 * snapshot has not been tampered with.
 */
import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok } from '../../utils/response';
import { verifyCertificate } from '../../services/certificate/certificate.service';

const router = Router();

router.get('/:token', asyncHandler(async (req, res) => {
  const result = await verifyCertificate(req.params.token);
  ok(res, result);
}));

export { router as verificationRouter };
export default router;
