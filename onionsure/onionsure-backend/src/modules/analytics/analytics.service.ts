/**
 * Analytics service (spec §25).
 *
 * IMPORTANT: the backend is the single source of truth for every dashboard
 * number. The frontend renders whatever this module returns — it never computes
 * grades, percentages, risk, or aggregates itself. All values are derived from
 * the database with strict role-based scoping (spec §40).
 */
import type { Grade, LotStatus, RiskLevel } from '@prisma/client';
import { prisma } from '../../database/client';
import { scopeFor } from '../inspections/inspection.service';

type User = NonNullable<Express.Request['user']>;

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

async function inspectionBase(user: User) {
  return { where: scopeFor(user) };
}

async function gradeDistribution(user: User): Promise<Record<Grade, number>> {
  const rows = await prisma.inspection.groupBy({
    by: ['grade'],
    where: { ...scopeFor(user), grade: { not: null } },
    _count: { _all: true },
  });
  const out: Record<Grade, number> = { GRADE_A: 0, URS: 0, REJECTED: 0 };
  for (const r of rows) {
    if (r.grade) out[r.grade] += r._count._all;
  }
  return out;
}

async function riskDistribution(user: User): Promise<Record<RiskLevel, number>> {
  const rows = await prisma.inspection.groupBy({
    by: ['riskLevel'],
    where: { ...scopeFor(user), riskLevel: { not: null } },
    _count: { _all: true },
  });
  const out: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const r of rows) {
    if (r.riskLevel) out[r.riskLevel] += r._count._all;
  }
  return out;
}

async function avgQuality(user: User): Promise<number | null> {
  const agg = await prisma.inspection.aggregate({
    where: { ...scopeFor(user), qualityScore: { not: null } },
    _avg: { qualityScore: true },
  });
  return agg._avg.qualityScore != null ? Math.round(agg._avg.qualityScore * 100) / 100 : null;
}

export async function officerDashboard(user: User) {
  const base = await inspectionBase(user);
  const [lotsByStatus, totalInspections, inspectionsToday, grade, risk, quality, recent, perCentre] = await Promise.all([
    prisma.lot.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.inspection.count(base),
    prisma.inspection.count({ where: { ...base.where, createdAt: { gte: startOfToday() } } }),
    gradeDistribution(user),
    riskDistribution(user),
    avgQuality(user),
    prisma.inspection.findMany({
      where: base.where, orderBy: { createdAt: 'desc' }, take: 10,
      select: {
        id: true, inspectionNumber: true, status: true, grade: true, qualityScore: true,
        riskLevel: true, createdAt: true,
        lot: { select: { lotNumber: true, farmer: { select: { name: true } } } },
      },
    }),
    prisma.inspection.groupBy({
      by: ['centreId'],
      where: base.where,
      _count: { _all: true },
    }),
  ]);

  const centreThroughput = await Promise.all(
    perCentre.map(async (c) => {
      const centre = c.centreId
        ? await prisma.procurementCentre.findUnique({ where: { id: c.centreId }, select: { name: true } })
        : null;
      return { centreId: c.centreId, name: centre?.name ?? 'Unassigned', count: c._count._all };
    }),
  );

  return {
    role: 'PROCUREMENT_OFFICER',
    totalInspections,
    inspectionsToday,
    averageQualityScore: quality,
    gradeDistribution: grade,
    riskDistribution: risk,
    lotsByStatus: Object.fromEntries(lotsByStatus.map((l) => [l.status, l._count._all])),
    centreThroughput,
    recentInspections: recent,
  };
}

export async function fpoDashboard(user: User) {
  const lotsWhere = user.fpoId ? { fpoId: user.fpoId } : { fpoId: '__none__' };
  const [totalLots, totalInspections, grade, risk, quality, recent] = await Promise.all([
    prisma.lot.count({ where: lotsWhere }),
    prisma.inspection.count({ where: scopeFor(user) }),
    gradeDistribution(user),
    riskDistribution(user),
    avgQuality(user),
    prisma.inspection.findMany({
      where: scopeFor(user), orderBy: { createdAt: 'desc' }, take: 10,
      select: {
        inspectionNumber: true, status: true, grade: true, qualityScore: true, riskLevel: true,
        lot: { select: { lotNumber: true } },
      },
    }),
  ]);
  return {
    role: 'FPO',
    totalLots,
    totalInspections,
    averageQualityScore: quality,
    gradeDistribution: grade,
    riskDistribution: risk,
    recentInspections: recent,
  };
}

export async function farmerDashboard(user: User) {
  const lotsWhere = user.farmerId ? { farmerId: user.farmerId } : { farmerId: '__none__' };
  const [totalLots, lotStatuses, totalCertificates, grade, quality] = await Promise.all([
    prisma.lot.count({ where: lotsWhere }),
    prisma.lot.groupBy({ by: ['status'], where: lotsWhere, _count: { _all: true } }),
    prisma.certificate.count({
      where: { inspection: { lot: user.farmerId ? { farmerId: user.farmerId } : { farmerId: '__none__' } } },
    }),
    gradeDistribution(user),
    avgQuality(user),
  ]);
  return {
    role: 'FARMER',
    totalLots,
    lotStatuses: Object.fromEntries(lotStatuses.map((l) => [l.status, l._count._all])),
    totalCertificates,
    averageQualityScore: quality,
    gradeDistribution: grade,
  };
}

export async function buyerDashboard(_user: User) {
  // Buyers see the public marketplace of certified / completed lots.
  const where = { status: { in: ['CERTIFIED', 'CLOSED'] as LotStatus[] } };
  const [availableLots, grade, risk] = await Promise.all([
    prisma.lot.count({ where }),
    gradeDistribution({ ..._user, role: 'BUYER' } as User),
    riskDistribution({ ..._user, role: 'BUYER' } as User),
  ]);
  return {
    role: 'BUYER',
    availableLots,
    gradeDistribution: grade,
    riskDistribution: risk,
  };
}

export async function adminDashboard(user: User) {
  const [users, lots, inspections, devices, certificates, grade, risk] = await Promise.all([
    prisma.user.count(),
    prisma.lot.count(),
    prisma.inspection.count(),
    prisma.ioTDevice.count(),
    prisma.certificate.count({ where: { status: 'VALID' } }),
    gradeDistribution(user),
    riskDistribution(user),
  ]);
  return {
    role: 'ADMIN',
    totalUsers: users,
    totalLots: lots,
    totalInspections: inspections,
    onlineDevices: devices,
    validCertificates: certificates,
    gradeDistribution: grade,
    riskDistribution: risk,
  };
}

export async function dashboardFor(user: User): Promise<Record<string, unknown>> {
  switch (user.role) {
    case 'PROCUREMENT_OFFICER':
      return officerDashboard(user);
    case 'FPO':
      return fpoDashboard(user);
    case 'FARMER':
      return farmerDashboard(user);
    case 'BUYER':
      return buyerDashboard(user);
    case 'ADMIN':
      return adminDashboard(user);
    default:
      return {};
  }
}
