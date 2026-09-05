/**
 * Centralized grading engine (spec §18).
 *
 * This is the SINGLE place that decides a lot's grade and its Grade A / URS /
 * Rejected composition. No scattered `if (score > 85)` checks live anywhere
 * else — every caller goes through `gradeInspection`.
 *
 * Thresholds are configurable (admin-tunable QualityThreshold rows, falling
 * back to env defaults) so behaviour can change without a redeploy.
 */
import type { Grade, RiskLevel, DefectType } from '@prisma/client';
import { env } from '../../config/env';
import { normalizePercentages } from '../../utils/percentages';

export interface GradingThresholds {
  gradeA: number;
  urs: number;
}

export interface DefectCount {
  type: DefectType;
  count: number;
}

export interface GradingInput {
  finalScore: number;
  earlySpoilage: boolean;
  riskLevel: RiskLevel;
  defectCounts?: DefectCount[];
  thresholds?: Partial<GradingThresholds>;
}

export interface GradingOutput {
  grade: Grade;
  gradeAPercentage: number;
  ursPercentage: number;
  rejectedPercentage: number;
  riskLevel: RiskLevel;
  thresholds: GradingThresholds;
}

/** Pure grade-from-score mapping (used by unit tests too). */
export function gradeFromScore(score: number, t: GradingThresholds): Grade {
  if (score >= t.gradeA) return 'GRADE_A';
  if (score >= t.urs) return 'URS';
  return 'REJECTED';
}

export function gradeInspection(input: GradingInput): GradingOutput {
  const thresholds: GradingThresholds = {
    gradeA: input.thresholds?.gradeA ?? env.GRADE_A_THRESHOLD,
    urs: input.thresholds?.urs ?? env.URS_THRESHOLD,
  };

  const grade = gradeFromScore(input.finalScore, thresholds);

  // --- Composition from defect counts (when available) -----------------------
  const counts = input.defectCounts ?? [];
  let gradeA = 0;
  let urs = 0;
  let rejected = 0;

  if (counts.length > 0) {
    for (const d of counts) {
      switch (d.type) {
        case 'HEALTHY':
          gradeA += d.count;
          break;
        case 'DAMAGED':
        case 'SPROUTED':
        case 'UNDERSIZED':
        case 'OTHER':
          urs += d.count;
          break;
        case 'ROTTEN':
          rejected += d.count;
          break;
        default:
          urs += d.count;
      }
    }
  }

  // No per-defect breakdown → synthesize a coherent split from score + grade.
  const totalDefects = gradeA + urs + rejected;
  if (totalDefects === 0) {
    if (grade === 'GRADE_A') {
      gradeA = input.finalScore;
      rejected = Math.max(0, 100 - input.finalScore) * 0.4;
      urs = Math.max(0, 100 - gradeA - rejected);
    } else if (grade === 'URS') {
      urs = 100;
    } else {
      rejected = 100;
    }
  }

  const [gA, uP, rP] = normalizePercentages([gradeA, urs, rejected]);

  // Early spoilage forces at minimum a HIGH risk even if the score looked fine.
  let riskLevel = input.riskLevel;
  if (input.earlySpoilage && riskLevel === 'LOW') riskLevel = 'HIGH';

  return {
    grade,
    gradeAPercentage: gA,
    ursPercentage: uP,
    rejectedPercentage: rP,
    riskLevel,
    thresholds,
  };
}
