/**
 * API root (spec §54 / §55).
 *
 * Internally everything is structured around `/api/v1`. A legacy `/api/*`
 * alias is kept mounted so the existing OnionSure frontend keeps working during
 * migration without duplicating any controller logic.
 */
import { Router } from 'express';
import v1Router from './v1';

const router = Router();

// Canonical versioned tree.
router.use('/v1', v1Router);

// Backward-compatible alias for the current frontend (`/api/...`).
router.use('/', v1Router);

export default router;
