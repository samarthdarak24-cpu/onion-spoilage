/**
 * Certificate generation & verification (spec §21–§24).
 *
 * A certificate is an IMMUTABLE snapshot of an inspection result. Its contents
 * are SHA-256 hashed at creation; the public verify endpoint recomputes the
 * hash from the stored snapshot and compares — any tampering is detected
 * (CERTIFICATE_INTEGRITY_ERROR). A random, unguessable token powers the public
 * /api/public/verify/:token endpoint (no auth required).
 */
import crypto from 'crypto';
import type { Inspection, Certificate } from '@prisma/client';
import { prisma } from '../../database/client';
import { notFound, integrityError } from '../../utils/errors';
import { randomToken, formatCode, verificationUrl } from '../../utils/ids';
import { recordAudit } from '../../modules/audit/audit.service';
import { realtimeHub } from '../realtime/hub';

export interface CertificatePublicView {
  certificateNumber: string;
  inspectionNumber: string;
  lotNumber: string;
  grade: string | null;
  qualityScore: number | null;
  gradeAPercentage: number | null;
  ursPercentage: number | null;
  rejectedPercentage: number | null;
  riskLevel: string | null;
  earlySpoilage: boolean;
  issuedAt: Date;
  expiresAt: Date | null;
  status: string;
  verificationUrl: string;
  integrityOk: boolean;
}

/**
 * Deterministic, storage-order-independent JSON serialization. JSONB (Postgres)
 * reorders object keys alphabetically on read, so a naive JSON.stringify of the
 * issued snapshot would not match the recomputed hash at verification time.
 * Sorting keys recursively makes the canonical string identical regardless of
 * the order in which keys are stored or returned.
 */
function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJSON).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`);
  return `{${pairs.join(',')}}`;
}

function buildSnapshot(insp: Inspection & { lot: { lotNumber: string; farmer?: { name: string | null }; fpo?: { name: string | null } } }) {
  return {
    inspectionNumber: insp.inspectionNumber,
    lotNumber: insp.lot.lotNumber,
    farmer: insp.lot.farmer?.name ?? null,
    fpo: insp.lot.fpo?.name ?? null,
    grade: insp.grade,
    qualityScore: insp.qualityScore,
    gradeAPercentage: insp.gradeAPercentage,
    ursPercentage: insp.ursPercentage,
    rejectedPercentage: insp.rejectedPercentage,
    riskLevel: insp.riskLevel,
    earlySpoilage: insp.earlySpoilage,
    confidence: insp.confidence,
    fusionConfigVersion: insp.fusionConfigVersion,
    issuedAt: new Date().toISOString(),
  };
}

export async function issueForInspection(insp: Inspection): Promise<Certificate> {
  const full = await prisma.inspection.findUnique({
    where: { id: insp.id },
    include: { lot: { include: { farmer: true, fpo: true } } },
  });
  if (!full) throw notFound('Inspection', insp.id);

  const snapshot = buildSnapshot(full as never);
  const canonical = canonicalJSON(snapshot);
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  const token = randomToken();
  const certNumber = formatCode('CERT', (await prisma.certificate.count()) + 1);

  const created = await prisma.certificate.create({
    data: {
      certificateNumber: certNumber,
      inspectionId: full.id,
      lotId: full.lotId,
      snapshotJson: snapshot as never,
      hash,
      verificationToken: token,
      qrData: verificationUrl(token),
      grade: full.grade,
      qualityScore: full.qualityScore,
      riskLevel: full.riskLevel,
      gradeAPercentage: full.gradeAPercentage,
      ursPercentage: full.ursPercentage,
      rejectedPercentage: full.rejectedPercentage,
      status: 'VALID',
    },
  });

  await recordAudit({
    action: 'CERTIFICATE_CREATED',
    entityType: 'Certificate',
    entityId: created.id,
    metadata: { certificateNumber: certNumber, inspectionId: full.id },
  });

  realtimeHub.publishInspection(full.id, 'certificate', {
    certificateNumber: certNumber,
    verificationToken: token,
  });
  realtimeHub.publishGlobal('certificate_issued', { certificateNumber: certNumber });

  return created;
}

/** Public verification — no auth. Recomputes the hash to prove immutability. */
export async function verifyCertificate(token: string): Promise<CertificatePublicView> {
  const cert = await prisma.certificate.findUnique({
    where: { verificationToken: token },
    include: { inspection: { include: { lot: { include: { farmer: true, fpo: true } } } } },
  });
  if (!cert) throw notFound('Certificate', token);

  const snapshot = cert.snapshotJson as Record<string, unknown>;
  const recomputed = crypto
    .createHash('sha256')
    .update(canonicalJSON(snapshot))
    .digest('hex');

  const integrityOk = recomputed === cert.hash;
  if (!integrityOk) {
    throw integrityError('Certificate snapshot hash mismatch — data integrity compromised');
  }

  const lot = cert.inspection?.lot;
  return {
    certificateNumber: cert.certificateNumber,
    inspectionNumber: cert.inspection?.inspectionNumber ?? '',
    lotNumber: lot?.lotNumber ?? '',
    grade: cert.grade,
    qualityScore: cert.qualityScore,
    gradeAPercentage: cert.gradeAPercentage,
    ursPercentage: cert.ursPercentage,
    rejectedPercentage: cert.rejectedPercentage,
    riskLevel: cert.riskLevel,
    earlySpoilage: Boolean(cert.snapshotJson ? (snapshot.earlySpoilage ?? false) : false),
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    status: cert.status,
    verificationUrl: verificationUrl(cert.verificationToken),
    integrityOk,
  };
}

export async function revokeCertificate(certificateId: string, actorId?: string, reason?: string): Promise<Certificate> {
  const cert = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!cert) throw notFound('Certificate', certificateId);
  if (cert.status === 'REVOKED') return cert;

  const updated = await prisma.certificate.update({
    where: { id: certificateId },
    data: { status: 'REVOKED', revokedAt: new Date(), revokedById: actorId ?? null, revokeReason: reason ?? null },
  });

  await recordAudit({
    userId: actorId,
    action: 'CERTIFICATE_REVOKED',
    entityType: 'Certificate',
    entityId: certificateId,
    metadata: { reason: reason ?? null },
  });

  realtimeHub.publishGlobal('certificate_revoked', { certificateNumber: cert.certificateNumber });
  return updated;
}
