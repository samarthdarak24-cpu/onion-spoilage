import React from 'react';
import { BarChart3, Boxes, TrendingUp, PieChart, Bug } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, StatCard, EmptyState } from '../../components/ui';
import { Donut, TrendLine, DefectBars } from '../../components/charts';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_ANALYTICS } from '../../lib/events';

export default function Analytics() {
  const { data, loading } = useLiveData<any>(
    async () => {
      const [quality, defects] = await Promise.all([api.analyticsQuality(), api.analyticsDefects()]);
      return { quality, defects };
    },
    { events: EV_ANALYTICS, pollMs: 20000 },
  );

  if (loading && !data) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-mint/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-mint/60" />)}</div>
        <div className="grid gap-5 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-mint/60" />)}</div>
      </PageTransition>
    );
  }

  const { quality, defects } = data;
  const gradeEntries = Object.entries(quality.gradeDistribution || {}) as [string, number][];
  const totalLots = gradeEntries.reduce((a, [, v]) => a + (v as number), 0) || 1;
  const gradeA = (quality.gradeDistribution?.['GRADE A'] as number) || 0;
  const gradeAPct = Math.round((gradeA / totalLots) * 100);
  const avgScore = quality.qualityByCenter?.length
    ? Math.round(quality.qualityByCenter.reduce((a: number, c: any) => a + (c.avg || 0), 0) / quality.qualityByCenter.length)
    : 0;
  const totalDefects = (Object.values(defects || {}) as number[]).reduce((a, v) => a + (v || 0), 0);

  const gradeData = gradeEntries.map(([k, v]) => ({ name: k, value: v as number }));
  const defectData = Object.entries(defects || {}).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v as number }));
  const trendData = (quality.qualityTrend || []).map((t: any) => ({ day: t.day.slice(5), avg: t.avg }));

  if (totalLots === 0 && totalDefects === 0) {
    return (
      <PageTransition className="space-y-5">
        <Header />
        <EmptyState title="No analytics yet" hint="Inspect a few lots to populate quality trends and defect insights." />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-5">
      <Header />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Lots" value={<AnimatedNumber value={totalLots} />} sub="graded to date" accent="forest" icon={Boxes} />
        <StatCard label="Average Score" value={<><AnimatedNumber value={avgScore} /><span className="text-base text-muted">/100</span></>} sub="across centers" accent="fresh" icon={TrendingUp} />
        <StatCard label="Grade A Rate" value={<><AnimatedNumber value={gradeAPct} /><span className="text-base text-muted">%</span></>} sub={`${gradeA} premium lots`} accent="fresh" icon={PieChart} />
        <StatCard label="Defects Logged" value={<AnimatedNumber value={totalDefects} />} sub="across all batches" accent="amber" icon={Bug} />
      </div>

      <Stagger className="grid gap-5 lg:grid-cols-2" gap={0.06}>
        <StaggerItem className="h-full">
          <Card className="flex h-full flex-col p-4">
            <div className="mb-2 font-bold text-ink">Grade Distribution</div>
            <div className="flex flex-1 items-center"><Donut data={gradeData} /></div>
          </Card>
        </StaggerItem>
        <StaggerItem className="h-full">
          <Card className="flex h-full flex-col p-4">
            <div className="mb-2 font-bold text-ink">Quality by Center</div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted"><th className="pb-2 font-semibold">Center</th><th className="pb-2 font-semibold">Avg Score</th></tr></thead>
                <tbody>{quality.qualityByCenter.map((c: any) => (<tr key={c.center} className="border-b border-border last:border-0"><td className="py-1.5 text-ink">{c.center}</td><td className="py-1.5 font-bold text-forest">{c.avg}</td></tr>))}</tbody>
              </table>
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem className="h-full lg:col-span-2">
          <Card className="flex h-full flex-col p-4">
            <div className="mb-2 font-bold text-ink">Quality Trend</div>
            <div className="flex flex-1 items-center"><TrendLine data={trendData} xKey="day" yKey="avg" /></div>
          </Card>
        </StaggerItem>
        <StaggerItem className="h-full lg:col-span-2">
          <Card className="flex h-full flex-col p-4">
            <div className="mb-2 font-bold text-ink">Defect Distribution</div>
            <div className="flex flex-1 items-center"><DefectBars data={defectData} /></div>
          </Card>
        </StaggerItem>
      </Stagger>
    </PageTransition>
  );
}

function Header() {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Quality &amp; Trust</div>
      <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl"><BarChart3 size={22} className="text-fresh" /> Quality Analytics</h1>
      <p className="mt-0.5 text-sm text-muted">Aggregated intelligence across all inspections.</p>
    </div>
  );
}
