import React from 'react';
import { BarChart3, Boxes, TrendingUp, PieChart, Bug } from 'lucide-react';
import { api } from '../../lib/api';
import { EmptyState } from '../../components/ui';
import { Donut, TrendLine, DefectBars } from '../../components/charts';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_ANALYTICS } from '../../lib/events';
import { PageHeader, StatGrid, StatTile } from '../../components/PageHeader';

export default function Analytics() {
  const { data, loading } = useLiveData<any>(
    async () => {
      const [quality, defects] = await Promise.all([api.analyticsQuality(), api.analyticsDefects()]);
      return { quality, defects };
    },
    { events: EV_ANALYTICS, pollMs: 20000 },
  );

  if (loading && !data) return (
    <PageTransition className="space-y-5">
      <div className="h-28 animate-pulse rounded-2xl bg-mint/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-mint/60" />)}</div>
      <div className="grid gap-5 lg:grid-cols-2">{[0,1,2,3].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-mint/60" />)}</div>
    </PageTransition>
  );

  const { quality, defects } = data;
  const gradeEntries = Object.entries(quality.gradeDistribution || {}) as [string, number][];
  const totalLots    = gradeEntries.reduce((a, [, v]) => a + (v as number), 0) || 1;
  const gradeA       = (quality.gradeDistribution?.['GRADE A'] as number) || 0;
  const gradeAPct    = Math.round((gradeA / totalLots) * 100);
  const avgScore     = quality.qualityByCenter?.length
    ? Math.round(quality.qualityByCenter.reduce((a: number, c: any) => a + (c.avg || 0), 0) / quality.qualityByCenter.length)
    : 0;
  const totalDefects = (Object.values(defects || {}) as number[]).reduce((a, v) => a + (v || 0), 0);
  const gradeData    = gradeEntries.map(([k, v]) => ({ name: k, value: v as number }));
  const defectData   = Object.entries(defects || {}).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v as number }));
  const trendData    = (quality.qualityTrend || []).map((t: any) => ({ day: t.day.slice(5), avg: t.avg }));

  if (totalLots <= 1 && totalDefects === 0) return (
    <PageTransition className="space-y-5">
      <PageHeader icon={<BarChart3 size={22} />} eyebrow="Quality & Trust" title="Quality Analytics" subtitle="Aggregated intelligence across all inspections." />
      <EmptyState title="No analytics yet" hint="Inspect a few lots to populate quality trends and defect insights." />
    </PageTransition>
  );

  return (
    <PageTransition className="space-y-5">
      <PageHeader icon={<BarChart3 size={22} />} eyebrow="Quality & Trust" title="Quality Analytics" subtitle="Aggregated intelligence across all inspections." />

      <StatGrid cols={4}>
        <StatTile label="Total Lots" value={<AnimatedNumber value={totalLots} />} sub="graded to date" icon={Boxes} accent="green" />
        <StatTile label="Avg Score" value={<AnimatedNumber value={avgScore} />} sub="across centers" icon={TrendingUp} accent="blue" suffix="/100" />
        <StatTile label="Grade A Rate" value={<AnimatedNumber value={gradeAPct} />} sub={`${gradeA} premium lots`} icon={PieChart} accent="green" suffix="%" />
        <StatTile label="Defects Logged" value={<AnimatedNumber value={totalDefects} />} sub="across all batches" icon={Bug} accent="amber" />
      </StatGrid>

      <Stagger className="grid gap-5 lg:grid-cols-2" gap={0.06}>
        <StaggerItem className="h-full">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft flex flex-col h-full">
            <p className="font-bold text-ink text-sm mb-3">Grade Distribution</p>
            <div className="flex flex-1 items-center"><Donut data={gradeData} /></div>
          </div>
        </StaggerItem>
        <StaggerItem className="h-full">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft flex flex-col h-full">
            <p className="font-bold text-ink text-sm mb-3">Quality by Center</p>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="pb-2 font-semibold">Center</th>
                    <th className="pb-2 font-semibold">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(quality.qualityByCenter || []).map((c: any) => (
                    <tr key={c.center} className="border-b border-border last:border-0">
                      <td className="py-2 text-ink">{c.center}</td>
                      <td className="py-2">
                        <span className={`font-bold ${c.avg >= 85 ? 'text-forest' : c.avg >= 65 ? 'text-amber-600' : 'text-reject'}`}>{c.avg}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </StaggerItem>
        <StaggerItem className="h-full lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft flex flex-col h-full">
            <p className="font-bold text-ink text-sm mb-3">Quality Trend (7 Days)</p>
            <div className="flex flex-1 items-center"><TrendLine data={trendData} xKey="day" yKey="avg" /></div>
          </div>
        </StaggerItem>
        <StaggerItem className="h-full lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft flex flex-col h-full">
            <p className="font-bold text-ink text-sm mb-3">Defect Distribution</p>
            <div className="flex flex-1 items-center"><DefectBars data={defectData} /></div>
          </div>
        </StaggerItem>
      </Stagger>
    </PageTransition>
  );
}
