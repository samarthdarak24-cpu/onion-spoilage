import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Search, ArrowRight, ClipboardList, Award, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, GradeBadge, EmptyState, StatCard } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_INSPECTIONS } from '../../lib/events';

const GRADE_FILTERS = ['All', 'GRADE A', 'URS', 'REJECTED'] as const;
type GradeFilter = (typeof GRADE_FILTERS)[number];

export default function History() {
  const nav = useNavigate();
  const { data, loading, error } = useLiveData<any[]>(
    () => api.getInspections(),
    { events: EV_INSPECTIONS, pollMs: 15000 },
  );
  const [q, setQ] = React.useState('');
  const [grade, setGrade] = React.useState<GradeFilter>('All');

  const items = data || [];
  const filtered = items.filter((i) => {
    const matchQ = (i.certificateNumber + (i.lotNumber || '') + i.grade).toLowerCase().includes(q.toLowerCase());
    const matchG = grade === 'All' || i.grade === grade;
    return matchQ && matchG;
  });

  const total = items.length;
  const avg = total ? Math.round(items.reduce((a, i) => a + (Number(i.qualityScore) || 0), 0) / total) : 0;
  const gradeA = items.filter((i) => i.grade === 'GRADE A').length;
  const rejected = items.filter((i) => i.grade === 'REJECTED').length;

  if (loading && !data) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-mint/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-mint/60" />)}</div>
        <div className="h-72 animate-pulse rounded-2xl bg-mint/60" />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-5">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Records</div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl"><HistoryIcon size={22} className="text-fresh" /> Inspection History</h1>
        <p className="mt-0.5 text-sm text-muted">Every graded batch, certificate and score — live from the backend.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Inspections" value={<AnimatedNumber value={total} />} sub="all roles" accent="forest" icon={ClipboardList} />
        <StatCard label="Average Score" value={<><AnimatedNumber value={avg} /><span className="text-base text-muted">/100</span></>} sub="across all lots" accent="fresh" icon={Award} />
        <StatCard label="Grade A" value={<AnimatedNumber value={gradeA} />} sub="premium lots" accent="fresh" icon={CheckCircle2} />
        <StatCard label="Rejected" value={<AnimatedNumber value={rejected} />} sub="did not pass" accent="reject" icon={ShieldAlert} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {GRADE_FILTERS.map((g) => (
            <button key={g} onClick={() => setGrade(g)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${grade === g ? 'bg-forest text-white' : 'border border-border bg-surface text-muted hover:text-ink'}`}>
              {g}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9 max-w-xs" placeholder="Search certificate or lot…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {error && <div className="rounded-xl border border-reject/20 bg-reject/5 px-4 py-3 text-sm text-reject">{error}</div>}

      {filtered.length === 0 ? (
        <EmptyState title={items.length === 0 ? 'No inspections yet' : 'No matches'} hint={items.length === 0 ? 'Run a New Inspection to record the first batch.' : 'Try a different search or grade filter.'} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="py-2 pr-3 font-semibold">Certificate</th><th className="py-2 pr-3 font-semibold">Lot</th>
              <th className="py-2 pr-3 font-semibold">Grade</th><th className="py-2 pr-3 font-semibold">Score</th>
              <th className="py-2 pr-3 font-semibold">Vision</th><th className="py-2 pr-3 font-semibold">Gas</th>
              <th className="py-2 pr-3 font-semibold">Date</th><th className="py-2 font-semibold"></th>
            </tr></thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b border-border transition-colors last:border-0 hover:bg-mint/40">
                  <td className="py-2.5 pr-3 font-medium text-forest">{i.certificateNumber}</td>
                  <td className="py-2.5 pr-3 text-ink">{i.lotNumber || '—'}</td>
                  <td className="py-2.5 pr-3"><GradeBadge grade={i.grade} /></td>
                  <td className="py-2.5 pr-3 font-bold text-ink"><AnimatedNumber value={Number(i.qualityScore) || 0} /></td>
                  <td className="py-2.5 pr-3 text-muted">{i.visionScore ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-muted">{i.gasScore ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-muted">{new Date(i.createdAt).toLocaleDateString()}</td>
                  <td className="py-2.5 pr-3 text-right">
                    <button className="inline-flex items-center gap-1 font-semibold text-forest hover:underline" onClick={() => nav(`/certificate/${i.id}`)}>
                      View <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageTransition>
  );
}
