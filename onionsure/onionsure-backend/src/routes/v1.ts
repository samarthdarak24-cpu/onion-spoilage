/**
 * /api/v1 route aggregator (spec §54).
 *
 * Every feature module registers its router here. Keeping the mount table in
 * one place makes the public surface easy to audit.
 */
import { Router } from 'express';
import { ok } from '../utils/response';

import authRouter from '../modules/auth/auth.routes';
import lotsRouter from '../modules/lots/lots.routes';
import inspectionsRouter from '../modules/inspections/inspection.routes';
import iotRouter from '../modules/iot/iot.routes';
import certificatesRouter from '../modules/certificates/certificates.routes';
import verificationRouter from '../modules/verification/verification.routes';
import analyticsRouter from '../modules/analytics/analytics.routes';
import reportsRouter from '../modules/reports/reports.routes';
import configRouter from '../modules/config/config.routes';
import demoRouter from '../modules/demo/demo.routes';
import farmersRouter from '../modules/farmers/farmers.routes';
import fposRouter from '../modules/fpos/fpos.routes';
import centresRouter from '../modules/centres/centres.routes';
import buyersRouter from '../modules/buyers/buyers.routes';

const router = Router();

// --- Module routers ---------------------------------------------------------
router.use('/auth', authRouter);
router.use('/lots', lotsRouter);
router.use('/inspections', inspectionsRouter);
router.use('/iot', iotRouter);
router.use('/certificates', certificatesRouter);
router.use('/public', verificationRouter); // → /public/verify/:token (no auth)
router.use('/analytics', analyticsRouter);
router.use('/reports', reportsRouter);
router.use('/config', configRouter);
router.use('/demo', demoRouter);
router.use('/farmers', farmersRouter);
router.use('/fpos', fposRouter);
router.use('/centres', centresRouter);
router.use('/buyers', buyersRouter);

// --- API root ---------------------------------------------------------------
router.get('/', (_req, res) => {
  ok(res, {
    service: 'onionsure-backend',
    apiVersion: 'v1',
    endpoints: {
      health: '/health',
      dependencies: '/api/health/dependencies',
      docs: '/api/docs',
      auth: '/api/v1/auth',
      lots: '/api/v1/lots',
      inspections: '/api/v1/inspections',
      analytics: '/api/v1/analytics/dashboard',
      verify: '/api/v1/public/verify/:token',
    },
  });
});

export default router;
