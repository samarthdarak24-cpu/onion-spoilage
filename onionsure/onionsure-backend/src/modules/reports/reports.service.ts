/**
 * Inspection report builder (spec §26).
 *
 * Assembles a complete, print-ready snapshot of an inspection: lot & parties,
 * sample, images, every AI analysis with its defects, the fusion result, the
 * final grade composition, the certificate, and the audit timeline. The
 * frontend only renders this — it never re-derives numbers.
 */
import { prisma } from '../../database/client';
import { notFound } from '../../utils/errors';
import { getOwned as inspectGetOwned } from '../inspections/inspection.service';

type User = NonNullable<Express.Request['user']>;

export async function buildReport(user: User, id: string) {
  await inspectGetOwned(user, id, 'read');

  const inspection = await prisma.inspection.findUnique({
    where: { id },
    include: {
      lot: { include: { farmer: true, fpo: true, centre: true } },
      sample: true,
      images: true,
      device: true,
      analyses: { include: { defects: true }, orderBy: { analysisType: 'asc' } },
      fusionResult: true,
      certificates: true,
    },
  });
  if (!inspection) throw notFound('Inspection', id);

  const timeline = await prisma.auditLog.findMany({
    where: { OR: [{ entityType: 'Inspection', entityId: id }, { entityId: id }] },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  return {
    generatedAt: new Date().toISOString(),
    inspection,
    report: {
      inspectionNumber: inspection.inspectionNumber,
      status: inspection.status,
      grade: inspection.grade,
      qualityScore: inspection.qualityScore,
      riskLevel: inspection.riskLevel,
      earlySpoilage: inspection.earlySpoilage,
      confidence: inspection.confidence,
      gradeAPercentage: inspection.gradeAPercentage,
      ursPercentage: inspection.ursPercentage,
      rejectedPercentage: inspection.rejectedPercentage,
    },
    timeline,
  };
}
