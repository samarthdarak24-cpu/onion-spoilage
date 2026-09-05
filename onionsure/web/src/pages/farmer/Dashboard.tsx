import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor, Award, Leaf, QrCode, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, GradeBadge, ProgressBar, StatCard, EmptyState } from '../../components/ui';
import { Donut } from '../../components/charts';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_CERTIFICATES } from '../../lib/events';

export default function FarmerDashboard() {
  const nav = useNavigate();
  const { data, loading } = useLiveData<any[]>(
    () => api.getCertificates(),
    { events: EV_CERTIFICATES, pollMs: 20000 },
  );

  const certs = data || [];

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

  const gradeCounts = { 'GRADE A': 0, URS: 0, REJECTED: 0 };
  certs.forEach((c) => { gradeCounts[c.grade as keyof typeof gradeCounts]++; });
  const total = certs.length || 1;
  const aPct = Math.round((gradeCounts['GRADE A'] / total) * 100);
  const ursPct = Math.round((gradeCounts.URS / total) * 100);
  const rejPct = Math.round((gradeCounts.REJECTED / total) * 100);
  const avg = certs.length ? Math.round(certs.reduce((a, c) => a + c.qualityScore, 0) / certs.length) : 0;
  const gradeData = Object.entries(gradeCounts).map(([k, v]) => ({ name: k, value: v }));

  return (
    <PageTransition className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest text-white"><Tractor size={24} /></div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Farmer</div>
            <h1 className="text-xl font-extrabold text-ink md:text-2xl">My Quality Intelligence</h1>
            <p className="mt-0.5 text-sm text-muted">Transparent evidence for every lot you grade.</p>
          </div>
        </div>
        <button onClick={() => nav('/farmer/inspection')} className="btn-primary py-2 text-sm">
          <Leaf size={15} /> New Inspection
        </button>
      </div>

      <Card className="bg-gradient-to-br from-mint to-white">
        <div className="flex items-center gap-2 text-forest"><Leaf size={18} /><span className="font-bold">My Onion Lot</span></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><div className="flex justify-between text-sm"><span className="text-muted">Grade A</span><span className="font-semibold text-ink">{aPct}%</span></div><ProgressBar value={aPct} tone="forest" /></div>
          <div><div className="flex justify-between text-sm"><span className="text-muted">URS</span><span className="font-semibold text-ink">{ursPct}%</span></div><ProgressBar value={ursPct} tone="amber" /></div>
          <div><div className="flex justify-between text-sm"><span className="text-muted">Rejected</span><span className="font-semibold text-ink">{rejPct}%</span></div><ProgressBar value={rejPct} tone="reject" /></div>
        </div>
      </Card>

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem className="h-full"><StatCard label="My Certificates" value={<AnimatedNumber value={certs.length} />} sub="issued to date" accent="forest" icon={Award} /></StaggerItem>
        <StaggerItem className="h-full"><StatCard label="Avg Quality" value={<><AnimatedNumber value={avg} /><span className="text-base text-muted">/100</span></>} sub="across my lots" accent="fresh" icon={TrendingUp} /></StaggerItem>
        <StaggerItem className="h-full"><StatCard label="Grade A Lots" value={<AnimatedNumber value={gradeCounts['GRADE A']} />} sub="premium quality" accent="fresh" icon={Award} /></StaggerItem>
        <StaggerItem className="h-full"><StatCard label="Rejected Lots" value={<AnimatedNumber value={gradeCounts.REJECTED} />} sub="did not pass" accent="reject" icon={QrCode} /></StaggerItem>
      </Stagger>

      <Stagger className="grid gap-5 lg:grid-cols-3" gap={0.06}>
        <StaggerItem className="h-full">
          <Card className="flex h-full flex-col p-4">
            <div className="mb-2 font-bold text-ink">Grade History</div>
            <div className="flex flex-1 items-center"><Donut data={gradeData} /></div>
          </Card>
        </StaggerItem>
        <StaggerItem className="h-full lg:col-span-2">
          <Card className="flex h-full flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold text-ink">Quality Certificates</div>
              <button className="text-sm font-semibold text-forest hover:underline" onClick={() => nav('/quality/certificates')}>All certificates →</button>
            </div>
            <div className="flex-1 space-y-2">
              {certs.slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-mint/40 px-3 py-2 text-sm">
                  <span className="font-medium text-forest">{c.certificateNumber}</span>
                  <span className="flex items-center gap-3">
                    <GradeBadge grade={c.grade} />
                    <span className="font-bold text-ink">{c.qualityScore}</span>
                    <button className="text-forest hover:underline" onClick={() => nav(`/certificate/${c.id}`)}>Open</button>
                  </span>
                </div>
              ))}
              {certs.length === 0 && (
                <EmptyState title="No certificates yet" hint="Your lots will appear here after inspection." />
              )}
            </div>
          </Card>
        </StaggerItem>
      </Stagger>
    </PageTransition>
  );
}
