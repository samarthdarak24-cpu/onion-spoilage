import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, Tractor, ClipboardList, Award, TrendingUp, PlusCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, StatCard, GradeBadge, EmptyState } from '../../components/ui';
import { Donut } from '../../components/charts';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_DASHBOARD } from '../../lib/events';

export default function FpoDashboard() {
  const nav = useNavigate();
  const { data, loading } = useLiveData<any>(
    async () => {
      const [stats, certs, farmers] = await Promise.all([
        api.analyticsDashboard(), api.getCertificates(), api.getFarmers(),
      ]);
      return { stats, certs, farmers };
    },
    { events: EV_DASHBOARD, pollMs: 15000 },
  );

  if (loading && !data) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-mint/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-mint/60" />)}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-2xl bg-mint/60" />
          <div className="h-64 animate-pulse rounded-2xl bg-mint/60 lg:col-span-2" />
        </div>
      </PageTransition>
    );
  }

  const { stats, certs, farmers } = data;
  const gradeData = [
    { name: 'Grade A', value: stats.gradeALots },
    { name: 'URS', value: stats.ursLots },
    { name: 'Rejected', value: stats.rejectedLots },
  ];
  const recent = certs.slice(0, 8);

  return (
    <PageTransition className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest text-white"><Sprout size={24} /></div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">FPO</div>
            <h1 className="text-xl font-extrabold text-ink md:text-2xl">FPO Quality Overview</h1>
            <p className="mt-0.5 text-sm text-muted">Cooperative grading intelligence.</p>
          </div>
        </div>
        <button onClick={() => nav('/fpo/inspection')} className="btn-primary py-2 text-sm"><PlusCircle size={15} /> Inspect Lot</button>
      </div>

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem className="h-full">
          <StatCard label="Registered Farmers" value={<AnimatedNumber value={farmers.length} />} sub="in your cooperative" accent="forest" icon={Tractor} />
        </StaggerItem>
        <StaggerItem className="h-full">
          <StatCard label="Inspections" value={<AnimatedNumber value={stats.totalInspections} />} sub="lots graded to date" accent="forest" icon={ClipboardList} />
        </StaggerItem>
        <StaggerItem className="h-full">
          <StatCard label="Grade A Lots" value={<AnimatedNumber value={stats.gradeALots} />} sub="premium quality" accent="fresh" icon={Award} />
        </StaggerItem>
        <StaggerItem className="h-full">
          <StatCard label="Avg Quality" value={<><AnimatedNumber value={stats.averageQualityScore} /><span className="text-base text-muted">/100</span></>} sub="across your lots" accent="fresh" icon={TrendingUp} />
        </StaggerItem>
      </Stagger>

      <Stagger className="grid gap-5 lg:grid-cols-3" gap={0.06}>
        <StaggerItem className="h-full">
          <Card className="flex h-full flex-col p-4">
            <div className="mb-2 font-bold text-ink">Grade Distribution</div>
            <div className="flex flex-1 items-center"><Donut data={gradeData} /></div>
          </Card>
        </StaggerItem>
        <StaggerItem className="h-full lg:col-span-2">
          <Card className="flex h-full flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold text-ink">Incoming Certificates</div>
              <button className="text-sm font-semibold text-forest hover:underline" onClick={() => nav('/quality/new-inspection')}>Register new lot →</button>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-semibold">Certificate</th><th className="pb-2 pr-3 font-semibold">Grade</th>
                  <th className="pb-2 pr-3 font-semibold">Score</th><th className="pb-2 font-semibold">A%</th>
                </tr></thead>
                <tbody>
                  {recent.map((c: any) => (
                    <tr key={c.id} className="border-b border-border transition-colors last:border-0 hover:bg-mint/40">
                      <td className="py-2.5 pr-3 font-medium text-forest">{c.certificateNumber}</td>
                      <td className="py-2.5 pr-3"><GradeBadge grade={c.grade} /></td>
                      <td className="py-2.5 pr-3 font-bold text-ink">{c.qualityScore}</td>
                      <td className="py-2.5 text-muted">{c.grade_a_percentage}%</td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr><td colSpan={4} className="py-6">
                      <EmptyState title="No certificates yet" hint="Register a lot to start grading and issue certificates." />
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </StaggerItem>
      </Stagger>
    </PageTransition>
  );
}
