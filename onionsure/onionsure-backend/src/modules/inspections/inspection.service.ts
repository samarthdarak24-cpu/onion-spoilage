/**
 * Inspection lifecycle service (spec §9 / §10 / §16 / §17 / §18).
 *
 * Owns the entire pipeline: create → sample → device/stabilize → capture →
 * AI → fusion → grade → certificate → complete. Every transition is validated
 * by the state machine, audited, and broadcast over the realtime hub. The
 * fusion and grading engines are invoked here but live in their own modules so
 * the domain logic stays centralized and testable.
 */
import type { Prisma } from '@prisma/client';
import type { AiMode, DefectType, InspectionStatus } from '@prisma/client';
import { prisma } from '../../database/client';
import { env } from '../../config/env';
import {
  notFound,
  conflict,
  forbidden,
  invalidTransition,
  aiServiceError,
} from '../../utils/errors';
import { formatCode, sampleCode } from '../../utils/ids';
import { recordAudit, type AuditAction } from '../audit/audit.service';
import { realtimeHub } from '../../services/realtime/hub';
import { getActiveFusionConfig, getGradingThresholds } from '../config/config.service';
import { gradeInspection } from '../../services/grading/gradingEngine';
import { fuse as fuseEngine } from '../../services/fusion/fusionEngine';
import { getVisionAnalyzer, getGasAnalyzer } from '../../services/ai';
import { withStageLog } from '../../utils/logger';
import { getStorage } from '../../services/storage';
import { issueForInspection } from '../../services/certificate/certificate.service';
import { getDeviceByCode } from '../iot/iot.service';
import { canTransition, TERMINAL_STATES } from './stateMachine';

type User = NonNullable<Express.Request['user']>;

const STATUS_ACTION: Partial<Record<InspectionStatus, AuditAction>> = {
  SAMPLE_ASSIGNED: 'SAMPLE_ASSIGNED',
  SENSOR_STABILIZING: 'DEVICE_BOUND',
  CAPTURED: 'AI_ANALYSIS_STARTED',
  AI_PROCESSING: 'AI_ANALYSIS_STARTED',
  FUSION_PROCESSING: 'AI_ANALYSIS_COMPLETED',
  GRADED: 'GRADE_ASSIGNED',
  CERTIFICATE_GENERATED: 'CERTIFICATE_CREATED',
  COMPLETED: 'INSPECTION_COMPLETED',
  CANCELLED: 'INSPECTION_CANCELLED',
  FAILED: 'FUSION_COMPLETED',
};

// ---------------------------------------------------------------------------
// Ownership & scoping (spec §40)
// ---------------------------------------------------------------------------

export async function getOwned(user: User, id: string, mode: 'read' | 'write' = 'read') {
  const insp = await prisma.inspection.findUnique({ where: { id }, include: { lot: true } });
  if (!insp) throw notFound('Inspection', id);
  if (user.role === 'ADMIN') return insp;

  if (mode === 'write' && (user.role === 'FARMER' || user.role === 'BUYER')) {
    throw forbidden('Inspections are managed by procurement officers');
  }
  if (user.role === 'PROCUREMENT_OFFICER') {
    if (insp.centreId === user.centreId || insp.officerId === user.id) return insp;
    throw forbidden('Not your centre’s inspection');
  }
  if (user.role === 'FPO') {
    if (insp.fpoId === user.fpoId) return insp;
    throw forbidden('Not your FPO’s inspection');
  }
  if (user.role === 'FARMER') {
    if (insp.lot.farmerId === user.farmerId) return insp;
    throw forbidden('Not your lot’s inspection');
  }
  if (user.role === 'BUYER') {
    if (insp.status === 'COMPLETED' || insp.status === 'CERTIFICATE_GENERATED') return insp;
    throw forbidden('Inspection is not yet public');
  }
  throw forbidden('Insufficient permissions for this inspection');
}

