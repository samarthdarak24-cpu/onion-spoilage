import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, Award, AlertTriangle, PlusCircle, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { EV_DASHBOARD } from '../../lib/events';
import { useLiveData } from '../../hooks/useLiveData';
import { Card, Badge, GradeBadge, StatCard } from '../../components/ui';
import { Donut, TrendLine, DefectBars } from '../../components/charts';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber, SkeletonStats, Skeleton } from '../../components/motion';
import { LiveIndicator } from '../../components/RealtimeStatus';
import type { DashboardStats } from '../../lib/types';

interface Bundle {
  stats: DashboardStats;
  quality: any;
  defects: Record<string, number>;
  certs: any[];
}

export default function ProcDashboard() {
  const { data, error, loading } = useLiveData<Bundle>(
    async () => {
      const [stats, quality, defects, certs] = await Promise.all([
        api.analyticsDashboard(),
        api.analyticsQuality(),
        api.analyticsDefects(),
        api.getCertificates(),
      ]);
      return { stats, quality, defects, certs };
    },
    { events: EV_DASHBOARD, pollMs: 15000 },
  );

  if (error && !data) return <div className="rounded-xl border border-reject/20 bg-reject/5 px-4 py-3 text-sm text-reject">{error}</div>;

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <SkeletonStats count={5} />
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }

  const { stats, quality, defects, certs } = data;

  const gradeData = [
    { name: 'Grade A', value: stats.gradeALots },
    { name: 'URS', value: stats.ursLots },
    { name: 'Rejected', value: stats.rejectedLots },
  ];
  const defectData = Object.entries(defects).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }));
  const recent = certs.slice(0, 6);
  const totalLots = stats.gradeALots + stats.ursLots + stats.rejectedLots;

  return (
    <PageTransition className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Procurement Officer</div>
          <h1 className="truncate text-xl font-extrabold text-ink md:text-2xl">Quality Operations Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">Live grading throughput across every lot you inspect.</p>
        </div>
        <div className="flex items-center gap-2">
          <LiveIndicator />
          <Link to="/quality/new-inspection" className="btn-primary py-2 text-sm">
            <PlusCircle size={15} /> New Inspection
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StaggerItem className="h-full">
          <StatCard label="Today's Inspections" value={<AnimatedNumber value={stats.todayInspections} />} sub="graded today" accent="forest" icon={ClipboardList} />
        </StaggerItem>
        <StaggerItem className="h-full">
          <StatCard label="Pending" value={<AnimatedNumber value={stats.pendingInspections} />} sub="awaiting result" accent="amber" icon={Clock} />
        </StaggerItem>
        <StaggerItem className="h-full">
          <StatCard label="Grade A Lots" value={<AnimatedNumber value={stats.gradeALots} />} sub="premium quality" accent="fresh" icon={Award} />
        </StaggerItem>
        <StaggerItem className="h-full">
          <StatCard label="URS Lots" value={<AnimatedNumber value={stats.ursLots} />} sub="usable, reduced" accent="amber" icon={TrendingUp} />
        </StaggerItem>
        <StaggerItem className="h-full">
          <StatCard label="Rejected Lots" value={<AnimatedNumber value={stats.rejectedLots} />} sub="did not pass" accent="reject" icon={AlertTriangle} />
        </StaggerItem>
      </Stagger>

      {/* Charts */}
      <Stagger className="grid gap-5 lg:grid-cols-3" gap={0.06}>
        <StaggerItem className="h-full">
          <Card className="flex h-full flex-col p-4">
            <CardTitle>Live Quality Overview</CardTitle>
            <div className="flex flex-1 items-center"><Donut data={gradeData} /></div>
            <div className="mt-2 flex justify-center gap-3 text-[11px] text-muted">
              <Legend color="bg-forest" label="Grade A" value={stats.gradeALots} />
              <Legend color="bg-amber" label="URS" value={stats.ursLots} />
              <Legend color="bg-reject" label="Rejected" value={stats.rejectedLots} />
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem className="h-full">
          <Card className="flex h-full flex-col p-4">
            <CardTitle>Quality Trend</CardTitle>
            <div className="flex flex-1 items-center">
              <TrendLine data={quality.qualityTrend.map((t: any) => ({ day: t.day.slice(5), avg: t.avg }))} xKey="day" yKey="avg" />
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem className="h-full">
          <Card className="flex h-full flex-col p-4">
            <CardTitle>Defect Distribution</CardTitle>
            <div className="flex flex-1 items-center"><DefectBars data={defectData} /></div>
          </Card>
        </StaggerItem>
      </Stagger>

      {/* Recent certificates */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <CardTitle className="mb-0">Recent Certificates</CardTitle>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">{totalLots} lots graded</span>
            <Link to="/quality/certificates" className="text-xs font-semibold text-forest hover:underline">View all →</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 pr-3 font-semibold">Certificate</th>
                <th className="pb-2 pr-3 font-semibold">Grade</th>
                <th className="pb-2 pr-3 font-semibold">Score</th>
                <th className="pb-2 pr-3 font-semibold">Risk</th>
                <th className="pb-2 font-semibold">Issued</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id} className="border-b border-border transition-colors last:border-0 hover:bg-mint/40">
                  <td className="py-2.5 pr-3 font-medium">
                    <Link to={`/certificate/${c.id}`} className="text-forest hover:underline">{c.certificateNumber}</Link>
                  </td>
                  <td className="py-2.5 pr-3"><GradeBadge grade={c.grade} /></td>
                  <td className="py-2.5 pr-3 font-bold text-ink">{c.qualityScore}</td>
                  <td className="py-2.5 pr-3">
                    <Badge tone={c.riskLevel === 'HIGH' ? 'reject' : c.riskLevel === 'MEDIUM' ? 'amber' : 'forest'}>
                      {c.riskLevel}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-sm text-muted">No certificates yet — run a New Inspection to issue the first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageTransition>
  );
}

function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-2 text-[13px] font-bold text-ink ${className || ''}`}>{children}</div>;
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1">
      <i className={`h-2 w-2 rounded-full ${color}`} />
      {label} <b className="text-ink">{value}</b>
    </span>
  );
}
