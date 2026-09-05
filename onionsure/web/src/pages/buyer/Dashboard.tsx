import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Search, QrCode, Filter, Award, TrendingUp, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, GradeBadge, StatCard, EmptyState } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_CERTIFICATES } from '../../lib/events';

const GRADES = ['ALL', 'GRADE A', 'URS', 'REJECTED'] as const;

export default function BuyerDashboard() {
  const nav = useNavigate();
  const { data, loading } = useLiveData<any[]>(
    () => api.getCertificates(),
    { events: EV_CERTIFICATES, pollMs: 20000 },
  );
  const [grade, setGrade] = React.useState<string>('ALL');
  const [q, setQ] = React.useState('');

  const certs = data || [];
  const filtered = certs.filter((c) =>
    (grade === 'ALL' || c.grade === grade) &&
    (c.certificateNumber + c.grade).toLowerCase().includes(q.toLowerCase())
  );

  if (loading && !data) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-mint/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-mint/60" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-mint/60" />)}</div>
      </PageTransition>
    );
  }

  const avg = certs.length ? Math.round(certs.reduce((a, c) => a + (Number(c.qualityScore) || 0), 0) / certs.length) : 0;
  const gradeA = certs.filter((c) => c.grade === 'GRADE A').length;
  const rejected = certs.filter((c) => c.grade === 'REJECTED').length;

  return (
    <PageTransition className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest text-white"><Store size={24} /></div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Buyer</div>
            <h1 className="text-xl font-extrabold text-ink md:text-2xl">Verified Lots</h1>
            <p className="mt-0.5 text-sm text-muted">Source with confidence — every lot is digitally documented.</p>
          </div>
        </div>
      </div>

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem className="h-full"><StatCard label="Verified Lots" value={<AnimatedNumber value={certs.length} />} sub="available to source" accent="forest" icon={ShieldCheck} /></StaggerItem>
        <StaggerItem className="h-full"><StatCard label="Avg Quality" value={<><AnimatedNumber value={avg} /><span className="text-base text-muted">/100</span></>} sub="across all lots" accent="fresh" icon={TrendingUp} /></StaggerItem>
        <StaggerItem className="h-full"><StatCard label="Grade A Lots" value={<AnimatedNumber value={gradeA} />} sub="premium quality" accent="fresh" icon={Award} /></StaggerItem>
        <StaggerItem className="h-full"><StatCard label="Rejected Lots" value={<AnimatedNumber value={rejected} />} sub="did not pass" accent="reject" icon={QrCode} /></StaggerItem>
      </Stagger>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search certificates…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2"><Filter size={16} className="text-muted" />
          {GRADES.map((g) => (
            <button key={g} onClick={() => setGrade(g)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${grade === g ? 'bg-forest text-white' : 'border border-border bg-surface text-muted hover:text-ink'}`}>{g}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No lots match your filters" hint="Try a different search term or grade filter." />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {filtered.map((c) => (
            <StaggerItem key={c.id} className="h-full">
              <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-card">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">{c.certificateNumber}</span>
                  <GradeBadge grade={c.grade} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div><div className="text-xs text-muted">Quality Score</div><div className="text-3xl font-extrabold text-ink"><AnimatedNumber value={Number(c.qualityScore) || 0} /><span className="text-base text-muted">/100</span></div></div>
                  <div className="text-right text-xs text-muted">A {c.grade_a_percentage}% · URS {c.urs_percentage}% · Rej {c.rejected_percentage}%</div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => nav(`/certificate/${c.id}`)}>View</button>
                  <button className="btn-primary flex-1 py-2 text-sm" onClick={() => nav(`/verify/${c.certificateNumber}`)}><QrCode size={15} /> Scan QR</button>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}