export function scopeFor(user: User): Prisma.InspectionWhereInput {
  switch (user.role) {
    case 'ADMIN':
      return {};
    case 'PROCUREMENT_OFFICER':
      return { OR: [{ centreId: user.centreId ?? '__none__' }, { officerId: user.id }] };
    case 'FPO':
      return { fpoId: user.fpoId ?? '__none__' };
    case 'FARMER':
      return { lot: { farmerId: user.farmerId ?? '__none__' } };
    case 'BUYER':
      return { status: { in: ['COMPLETED', 'CERTIFICATE_GENERATED'] } };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Transition helper
// ---------------------------------------------------------------------------

async function applyTransition(id: string, to: InspectionStatus, actorId?: string, meta?: Record<string, unknown>) {
  const current = await prisma.inspection.findUnique({ where: { id } });
  if (!current) throw notFound('Inspection', id);
  if (!canTransition(current.status, to)) throw invalidTransition(current.status, to);

  const updated = await prisma.inspection.update({
    where: { id },
    data: {
      status: to,
      ...(to === 'COMPLETED' && { completedAt: new Date() }),
      ...(to === 'SAMPLE_ASSIGNED' && { startedAt: new Date() }),
    },
  });

  await recordAudit({
    userId: actorId,
    action: STATUS_ACTION[to] ?? 'INSPECTION_CREATED',
    entityType: 'Inspection',
    entityId: id,
    metadata: { from: current.status, to, ...meta },
  });

  realtimeHub.publishInspection(id, 'status', { from: current.status, to });
  return updated;
}

// ---------------------------------------------------------------------------
// Lifecycle operations
// ---------------------------------------------------------------------------

export async function listInspections(
  user: User,
  query: { page: number; pageSize: number; status?: string; lotId?: string; sortBy?: string; sortOrder?: string },
) {
  const where: Prisma.InspectionWhereInput = { AND: [scopeFor(user)] };
  const and = where.AND as Prisma.InspectionWhereInput[];
  if (query.status) and.push({ status: query.status as InspectionStatus });
  if (query.lotId) and.push({ lotId: query.lotId });

  const orderBy = { [query.sortBy || 'createdAt']: (query.sortOrder || 'desc') as 'desc' | 'asc' };

  const [total, rows] = await Promise.all([
    prisma.inspection.count({ where }),
    prisma.inspection.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        lot: { select: { id: true, lotNumber: true, crop: true } },
        sample: true,
        fusionResult: true,
      },
    }),
  ]);
  return { rows, total };
}

export async function getInspection(user: User, id: string) {
  await getOwned(user, id, 'read');
  return prisma.inspection.findUnique({
    where: { id },
    include: {
      lot: { include: { farmer: true, fpo: true, centre: true } },
      sample: true,
      images: true,
      device: true,
      analyses: { include: { defects: true } },
      fusionResult: true,
      certificates: true,
    },
  });
}

export async function createInspection(user: User, lotId: string, centreId?: string) {
  if (user.role !== 'ADMIN' && user.role !== 'PROCUREMENT_OFFICER') {
    throw forbidden('Only procurement officers can create inspections');
  }
  const lot = await prisma.lot.findUnique({ where: { id: lotId }, include: { farmer: true } });
  if (!lot) throw notFound('Lot', lotId);
  if (
    user.role === 'PROCUREMENT_OFFICER' &&
    lot.centreId &&
    user.centreId &&
    lot.centreId !== user.centreId
  ) {
    throw forbidden('Lot does not belong to your procurement centre');
  }

  const seq = (await prisma.inspection.count()) + 1;
  const insp = await prisma.inspection.create({
    data: {
      inspectionNumber: formatCode('INS', seq),
      lotId: lot.id,
      officerId: user.id,
      centreId: centreId ?? user.centreId ?? lot.centreId ?? null,
      fpoId: lot.fpoId ?? null,
      status: 'CREATED',
    },
  });

  await recordAudit({
    userId: user.id, action: 'INSPECTION_CREATED', entityType: 'Inspection', entityId: insp.id,
    metadata: { lotId: lot.id, inspectionNumber: insp.inspectionNumber },
  });
  realtimeHub.publishInspection(insp.id, 'created', { inspectionNumber: insp.inspectionNumber });
  return insp;
}

export async function assignSample(user: User, id: string, sampleSize: number, weight?: number) {
  const insp = await getOwned(user, id, 'write');
  if (insp.status !== 'CREATED') throw invalidTransition(insp.status, 'SAMPLE_ASSIGNED');
  const code = sampleCode(insp.inspectionNumber);
  await prisma.inspectionSample.create({
    data: { inspectionId: id, sampleCode: code, sampleSize, weight: weight ?? null },
  });
  return applyTransition(id, 'SAMPLE_ASSIGNED', user.id, { sampleCode: code, sampleSize });
}

