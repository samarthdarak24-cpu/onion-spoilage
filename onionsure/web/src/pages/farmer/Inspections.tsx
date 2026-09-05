import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ScanLine, Wind, ArrowRight, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, GradeBadge, EmptyState, StatCard } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_INSPECTIONS } from '../../lib/events';

export default function FarmerInspections() {
  const nav = useNavigate();
  const { data, loading, error } = useLiveData<any[]>(
    () => api.getInspections(),
    { events: EV_INSPECTIONS, pollMs: 15000 },
  );
  const [q, setQ] = React.useState('');

  const items = data || [];
  const filtered = items.filter((i) =>
    (i.certificateNumber + (i.lotNumber || '') + i.grade).toLowerCase().includes(q.toLowerCase()));

  if (loading && !data) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-mint/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-mint/60" />)}</div>
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-mint/60" />)}</div>
      </PageTransition>
    );
  }

  const avg = items.length ? Math.round(items.reduce((a, i) => a + (Number(i.qualityScore) || 0), 0) / items.length) : 0;
  const gradeA = items.filter((i) => i.grade === 'GRADE A').length;

  return (
    <PageTransition className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">My Farm</div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl">
            <History size={22} className="text-fresh" /> Inspection Results
          </h1>
          <p className="mt-0.5 text-sm text-muted">{items.length} inspections recorded for your lots.</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9 max-w-xs" placeholder="Search lot / certificate…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Inspections" value={<AnimatedNumber value={items.length} />} sub="lots graded" accent="forest" icon={History} />
        <StatCard label="Average Score" value={<><AnimatedNumber value={avg} /><span className="text-base text-muted">/100</span></>} sub="across my lots" accent="fresh" icon={ScanLine} />
        <StatCard label="Grade A Lots" value={<AnimatedNumber value={gradeA} />} sub="premium quality" accent="fresh" icon={Wind} />
        <StatCard label="Showing" value={<AnimatedNumber value={filtered.length} />} sub="matching search" accent="forest" icon={Search} />
      </div>

      {error && <div className="rounded-xl border border-reject/20 bg-reject/5 px-4 py-3 text-sm text-reject">{error}</div>}

      {filtered.length === 0 ? (
        <EmptyState title="No inspections yet" hint="When a procurement center inspects your lot, the result will appear here with a digital certificate." />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2" gap={0.05}>
          {filtered.map((i) => (
            <StaggerItem key={i.id}>
              <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-muted">Lot {i.lotNumber || '—'}</div>
                    <div className="truncate font-bold text-forest">{i.certificateNumber}</div>
                  </div>
                  <GradeBadge grade={i.grade} />
                </div>
                <div className="mt-4 grid flex-1 grid-cols-3 gap-3 text-center">
                  <Metric icon={ScanLine} label="Vision" value={i.visionScore ?? '—'} />
                  <Metric icon={Wind} label="Gas+Env" value={i.gasScore ?? '—'} />
                  <Metric icon={ArrowRight} label="Final" value={i.qualityScore} />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted">{new Date(i.createdAt).toLocaleDateString()}</span>
                  <button className="inline-flex items-center gap-1 font-semibold text-forest hover:underline" onClick={() => nav(`/certificate/${i.id}`)}>
                    View certificate <ArrowRight size={14} />
                  </button>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl bg-mint/60 py-2">
      <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted"><Icon size={13} /> {label}</div>
      <div className="text-lg font-extrabold text-forest"><AnimatedNumber value={Number(value) || 0} /></div>
    </div>
  );
}
