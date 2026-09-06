/**
 * Demo scenario runner (spec §34).
 *
 * Runs a complete inspection end-to-end with deterministic, precomputed AI
 * results so the platform can be showcased without a live model. Each scenario
 * exercises a distinct outcome: a clean Grade A, a salvageable URS lot, a
 * rejected lot, and the signature early-spoilage detection.
 */
import type { GasResult, VisionResult } from '../../services/ai/types';
import { prisma } from '../../database/client';
import { conflict, notFound } from '../../utils/errors';
import { normaliseDeviceCode } from '../../utils/ids';
import { realtimeHub } from '../../services/realtime/hub';
import {
  createInspection,
  assignSample,
  bindDevice,
  completeStabilization,
  ingestAnalyses,
  runFusion,
  issueCertificate,
  complete,
} from '../inspections/inspection.service';

type User = NonNullable<Express.Request['user']>;

export const SCENARIOS = ['NORMAL_GRADE_A', 'URS', 'REJECTED', 'EARLY_SPOILAGE'] as const;
export type Scenario = (typeof SCENARIOS)[number];

function vision(quality: number, confidence: number, healthy: number, damaged: number, rotten: number): VisionResult {
  return {
    modelName: 'demo-vision',
    modelVersion: 'demo',
    quality,
    confidence,
    processingTimeMs: 300,
    defects: [
      { type: 'HEALTHY', count: healthy, severity: 'LOW', confidence },
      { type: 'DAMAGED', count: damaged, severity: damaged > 15 ? 'HIGH' : 'MEDIUM', confidence },
      { type: 'ROTTEN', count: rotten, severity: 'HIGH', confidence },
    ],
  };
}

function gas(quality: number, confidence: number, risk: 'LOW' | 'MEDIUM' | 'HIGH', earlySpoilageRisk: boolean, envQuality: number): GasResult {
  return {
    modelName: 'demo-gas',
    modelVersion: 'demo',
    quality,
    confidence,
    risk,
    earlySpoilageRisk,
    environment: { quality: envQuality, confidence, temperature: 24.5, humidity: 70 },
    processingTimeMs: 200,
  };
}

export function scenarioAnalyses(scenario: Scenario): { vision: VisionResult; gas: GasResult } {
  switch (scenario) {
    case 'NORMAL_GRADE_A':
      return {
        vision: vision(92, 0.96, 96, 3, 1),
        gas: gas(91, 0.93, 'LOW', false, 90),
      };
    case 'URS':
      return {
        vision: vision(72, 0.9, 70, 22, 8),
        gas: gas(70, 0.88, 'LOW', false, 80),
      };
    case 'REJECTED':
      return {
        vision: vision(44, 0.85, 20, 30, 50),
        gas: gas(40, 0.8, 'MEDIUM', false, 60),
      };
    case 'EARLY_SPOILAGE':
      return {
        vision: vision(88, 0.95, 94, 4, 2),
        gas: gas(50, 0.9, 'HIGH', true, 75),
      };
    default:
      throw conflict(`Unknown scenario ${scenario}`);
  }
}

async function resolveLot(lotId?: string) {
  if (lotId) {
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) throw notFound('Lot', lotId);
    return lot;
  }
  const existing = await prisma.lot.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!existing) throw conflict('No lot available — seed data first or provide a lotId');
  return existing;
}

async function ensureDevice() {
  const code = normaliseDeviceCode('DEMO-POD-01');
  const existing = await prisma.ioTDevice.findUnique({ where: { deviceCode: code } });
  if (existing) {
    // Reset any prior binding so the demo is re-runnable.
    return prisma.ioTDevice.update({
      where: { deviceCode: code },
      data: { boundInspectionId: null, status: 'OFFLINE' },
    });
  }
  return prisma.ioTDevice.create({
    data: { deviceCode: code, name: 'Demo Gas Pod', type: 'GAS_POD', status: 'OFFLINE' },
  });
}

export interface DemoRunResult {
  scenario: Scenario;
  inspectionNumber: string;
  grade: string | null;
  riskLevel: string | null;
  earlySpoilage: boolean;
  qualityScore: number | null;
  certificateNumber: string;
  verificationToken: string;
}

export async function runScenario(user: User, scenario: Scenario, lotId?: string): Promise<DemoRunResult> {
  if (!SCENARIOS.includes(scenario)) throw conflict(`Unknown scenario ${scenario}`);

  const lot = await resolveLot(lotId);
  const insp = await createInspection(user, lot.id);
  await assignSample(user, insp.id, 100);

  const device = await ensureDevice();
  await bindDevice(user, insp.id, device.deviceCode);
  // Demo scenarios represent an already-stabilized sample, so skip the dwell.
  await completeStabilization(user, insp.id, { force: true });

  const { vision: v, gas: g } = scenarioAnalyses(scenario);
  await ingestAnalyses(user, insp.id, v, g);

  const { graded } = await runFusion(user, insp.id);
  const { certificate } = await issueCertificate(user, insp.id);
  const completed = await complete(user, insp.id);

  realtimeHub.publishGlobal('demo_run', { scenario, inspectionNumber: insp.inspectionNumber });

  return {
    scenario,
    inspectionNumber: insp.inspectionNumber,
    grade: graded.grade,
    riskLevel: graded.riskLevel,
    earlySpoilage: completed.earlySpoilage,
    qualityScore: completed.qualityScore,
    certificateNumber: certificate.certificateNumber,
    verificationToken: certificate.verificationToken,
  };
}
