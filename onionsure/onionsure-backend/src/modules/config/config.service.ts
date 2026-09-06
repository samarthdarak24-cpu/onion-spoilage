/**
 * Admin configuration service (spec §32).
 *
 * Fusion weights and grading thresholds are versioned. Updating creates a NEW
 * active version and deactivates the old one, so historical inspections keep
 * the exact config that produced their result (immutability / reproducibility).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/client';
import { env } from '../../config/env';
import { conflict } from '../../utils/errors';

export interface FusionConfigView {
  id: string;
  visionWeight: number;
  gasWeight: number;
  environmentWeight: number;
  earlySpoilageEnabled: boolean;
  version: number;
  isActive: boolean;
  updatedAt: Date;
}

export interface GradingThresholdView {
  gradeA: number;
  urs: number;
}

const sumWeights = (v: number, g: number, e: number): number => v + g + e;

/** Active fusion configuration, or env defaults when none is seeded yet. */
export async function getActiveFusionConfig(): Promise<{
  vision: number;
  gas: number;
  environment: number;
  earlySpoilageEnabled: boolean;
  version: number;
}> {
  const cfg = await prisma.fusionConfig.findFirst({
    where: { isActive: true },
    orderBy: { version: 'desc' },
  });
  if (cfg) {
    return {
      vision: cfg.visionWeight,
      gas: cfg.gasWeight,
      environment: cfg.environmentWeight,
      earlySpoilageEnabled: cfg.earlySpoilageEnabled,
      version: cfg.version,
    };
  }
  return {
    vision: env.FUSION_WEIGHT_VISION,
    gas: env.FUSION_WEIGHT_GAS,
    environment: env.FUSION_WEIGHT_ENVIRONMENT,
    earlySpoilageEnabled: true,
    version: 0,
  };
}

export async function listFusionConfigs(): Promise<FusionConfigView[]> {
  const rows = await prisma.fusionConfig.findMany({ orderBy: { version: 'desc' } });
  return rows.map((r) => ({
    id: r.id,
    visionWeight: r.visionWeight,
    gasWeight: r.gasWeight,
    environmentWeight: r.environmentWeight,
    earlySpoilageEnabled: r.earlySpoilageEnabled,
    version: r.version,
    isActive: r.isActive,
    updatedAt: r.updatedAt,
  }));
}

export interface UpdateFusionInput {
  visionWeight: number;
  gasWeight: number;
  environmentWeight: number;
  earlySpoilageEnabled?: boolean;
}

export async function updateFusionConfig(input: UpdateFusionInput, actorId?: string): Promise<FusionConfigView> {
  if (sumWeights(input.visionWeight, input.gasWeight, input.environmentWeight) <= 0) {
    throw conflict('Fusion weights must sum to a positive value');
  }

  const current = await getActiveFusionConfig();
  const version = (current.version || 0) + 1;

  await prisma.fusionConfig.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const created = await prisma.fusionConfig.create({
    data: {
      visionWeight: input.visionWeight,
      gasWeight: input.gasWeight,
      environmentWeight: input.environmentWeight,
      earlySpoilageEnabled: input.earlySpoilageEnabled ?? true,
      version,
      isActive: true,
      updatedBy: actorId ?? null,
    },
  });

  return {
    id: created.id,
    visionWeight: created.visionWeight,
    gasWeight: created.gasWeight,
    environmentWeight: created.environmentWeight,
    earlySpoilageEnabled: created.earlySpoilageEnabled,
    version: created.version,
    isActive: created.isActive,
    updatedAt: created.updatedAt,
  };
}

/** Active grading thresholds (min quality score per grade). */
export async function getGradingThresholds(): Promise<GradingThresholdView> {
  const [gradeA, urs] = await Promise.all([
    prisma.qualityThreshold.findFirst({ where: { grade: 'GRADE_A', isActive: true } }),
    prisma.qualityThreshold.findFirst({ where: { grade: 'URS', isActive: true } }),
  ]);
  return {
    gradeA: gradeA?.minScore ?? env.GRADE_A_THRESHOLD,
    urs: urs?.minScore ?? env.URS_THRESHOLD,
  };
}

export interface UpdateGradingInput {
  gradeA: number;
  urs: number;
}

export async function updateGradingThresholds(input: UpdateGradingInput, actorId?: string): Promise<GradingThresholdView> {
  if (input.gradeA <= input.urs) {
    throw conflict('GRADE_A threshold must be strictly greater than the URS threshold');
  }

  const updateOne = (grade: 'GRADE_A' | 'URS', minScore: number) =>
    prisma.qualityThreshold.updateMany({
      where: { grade, isActive: true },
      data: { minScore, updatedAt: new Date() },
    });

  await Promise.all([updateOne('GRADE_A', input.gradeA), updateOne('URS', input.urs)]);

  await prisma.auditLog.create({
    data: {
      userId: actorId ?? null,
      action: 'CONFIG_UPDATED',
      entityType: 'QualityThreshold',
      metadataJson: { gradeA: input.gradeA, urs: input.urs } as Prisma.InputJsonValue,
    },
  });

  return { gradeA: input.gradeA, urs: input.urs };
}
