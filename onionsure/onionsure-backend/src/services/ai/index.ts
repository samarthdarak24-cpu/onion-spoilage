/**
 * AI analyzer factory (spec §12 / §13).
 *
 * Returns a process-wide singleton analyzer chosen by `AI_MODE`. The Mock
 * provider runs entirely in-process (no network) so the platform is fully
 * functional with zero external dependencies; switching to `PYTHON` routes
 * calls out to the configured microservices.
 */
import { env } from '../../config/env';
import { MockVisionAnalyzer, PythonVisionAnalyzer } from './visionClient';
import { MockGasAnalyzer, PythonGasAnalyzer } from './gasClient';
import type { GasAnalyzer, VisionAnalyzer } from './types';

let visionSingleton: VisionAnalyzer | undefined;
let gasSingleton: GasAnalyzer | undefined;

export function getVisionAnalyzer(): VisionAnalyzer {
  if (!visionSingleton) {
    visionSingleton =
      env.AI_MODE === 'PYTHON' ? new PythonVisionAnalyzer() : new MockVisionAnalyzer();
  }
  return visionSingleton;
}

export function getGasAnalyzer(): GasAnalyzer {
  if (!gasSingleton) {
    gasSingleton = env.AI_MODE === 'PYTHON' ? new PythonGasAnalyzer() : new MockGasAnalyzer();
  }
  return gasSingleton;
}

export * from './types';
