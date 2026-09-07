import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList, Clock, Award, AlertTriangle, PlusCircle,
  TrendingUp, ArrowRight, BarChart3,
} from 'lucide-react';
import { api } from '../../lib/api';
import { EV_DASHBOARD } from '../../lib/events';
import { useLiveData } from '../../hooks/useLiveData';
import { GradeBadge, RiskBadge } from '../../components/ui';
import { Donut, TrendLine, DefectBars } from '../../components/charts';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber, Skeleton, SkeletonStats } from '../../components/motion';
import { LiveIndicator } from '../../components/RealtimeStatus';
import { PageHeader, StatGrid, StatTile } from '../../components/PageHeader';
import type { DashboardStats } from '../../lib/types';

interface Bundle { stats: DashboardStats; quality: any; defects: Record<string, number>; certs: any[] }

export default function ProcDashboard() {
  const { data, error, loading } = useLiveData<Bundle>(
    async () => {
      const [stats, quality, defects, certs] = await Promise.all([
        api.analyticsDashboard(), api.analyticsQuality(), api.analyticsDefects(), api.getCertificates(),
      ]);
      return { stats, quality, defects, certs };
    },
    { events: EV_DASHBOARD, pollMs: 15000 },
  );

  if (error && !data) return (
    <div className="rounded-2xl border border-reject/20 bg-reject/5 px-5 py-4 text-sm font-medium text-reject flex items-center gap-2">
      <AlertTriangle size={16} /> {error}
    </div>
  );
  if (loading || !data) return (
    <div className="space-y-5">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <SkeletonStats count={5} />
      <div className="grid gap-4 lg:grid-cols-3">{[0,1,2].map(i => <Skeleton key={i} className="h-64 w-full" />)}</div>
    </div>
  );

  const { stats, quality, defects, certs } = data;
  const gradeData = [
    { name: 'Grade A',  value: stats.gradeALots },
    { name: 'URS',      value: stats.ursLots },
    { name: 'Rejected', value: stats.rejectedLots },
  ];
  const defectData  = Object.entries(defects).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }));
  const trendData   = (quality.qualityTrend || []).map((t: any) => ({ day: t.day.slice(5), avg: t.avg }));
  const recent      = certs.slice(0, 6);
  const totalLots   = stats.gradeALots + stats.ursLots + stats.rejectedLots;

  return (
    <PageTransition className="space-y-5">
      <PageHeader
        icon={<BarChart3 size={21} />}
        eyebrow="Procurement Officer"
        title="Quality Operations"
        subtitle="Live grading throughput across every lot you inspect."
        badge={<LiveIndicator />}
        actions={
          <Link
            to="/quality/new-inspection"
            className="inline-flex items-center gap-2 rounded-xl bg-white/20 border border-white/30 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30 hover:border-white/45"
          >
            <PlusCircle size={14} /> New Inspection
          </Link>
        }
      />

      {/* KPIs */}
      <StatGrid cols={5}>
        <StatTile label="Today"    value={<AnimatedNumber value={stats.todayInspections} />}  sub="inspections"    icon={ClipboardList} accent="green" />
        <StatTile label="Pending"  value={<AnimatedNumber value={stats.pendingInspections} />} sub="awaiting result" icon={Clock}         accent="amber" />
        <StatTile label="Grade A"  value={<AnimatedNumber value={stats.gradeALots} />}          sub="premium lots"   icon={Award}         accent="green" />
        <StatTile label="URS"      value={<AnimatedNumber value={stats.ursLots} />}             sub="usable, reduced" icon={TrendingUp}    accent="amber" />
        <StatTile label="Rejected" value={<AnimatedNumber value={stats.rejectedLots} />}        sub="did not pass"   icon={AlertTriangle} accent="red"   />
      </StatGrid>

      {/* Charts row */}
      <Stagger className="grid gap-5 lg:grid-cols-3" gap={0.06}>
        <StaggerItem className="h-full">
          <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 shadow-soft flex flex-col h-full">
            <p className="font-bold text-ink text-[14px] mb-3">Quality Overview</p>
            <div className="flex flex-1 items-center"><Donut data={gradeData} /></div>
            <div className="mt-3 flex justify-center gap-4">
              {[{ c: 'bg-forest', l: 'Grade A', v: stats.gradeALots }, { c: 'bg-amber', l: 'URS', v: stats.ursLots }, { c: 'bg-reject', l: 'Rejected', v: stats.rejectedLots }].map(({ c, l, v }) => (
                <span key={l} className="flex items-center gap-1.5 text-[11px] text-muted">
                  <i className={`h-2 w-2 rounded-full ${c}`} /> {l} <b className="text-ink font-bold">{v}</b>
                </span>
              ))}
            </div>
          </div>
        </StaggerItem>
        <StaggerItem className="h-full">
          <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 shadow-soft flex flex-col h-full">
            <p className="font-bold text-ink text-[14px] mb-3">Quality Trend</p>
            <div className="flex flex-1 items-center"><TrendLine data={trendData} xKey="day" yKey="avg" /></div>
          </div>
        </StaggerItem>
        <StaggerItem className="h-full">
          <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 shadow-soft flex flex-col h-full">
            <p className="font-bold text-ink text-[14px] mb-3">Defect Breakdown</p>
            <div className="flex flex-1 items-center"><DefectBars data={defectData} /></div>
          </div>
        </StaggerItem>
      </Stagger>

      {/* Recent certificates table */}
      <div className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(20,20,25,0.07)]">
          <div>
            <p className="font-bold text-ink">Recent Certificates</p>
            <p className="text-[12px] text-muted mt-0.5">{totalLots} lots graded</p>
          </div>
          <Link to="/quality/certificates"
            className="flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline transition">
            All certificates <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[rgba(20,20,25,0.02)]">
                {['Certificate', 'Grade', 'Score', 'Risk', 'Issued'].map(h => (
                  <th key={h} className="py-2.5 px-5 text-left text-[11px] font-bold uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((c, i) => (
                <tr key={c.id} className={`border-t border-[rgba(20,20,25,0.05)] transition hover:bg-[rgba(20,20,25,0.015)] ${i % 2 !== 0 ? 'bg-[rgba(20,20,25,0.01)]' : ''}`}>
                  <td className="py-3 px-5">
                    <Link to={`/certificate/${c.id}`} className="font-semibold text-forest hover:underline font-mono text-[12px]">{c.certificateNumber}</Link>
                  </td>
                  <td className="py-3 px-5"><GradeBadge grade={c.grade} /></td>
                  <td className="py-3 px-5 font-extrabold text-ink">{c.qualityScore}</td>
                  <td className="py-3 px-5"><RiskBadge level={c.riskLevel || 'LOW'} /></td>
                  <td className="py-3 px-5 text-muted text-[12px]">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-muted">No certificates yet — run a New Inspection to issue the first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
}
