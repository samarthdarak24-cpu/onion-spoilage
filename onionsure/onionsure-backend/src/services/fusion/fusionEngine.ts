/**
 * Multimodal fusion engine (spec §16 / §17).
 *
 *   final = Σ(weightₖ × confidenceₖ × qualityₖ) / Σ(weightₖ × confidenceₖ)
 *
 * Weights are supplied by FusionConfig — never hardcoded here (spec §16).
 *
 * EARLY SPOILAGE RULE (the platform's core differentiator, §17):
 *   If vision looks healthy but gas/environment risk is MEDIUM or HIGH, we do
 *   NOT trust the camera. We set earlySpoilage = true and escalate the risk
 *   level, with a human-readable explanation.
 */
import type { RiskLevel } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface FusionWeights {
  vision: number;
  gas: number;
  environment: number;
}

export interface FusionComponent {
  quality: number;
  confidence: number;
  weight: number;
}

export interface FusionInput {
  vision: { quality: number; confidence: number; stage?: string };
  gas: { quality: number; confidence: number; risk?: string; earlySpoilageRisk?: boolean };
  environment: { quality: number; confidence: number };
  weights: FusionWeights;
  /** Early-spoilage rule configuration. */
  earlySpoilage?: {
    enabled: boolean;
    /** Vision score at or above this is considered "healthy". */
    visionHealthyAbove: number;
  };
}

export interface FusionOutput {
  finalScore: number;
  confidence: number;
  riskLevel: RiskLevel;
  earlySpoilage: boolean;
  warning?: string;
  explanation: string;
  components: {
    vision: FusionComponent;
    gas: FusionComponent;
    environment: FusionComponent;
  };
}

const clamp = (v: number, lo = 0, hi = 100): number => Math.min(hi, Math.max(lo, v));

/** Map a gas risk stage onto a platform risk level. */
function riskFromStage(stage?: string): RiskLevel {
  switch ((stage || '').toUpperCase()) {
    case 'HIGH': return 'HIGH';
    case 'MEDIUM': return 'MEDIUM';
    case 'LOW': return 'LOW';
    default: return 'LOW';
  }
}

export function fuse(input: FusionInput): FusionOutput {
  const { vision, gas, environment, weights } = input;
  const es = input.earlySpoilage ?? { enabled: true, visionHealthyAbove: 78 };

  const vC = clamp(vision.confidence, 0, 1);
  const gC = clamp(gas.confidence, 0, 1);
  const eC = clamp(environment.confidence, 0, 1);

  const numerator =
    weights.vision * vC * vision.quality +
    weights.gas * gC * gas.quality +
    weights.environment * eC * environment.quality;

  const denominator =
    weights.vision * vC + weights.gas * gC + weights.environment * eC;

  // Guard against a zero denominator (all confidences zero).
  const finalScore = denominator > 0
    ? Math.round(clamp(numerator / denominator))
    : Math.round(clamp((vision.quality + gas.quality + environment.quality) / 3));

  const weightSum = weights.vision + weights.gas + weights.environment || 1;
  const confidence = Number(
    ((weights.vision * vC + weights.gas * gC + weights.environment * eC) / weightSum).toFixed(2),
  );

  // --- Early spoilage detection (spec §17) --------------------------------
  const gasRisk = riskFromStage(gas.risk);
  const visionHealthy = vision.quality >= es.visionHealthyAbove;
  const gasRisky = gasRisk === 'MEDIUM' || gasRisk === 'HIGH';
  const earlySpoilage =
    es.enabled && (visionHealthy && gasRisky || gas.earlySpoilageRisk === true);

  let riskLevel: RiskLevel;
  if (earlySpoilage) riskLevel = 'HIGH';
  else if (gasRisk === 'HIGH') riskLevel = 'HIGH';
  else if (gasRisk === 'MEDIUM') riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  // Grade A produce carrying an early-spoilage flag is at minimum HIGH risk.
  if (earlySpoilage && riskLevel === 'LOW') riskLevel = 'HIGH';

  let explanation =
    `Vision ${vision.quality}/100, gas (${(gas.risk ?? 'LOW').toUpperCase()}) ${gas.quality}/100, ` +
    `environment ${environment.quality}/100 fused to ${finalScore}/100 ` +
    `(weights v=${weights.vision}, g=${weights.gas}, e=${weights.environment}).`;

  let warning: string | undefined;
  if (earlySpoilage) {
    warning =
      'Visual inspection indicates acceptable surface quality, but sensor readings indicate ' +
      'elevated spoilage risk. Multimodal fusion overrides the camera-only result to flag hidden risk.';
    explanation = warning;
    logger.warn(
      { visionScore: vision.quality, gasRisk, finalScore },
      'Early spoilage detected — overriding vision-only assessment',
    );
  }

  return {
    finalScore,
    confidence,
    riskLevel,
    earlySpoilage,
    ...(warning && { warning }),
    explanation,
    components: {
      vision: { quality: vision.quality, confidence: vC, weight: weights.vision },
      gas: { quality: gas.quality, confidence: gC, weight: weights.gas },
      environment: { quality: environment.quality, confidence: eC, weight: weights.environment },
    },
  };
}
