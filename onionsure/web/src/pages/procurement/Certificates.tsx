import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Search, FileCheck2, Layers, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, GradeBadge, EmptyState, StatCard, ProgressBar } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_CERTIFICATES } from '../../lib/events';

export default function Certificates() {
  const nav = useNavigate();
  const { data, loading } = useLiveData<any[]>(
    () => api.getCertificates(),
    { events: EV_CERTIFICATES, pollMs: 20000 },
  );
  const [q, setQ] = React.useState('');

  const certs = data || [];
  const filtered = certs.filter((c) => (c.certificateNumber + c.grade).toLowerCase().includes(q.toLowerCase()));

  const total = certs.length;
  const avg = total ? Math.round(certs.reduce((a, c) => a + (Number(c.qualityScore) || 0), 0) / total) : 0;
  const gradeA = certs.filter((c) => c.grade === 'GRADE A').length;

  if (loading && !data) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-mint/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-mint/60" />)}</div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-mint/60" />)}</div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-5">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Quality &amp; Trust</div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl"><Award size={22} className="text-fresh" /> Quality Certificates</h1>
        <p className="mt-0.5 text-sm text-muted">Tamper-evident certificates issued for every graded lot.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Certificates Issued" value={<AnimatedNumber value={total} />} sub="this period" accent="forest" icon={FileCheck2} />
        <StatCard label="Average Quality" value={<><AnimatedNumber value={avg} /><span className="text-base text-muted">/100</span></>} sub="across all certs" accent="fresh" icon={Award} />
        <StatCard label="Grade A Certs" value={<AnimatedNumber value={gradeA} />} sub="premium quality" accent="fresh" icon={ShieldCheck} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9 max-w-xs" placeholder="Search certificate…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-xs text-muted">{filtered.length} of {total} shown</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No certificates found" hint="Run a New Inspection to generate one." />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {filtered.map((c) => (
            <StaggerItem key={c.id}>
              <Card className="flex h-full cursor-pointer flex-col p-4 transition-shadow hover:shadow-card" onClick={() => nav(`/certificate/${c.id}`)}>
                <div className="flex items-center justify-between">
                  <Badge tone="forest"><Award size={12} /> {c.certificateNumber}</Badge>
                  <GradeBadge grade={c.grade} />
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-muted">Quality Score</div>
                    <div className="text-3xl font-extrabold text-ink"><AnimatedNumber value={Number(c.qualityScore) || 0} /><span className="text-base text-muted">/100</span></div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <div>A {c.grade_a_percentage}%</div><div>URS {c.urs_percentage}%</div><div>Rej {c.rejected_percentage}%</div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <MiniBar label="Grade A" value={Number(c.grade_a_percentage) || 0} tone="forest" />
                  <MiniBar label="URS" value={Number(c.urs_percentage) || 0} tone="amber" />
                  <MiniBar label="Rejected" value={Number(c.rejected_percentage) || 0} tone="reject" />
                </div>

                {(c.lotNumber || c.procurementCenter) && (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted">
                    <Layers size={13} className="text-fresh" />
                    <span className="truncate">{[c.lotNumber, c.procurementCenter].filter(Boolean).join(' · ')}</span>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted">{new Date(c.createdAt).toLocaleString()}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-forest">View <ArrowRight size={13} /></span>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}

function MiniBar({ label, value, tone }: { label: string; value: number; tone: 'forest' | 'amber' | 'reject' }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-muted">{label}</span>
      <ProgressBar value={value} tone={tone} className="flex-1" />
      <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-ink">{value}%</span>
    </div>
  );
}