export async function bindDevice(user: User, id: string, deviceCode: string) {
  const insp = await getOwned(user, id, 'write');
  if (insp.status !== 'SAMPLE_ASSIGNED') throw invalidTransition(insp.status, 'SENSOR_STABILIZING');

  const device = await getDeviceByCode(deviceCode);
  if (device.boundInspectionId && device.boundInspectionId !== id) {
    throw conflict('Device is already bound to another inspection');
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + env.SENSOR_DWELL_SECONDS * 1000);

  await prisma.$transaction([
    prisma.ioTDevice.update({
      where: { id: device.id },
      data: { boundInspectionId: id, status: 'ONLINE', lastSeenAt: now },
    }),
    prisma.inspection.update({
      where: { id },
      data: {
        stabilizationStatus: 'STABILIZING',
        stabilizationStartedAt: now,
        stabilizationEndsAt: endsAt,
      },
    }),
  ]);

  await recordAudit({
    userId: user.id, action: 'DEVICE_BOUND', entityType: 'IoTDevice', entityId: device.id,
    metadata: { inspectionId: id, deviceCode: device.deviceCode },
  });
  realtimeHub.publishInspection(id, 'device_bound', { deviceCode: device.deviceCode });
  return applyTransition(id, 'SENSOR_STABILIZING', user.id, { deviceCode: device.deviceCode });
}

export async function completeStabilization(user: User, id: string, opts?: { force?: boolean }) {
  const insp = await getOwned(user, id, 'write');
  if (insp.status !== 'SENSOR_STABILIZING') throw invalidTransition(insp.status, 'CAPTURED');
  const endsAt = insp.stabilizationEndsAt?.getTime() ?? 0;
  if (!opts?.force && endsAt && Date.now() < endsAt) {
    throw conflict('Sensor stabilization still in progress');
  }
  await prisma.inspection.update({ where: { id }, data: { stabilizationStatus: 'STABLE' } });
  return applyTransition(id, 'CAPTURED', user.id, {});
}

export async function addImage(user: User, id: string, file: { buffer: Buffer; originalname?: string; mimetype?: string }) {
  const insp = await getOwned(user, id, 'write');
  if (insp.status !== 'CAPTURED') {
    // Allow capture-phase images; otherwise the pipeline is past image intake.
    throw invalidTransition(insp.status, 'CAPTURED');
  }
  const stored = await getStorage().save({
    buffer: file.buffer,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
  });
  const asset = await prisma.imageAsset.create({
    data: {
      inspectionId: id,
      storageKey: stored.storageKey,
      originalFilename: file.originalname ?? null,
      mimeType: file.mimetype ?? null,
      size: stored.size,
      status: 'UPLOADED',
    },
  });
  await recordAudit({
    userId: user.id, action: 'IMAGE_UPLOADED', entityType: 'ImageAsset', entityId: asset.id,
    metadata: { inspectionId: id },
  });
  realtimeHub.publishInspection(id, 'image', { storageKey: stored.storageKey });
  return asset;
}

export async function runAnalysis(user: User, id: string) {
  const insp = await getOwned(user, id, 'write');
  if (insp.status !== 'CAPTURED') throw invalidTransition(insp.status, 'AI_PROCESSING');
  await applyTransition(id, 'AI_PROCESSING', user.id, {});

  const [images, readings] = await Promise.all([
    prisma.imageAsset.findMany({ where: { inspectionId: id } }),
    prisma.ioTReading.findMany({ where: { inspectionId: id } }),
  ]);

  const mode: AiMode = env.AI_MODE === 'MOCK' ? 'MOCK' : 'REAL';

  let vision: Awaited<ReturnType<ReturnType<typeof getVisionAnalyzer>['analyze']>>;
  let gas: Awaited<ReturnType<ReturnType<typeof getGasAnalyzer>['analyze']>>;
  try {
    vision = await withStageLog(
      { inspectionId: id, stage: 'VISION', modelName: '', mode },
      () => getVisionAnalyzer().analyze({
        inspectionId: id,
        imageCount: images.length,
        imageKeys: images.map((i) => i.storageKey),
      }),
    );
    gas = await withStageLog(
      { inspectionId: id, stage: 'GAS', modelName: '', mode },
      () => getGasAnalyzer().analyze({
        inspectionId: id,
        readings: readings.map((r) => ({
          temperature: r.temperature, humidity: r.humidity,
          gas1: r.gas1, gas2: r.gas2, gas3: r.gas3, airQuality: r.airQuality,
        })),
      }),
    );
  } catch (err) {
    await applyTransition(id, 'FAILED', user.id, { reason: String(err) });
    throw aiServiceError(err instanceof Error ? err.message : 'AI analysis failed', { meta: { inspectionId: id } });
  }

  await persistAnalyses(id, vision, gas, mode);
  await recordAudit({
    userId: user.id, action: 'AI_ANALYSIS_COMPLETED', entityType: 'Inspection', entityId: id,
    metadata: { visionQuality: vision.quality, gasQuality: gas.quality, risk: gas.risk },
  });
  await applyTransition(id, 'FUSION_PROCESSING', user.id, {});
  return { vision, gas };
}

