/**
 * Health endpoints (spec §42).
 *   GET /health                    → liveness
 *   GET /api/health/dependencies   → dependency probe roll-up
 */
import { Router } from 'express';
import { env } from '../../config/env';
import { registerProbe, runProbes, summarize, type ProbeResult } from '../../health/registry';
import { ok } from '../../utils/response';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

function loadVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return (require('../../../package.json') as { version?: string }).version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const VERSION = loadVersion();

/** Ping an HTTP AI service; short-circuits in MOCK mode. */
async function pingAiService(url: string): Promise<ProbeResult> {
  if (env.AI_MODE === 'MOCK') {
    return { status: 'up', detail: 'MOCK analyzer (in-process, no external call)' };
  }
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return {
      status: res.ok ? 'up' : 'down',
      detail: `HTTP ${res.status}`,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      status: 'down',
      detail: err instanceof Error ? err.message : 'unreachable',
      latencyMs: Date.now() - started,
    };
  }
}

// ---------------------------------------------------------------------------
// Probe registrations. Later phases overwrite these as real subsystems land.
// ---------------------------------------------------------------------------

// Database — resolved dynamically so the app still boots before `prisma generate`.
registerProbe('database', async () => {
  const started = Date.now();
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { prisma } = require('../../database/client') as {
      prisma: { $queryRaw: (q: TemplateStringsArray) => Promise<unknown> };
    };
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'up', latencyMs: Date.now() - started };
  } catch (err) {
    return {
      status: 'down',
      detail: err instanceof Error ? err.message : 'Prisma client unavailable',
      latencyMs: Date.now() - started,
    };
  }
});

registerProbe('ai_vision', () => pingAiService(env.AI_VISION_URL));
registerProbe('ai_gas', () => pingAiService(env.AI_GAS_URL));

// Replaced by the IoT module (Phase 8) and Realtime module (Phase 17).
registerProbe('iot', async () => ({ status: 'unknown', detail: 'not initialised yet' }));
registerProbe('websocket', async () => ({ status: 'unknown', detail: 'not initialised yet' }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.get('/health', (_req, res) => {
  ok(res, {
    status: 'healthy',
    service: 'onionsure-backend',
    version: VERSION,
    timestamp: new Date().toISOString(),
  });
});

router.get(
  '/api/health/dependencies',
  asyncHandler(async (_req, res) => {
    const dependencies = await runProbes();
    const overall = summarize(dependencies);
    ok(res, {
      status: overall,
      service: 'onionsure-backend',
      version: VERSION,
      timestamp: new Date().toISOString(),
      dependencies,
    });
  }),
);

export default router;
