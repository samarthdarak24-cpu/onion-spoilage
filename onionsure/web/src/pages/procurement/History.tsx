import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Search, ArrowRight, ClipboardList, Award, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api';
import { GradeBadge, EmptyState } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_INSPECTIONS } from '../../lib/events';
import { PageHeader, StatGrid, StatTile } from '../../components/PageHeader';

const GRADE_FILTERS = ['All', 'GRADE A', 'URS', 'REJECTED'] as const;
type GradeFilter = (typeof GRADE_FILTERS)[number];

export default function History() {
  const nav = useNavigate();
  const { data, loading, error } = useLiveData<any[]>(
    () => api.getInspections(),
    { events: EV_INSPECTIONS, pollMs: 15000 },
  );
  const [q, setQ]       = React.useState('');
  const [grade, setGrade] = React.useState<GradeFilter>('All');

  const items    = data || [];
  const filtered = items.filter((i) => {
    const matchQ = (i.certificateNumber + (i.lotNumber || '') + i.grade).toLowerCase().includes(q.toLowerCase());
    const matchG = grade === 'All' || i.grade === grade;
    return matchQ && matchG;
  });

  const total    = items.length;
  const avg      = total ? Math.round(items.reduce((a, i) => a + (Number(i.qualityScore) || 0), 0) / total) : 0;
  const gradeACt = items.filter((i) => i.grade === 'GRADE A').length;
  const rejected = items.filter((i) => i.grade === 'REJECTED').length;

  if (loading && !data) return (
    <PageTransition className="space-y-5">
      <div className="h-28 animate-pulse rounded-2xl bg-mint/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-mint/60" />)}</div>
      <div className="h-72 animate-pulse rounded-2xl bg-mint/60" />
    </PageTransition>
  );

  return (
    <PageTransition className="space-y-5">
      <PageHeader icon={<HistoryIcon size={22} />} eyebrow="Records" title="Inspection History" subtitle="Every graded batch, certificate and score — live from the backend." />

      <StatGrid cols={4}>
        <StatTile label="Total Inspections" value={<AnimatedNumber value={total} />} sub="all roles" icon={ClipboardList} accent="green" />
        <StatTile label="Avg Score" value={<AnimatedNumber value={avg} />} sub="across all lots" icon={Award} accent="blue" suffix="/100" />
        <StatTile label="Grade A" value={<AnimatedNumber value={gradeACt} />} sub="premium lots" icon={CheckCircle2} accent="green" />
        <StatTile label="Rejected" value={<AnimatedNumber value={rejected} />} sub="did not pass" icon={ShieldAlert} accent="red" />
      </StatGrid>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {GRADE_FILTERS.map((g) => (
            <button key={g} onClick={() => setGrade(g)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${grade === g ? 'bg-forest text-white shadow-soft' : 'border border-border bg-surface text-muted hover:text-ink'}`}>
              {g}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9 w-64" placeholder="Search certificate or lot…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {error && <div className="rounded-xl border border-reject/20 bg-reject/5 px-4 py-3 text-sm text-reject">{error}</div>}

      {filtered.length === 0 ? (
        <EmptyState title={items.length === 0 ? 'No inspections yet' : 'No matches'} hint={items.length === 0 ? 'Run a New Inspection to record the first batch.' : 'Try a different search or grade filter.'} />
      ) : (
        <div className="rounded-2xl border border-border bg-surface shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted bg-bg">
                  {['Certificate', 'Lot', 'Grade', 'Score', 'Vision', 'Gas', 'Date', ''].map(h => (
                    <th key={h} className="py-3 px-4 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((i, idx) => (
                  <tr key={i.id} className={`border-t border-border transition-colors hover:bg-mint/20 ${idx % 2 === 0 ? '' : 'bg-bg/40'}`}>
                    <td className="py-3 px-4 font-medium text-forest">{i.certificateNumber}</td>
                    <td className="py-3 px-4 text-muted font-mono text-xs">{i.lotNumber || '—'}</td>
                    <td className="py-3 px-4"><GradeBadge grade={i.grade} /></td>
                    <td className="py-3 px-4 font-bold text-ink"><AnimatedNumber value={Number(i.qualityScore) || 0} /></td>
                    <td className="py-3 px-4 text-muted">{i.visionScore ?? '—'}</td>
                    <td className="py-3 px-4 text-muted">{i.gasScore ?? '—'}</td>
                    <td className="py-3 px-4 text-muted">{new Date(i.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <button className="inline-flex items-center gap-1 font-semibold text-forest hover:underline text-xs" onClick={() => nav(`/certificate/${i.id}`)}>
                        View <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border bg-bg text-xs text-muted">
            Showing {filtered.length} of {total} inspections
          </div>
        </div>
      )}
    </PageTransition>
  );
}
