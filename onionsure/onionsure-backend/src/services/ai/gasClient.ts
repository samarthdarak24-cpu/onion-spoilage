/**
 * Gas / environmental sensor analyzer adapters (spec §13).
 *
 *   MockGasAnalyzer  — in-process synthetic volatiles + ambient reading.
 *   PythonGasAnalyzer — calls an external Python sensor microservice.
 *
 * Both satisfy the `GasAnalyzer` contract in ./types.
 */
import type { RiskLevel } from '@prisma/client';
import { env } from '../../config/env';
import { aiServiceError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { seededRng } from './rng';
import type { GasAnalyzer, GasAnalysisInput, GasResult } from './types';

const MOCK_MODEL = 'onionsure-gas-mock';
const MOCK_VERSION = '1.0.0-mock';

function rollRisk(r: number): RiskLevel {
  if (r > 0.8) return 'HIGH';
  if (r > 0.55) return 'MEDIUM';
  return 'LOW';
}

export class MockGasAnalyzer implements GasAnalyzer {
  async analyze(input: GasAnalysisInput): Promise<GasResult> {
    const rng = seededRng(`${input.inspectionId}:gas`);
    const quality = Math.round(50 + rng() * 45); // 50..95
    const confidence = Number((0.6 + rng() * 0.35).toFixed(2));
    const risk = rollRisk(rng());
    const earlySpoilageRisk = risk !== 'LOW' && rng() > 0.5;
    const envQuality = Math.round(70 + rng() * 25);
    const temperature = Number((22 + rng() * 8).toFixed(1));
    const humidity = Number((55 + rng() * 30).toFixed(1));

    const readings = (input.readings ?? []).reduce<Record<string, number>>((acc, row) => {
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'number') acc[k] = (acc[k] ?? 0) + v;
      }
      return acc;
    }, {});

    return {
      modelName: MOCK_MODEL,
      modelVersion: MOCK_VERSION,
      quality,
      confidence,
      risk,
      earlySpoilageRisk,
      environment: { quality: envQuality, confidence, temperature, humidity },
      readingsSummary: Object.keys(readings).length ? readings : undefined,
      processingTimeMs: Math.round(150 + rng() * 300),
    };
  }
}

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
    if (!res.ok) throw aiServiceError(`Gas service returned HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw aiServiceError('Gas service timed out');
    }
    throw aiServiceError(err instanceof Error ? err.message : 'Gas service unreachable');
  } finally {
    clearTimeout(timer);
  }
}

export class PythonGasAnalyzer implements GasAnalyzer {
  async analyze(input: GasAnalysisInput): Promise<GasResult> {
    logger.info({ inspectionId: input.inspectionId, url: env.AI_GAS_URL }, 'Calling Python gas service');
    const raw = await postJson<Record<string, unknown>>(
      `${env.AI_GAS_URL.replace(/\/$/, '')}/analyze`,
      { inspectionId: input.inspectionId, readings: input.readings ?? [] },
    );
    const envRaw = (raw.environment ?? {}) as Record<string, unknown>;
    return {
      modelName: String(raw.modelName ?? 'python-gas'),
      modelVersion: String(raw.modelVersion ?? 'unknown'),
      quality: Number(raw.quality ?? 0),
      confidence: Number(raw.confidence ?? 0),
      risk: (raw.risk as RiskLevel) ?? 'LOW',
      earlySpoilageRisk: Boolean(raw.earlySpoilageRisk ?? false),
      environment: {
        quality: Number(envRaw.quality ?? 0),
        confidence: Number(envRaw.confidence ?? 0),
        temperature: typeof envRaw.temperature === 'number' ? envRaw.temperature : undefined,
        humidity: typeof envRaw.humidity === 'number' ? envRaw.humidity : undefined,
      },
      readingsSummary: (raw.readingsSummary as Record<string, number>) ?? undefined,
      processingTimeMs: Number(raw.processingTimeMs ?? 0),
    };
  }
}
