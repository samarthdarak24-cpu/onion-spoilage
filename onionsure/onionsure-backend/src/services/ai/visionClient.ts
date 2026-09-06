/**
 * Vision analyzer adapters (spec §12).
 *
 *   MockVisionAnalyzer  — in-process synthetic results, deterministic per id.
 *   PythonVisionAnalyzer — calls an external Python CV microservice.
 *
 * Both satisfy the `VisionAnalyzer` contract in ./types.
 */
import type { DefectType, Severity } from '@prisma/client';
import { env } from '../../config/env';
import { aiServiceError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { seededRng } from './rng';
import type { VisionAnalyzer, VisionAnalysisInput, VisionResult, DefectFinding } from './types';

const MOCK_MODEL = 'onionsure-vision-mock';
const MOCK_VERSION = '1.0.0-mock';

function buildDefects(quality: number, confidence: number): DefectFinding[] {
  const sample = 100;
  const healthy = Math.round((sample * quality) / 100);
  const rotten = Math.round((sample - healthy) * 0.4);
  const damaged = sample - healthy - rotten;
  const out: DefectFinding[] = [];
  const push = (type: DefectType, count: number, sev: Severity) => {
    if (count > 0) out.push({ type, count, severity: sev, confidence });
  };
  push('HEALTHY', healthy, 'LOW');
  push('DAMAGED', damaged, damaged > sample * 0.2 ? 'HIGH' : 'MEDIUM');
  push('ROTTEN', rotten, 'HIGH');
  return out;
}

export class MockVisionAnalyzer implements VisionAnalyzer {
  async analyze(input: VisionAnalysisInput): Promise<VisionResult> {
    const rng = seededRng(`${input.inspectionId}:vision`);
    const quality = Math.round(55 + rng() * 40); // 55..95
    const confidence = Number((0.7 + rng() * 0.29).toFixed(2));
    return {
      modelName: MOCK_MODEL,
      modelVersion: MOCK_VERSION,
      quality,
      confidence,
      defects: buildDefects(quality, confidence),
      processingTimeMs: Math.round(200 + rng() * 400),
    };
  }
}

/** POST a JSON body to a URL with a short timeout; throw on failure. */
async function postJson<T>(url: string, body: unknown, timeoutMs = 5000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw aiServiceError(`Vision service returned HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw aiServiceError('Vision service timed out');
    }
    throw aiServiceError(err instanceof Error ? err.message : 'Vision service unreachable');
  } finally {
    clearTimeout(timer);
  }
}

export class PythonVisionAnalyzer implements VisionAnalyzer {
  async analyze(input: VisionAnalysisInput): Promise<VisionResult> {
    logger.info({ inspectionId: input.inspectionId, url: env.AI_VISION_URL }, 'Calling Python vision service');
    const raw = await postJson<Record<string, unknown>>(
      `${env.AI_VISION_URL.replace(/\/$/, '')}/analyze`,
      { inspectionId: input.inspectionId, imageCount: input.imageCount, imageKeys: input.imageKeys ?? [] },
    );
    return {
      modelName: String(raw.modelName ?? 'python-vision'),
      modelVersion: String(raw.modelVersion ?? 'unknown'),
      quality: Number(raw.quality ?? 0),
      confidence: Number(raw.confidence ?? 0),
      defects: Array.isArray(raw.defects)
        ? (raw.defects as DefectFinding[])
        : buildDefects(Number(raw.quality ?? 50), Number(raw.confidence ?? 0.5)),
      processingTimeMs: Number(raw.processingTimeMs ?? 0),
    };
  }
}