/**
 * Persist a vision + gas analysis pair (and derived environment analysis) for
 * an inspection. Shared by the live AI path and the deterministic demo path.
 */
async function persistAnalyses(
  id: string,
  vision: Awaited<ReturnType<ReturnType<typeof getVisionAnalyzer>['analyze']>>,
  gas: Awaited<ReturnType<ReturnType<typeof getGasAnalyzer>['analyze']>>,
  mode: AiMode,
): Promise<void> {
  const visionAnalysis = await prisma.aIAnalysis.create({
    data: {
      inspectionId: id, analysisType: 'VISION', modelName: vision.modelName,
      modelVersion: vision.modelVersion, provider: 'onionsure', mode,
      status: 'COMPLETED', confidence: vision.confidence, processingTimeMs: vision.processingTimeMs,
      resultJson: vision as unknown as Prisma.InputJsonValue,
    },
  });
  await prisma.defectDetection.createMany({
    data: vision.defects.map((d) => ({
      aiAnalysisId: visionAnalysis.id, defectType: d.type, count: d.count,
      severity: d.severity, confidence: d.confidence,
    })),
  });

  await prisma.aIAnalysis.create({
    data: {
      inspectionId: id, analysisType: 'GAS', modelName: gas.modelName,
      modelVersion: gas.modelVersion, provider: 'onionsure', mode,
      status: 'COMPLETED', confidence: gas.confidence, processingTimeMs: gas.processingTimeMs,
      resultJson: gas as unknown as Prisma.InputJsonValue,
    },
  });
  await prisma.aIAnalysis.create({
    data: {
      inspectionId: id, analysisType: 'ENVIRONMENT', modelName: gas.modelName,
      modelVersion: gas.modelVersion, provider: 'onionsure', mode,
      status: 'COMPLETED', confidence: gas.environment.confidence, processingTimeMs: gas.processingTimeMs,
      resultJson: {
        quality: gas.environment.quality, confidence: gas.environment.confidence,
        temperature: gas.environment.temperature, humidity: gas.environment.humidity,
      } as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Ingest precomputed scenario analyses (used by the demo runner) and advance
 * the pipeline to FUSION_PROCESSING so `runFusion` can take over.
 */
export async function ingestAnalyses(
  user: User,
  id: string,
  vision: Awaited<ReturnType<ReturnType<typeof getVisionAnalyzer>['analyze']>>,
  gas: Awaited<ReturnType<ReturnType<typeof getGasAnalyzer>['analyze']>>,
) {
  const insp = await getOwned(user, id, 'write');
  if (insp.status !== 'CAPTURED') throw invalidTransition(insp.status, 'AI_PROCESSING');
  await applyTransition(id, 'AI_PROCESSING', user.id, {});
  const mode: AiMode = env.AI_MODE === 'MOCK' ? 'MOCK' : 'REAL';
  await persistAnalyses(id, vision, gas, mode);
  await applyTransition(id, 'FUSION_PROCESSING', user.id, {});
  return { vision, gas };
}

export async function runFusion(user: User, id: string) {
  const insp = await getOwned(user, id, 'write');
  if (insp.status !== 'FUSION_PROCESSING') throw invalidTransition(insp.status, 'GRADED');

  const analyses = await prisma.aIAnalysis.findMany({ where: { inspectionId: id } });
  const vision = analyses.find((a) => a.analysisType === 'VISION')?.resultJson as Record<string, unknown> | undefined;
  const gas = analyses.find((a) => a.analysisType === 'GAS')?.resultJson as Record<string, unknown> | undefined;
  const envRes = analyses.find((a) => a.analysisType === 'ENVIRONMENT')?.resultJson as Record<string, unknown> | undefined;
  if (!vision || !gas || !envRes) throw aiServiceError('Missing AI analyses required for fusion');

  const cfg = await getActiveFusionConfig();
  const fused = fuseEngine({
    vision: { quality: Number(vision.quality), confidence: Number(vision.confidence) },
    gas: {
      quality: Number(gas.quality), confidence: Number(gas.confidence),
      risk: String(gas.risk) as 'LOW' | 'MEDIUM' | 'HIGH',
      earlySpoilageRisk: Boolean(gas.earlySpoilageRisk),
    },
    environment: { quality: Number(envRes.quality), confidence: Number(envRes.confidence) },
    weights: { vision: cfg.vision, gas: cfg.gas, environment: cfg.environment },
    earlySpoilage: { enabled: cfg.earlySpoilageEnabled, visionHealthyAbove: env.ALERT_VISION_ABOVE },
  });

  await prisma.fusionResult.create({
    data: {
      inspectionId: id,
      visionQuality: Number(vision.quality), visionConfidence: Number(vision.confidence),
      gasQuality: Number(gas.quality), gasConfidence: Number(gas.confidence),
      environmentQuality: Number(envRes.quality), environmentConfidence: Number(envRes.confidence),
      finalScore: fused.finalScore, confidence: fused.confidence, riskLevel: fused.riskLevel,
      earlySpoilage: fused.earlySpoilage,
      explanationJson: { explanation: fused.explanation, warning: fused.warning, components: fused.components } as unknown as Prisma.InputJsonValue,
      weightsJson: { vision: cfg.vision, gas: cfg.gas, environment: cfg.environment } as unknown as Prisma.InputJsonValue,
      fusionConfigVersion: cfg.version,
    },
  });

  const thresholds = await getGradingThresholds();
  const graded = gradeInspection({
    finalScore: fused.finalScore,
    earlySpoilage: fused.earlySpoilage,
    riskLevel: fused.riskLevel,
    defectCounts: ((vision.defects as Array<{ type: DefectType; count: number }>) ?? []).map((d) => ({
      type: d.type, count: d.count,
    })),
    thresholds,
  });

  await prisma.inspection.update({
    where: { id },
    data: {
      qualityScore: fused.finalScore, grade: graded.grade, riskLevel: graded.riskLevel,
      gradeAPercentage: graded.gradeAPercentage, ursPercentage: graded.ursPercentage,
      rejectedPercentage: graded.rejectedPercentage, confidence: fused.confidence,
      earlySpoilage: fused.earlySpoilage, fusionConfigVersion: cfg.version,
    },
  });

  await recordAudit({
    userId: user.id, action: 'GRADE_ASSIGNED', entityType: 'Inspection', entityId: id,
    metadata: { grade: graded.grade, finalScore: fused.finalScore },
  });
  await applyTransition(id, 'GRADED', user.id, { grade: graded.grade, finalScore: fused.finalScore });
  return { fused, graded };
}

export async function issueCertificate(user: User, id: string) {
  const insp = await getOwned(user, id, 'write');
  if (insp.status !== 'GRADED') throw invalidTransition(insp.status, 'CERTIFICATE_GENERATED');
  // Idempotency: if a certificate already exists for this inspection, return it.
  const existing = await prisma.certificate.findFirst({ where: { inspectionId: id } });
  if (existing) {
    const inspection = await getInspection(user, id);
    return { inspection, certificate: existing };
  }
  const cert = await issueForInspection(insp);
  const inspection = await applyTransition(id, 'CERTIFICATE_GENERATED', user.id, {
    certificateNumber: cert.certificateNumber,
  });
  return { inspection, certificate: cert };
}

export async function complete(user: User, id: string) {
  const insp = await getOwned(user, id, 'write');
  if (insp.status !== 'CERTIFICATE_GENERATED') throw invalidTransition(insp.status, 'COMPLETED');

  const updated = await prisma.inspection.update({
    where: { id }, data: { status: 'COMPLETED', completedAt: new Date() },
  });
  const lotStatus = insp.grade === 'REJECTED' ? 'REJECTED' : 'CERTIFIED';
  await prisma.lot.update({ where: { id: insp.lotId }, data: { status: lotStatus } });

  await recordAudit({
    userId: user.id, action: 'INSPECTION_COMPLETED', entityType: 'Inspection', entityId: id,
    metadata: { grade: insp.grade, lotStatus },
  });
  realtimeHub.publishInspection(id, 'completed', { grade: insp.grade, lotStatus });
  return updated;
}

export async function cancel(user: User, id: string) {
  const insp = await getOwned(user, id, 'write');
  if (TERMINAL_STATES.includes(insp.status)) throw invalidTransition(insp.status, 'CANCELLED');

  const updated = await prisma.inspection.update({ where: { id }, data: { status: 'CANCELLED' } });
  await prisma.ioTDevice.updateMany({ where: { boundInspectionId: id }, data: { boundInspectionId: null, status: 'OFFLINE' } });

  await recordAudit({
    userId: user.id, action: 'INSPECTION_CANCELLED', entityType: 'Inspection', entityId: id,
    metadata: { from: insp.status },
  });
  realtimeHub.publishInspection(id, 'cancelled', { from: insp.status });
  return updated;
}

export async function getTimeline(id: string) {
  return prisma.auditLog.findMany({
    where: { OR: [{ entityType: 'Inspection', entityId: id }, { entityId: id }] },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
}
