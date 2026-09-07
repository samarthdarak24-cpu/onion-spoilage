import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ScanLine, Wind, ArrowRight, Search, FileText, Package, Award, Filter, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { GradeBadge, EmptyState } from '../../components/ui';
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
  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Active' | 'Inspected' | 'Completed' | 'Disputed' | 'Reassessment'>('All');

  const items = data || [];
  const filtered = items.filter((i) => {
    const matchQ = (i.certificateNumber + (i.lotNumber || '') + (i.grade || '')).toLowerCase().includes(q.toLowerCase());
    if (statusFilter === 'All') return matchQ;
    if (statusFilter === 'Disputed') return matchQ && (i.status === 'disputed' || i.disputeStatus);
    if (statusFilter === 'Reassessment') return matchQ && (i.isReassessment || i.mode === 'REASSESSMENT');
    if (statusFilter === 'Completed') return matchQ && (i.status === 'completed' || i.certificateNumber);
    if (statusFilter === 'Inspected') return matchQ && (i.status === 'analyzed' || i.grade);
    if (statusFilter === 'Active') return matchQ && (i.status === 'in_progress' || i.status === 'registered');
    return matchQ;
  });

  if (loading && !data) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-36 animate-pulse rounded-2xl bg-forest/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-[rgba(20,20,25,0.05)]" />)}</div>
        <div className="grid gap-4 md:grid-cols-2">{[0,1,2,3].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-[rgba(20,20,25,0.05)]" />)}</div>
      </PageTransition>
    );
  }

  const avg    = items.length ? Math.round(items.reduce((a, i) => a + (Number(i.qualityScore) || 0), 0) / items.length) : 0;
  const gradeA = items.filter((i) => i.grade === 'GRADE A').length;

  const STATUS_TABS: ('All' | 'Active' | 'Inspected' | 'Completed' | 'Disputed' | 'Reassessment')[] = [
    'All', 'Active', 'Inspected', 'Completed', 'Disputed', 'Reassessment',
  ];
  const tabCounts: Record<string, number> = {
    All:          items.length,
    Active:       items.filter((i) => i.status === 'in_progress' || i.status === 'registered').length,
    Inspected:    items.filter((i) => i.status === 'analyzed' || i.grade).length,
    Completed:    items.filter((i) => i.status === 'completed' || i.certificateNumber).length,
    Disputed:     items.filter((i) => i.status === 'disputed' || i.disputeStatus).length,
    Reassessment: items.filter((i) => i.isReassessment || i.mode === 'REASSESSMENT').length,
  };

  return (
    <PageTransition className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{
          background: 'linear-gradient(135deg, #0B5D3B 0%, #0d6b44 45%, #06452C 100%)',
          boxShadow: '0 8px 32px rgba(11,93,59,0.28)',
        }}
      >
        <div className="pointer-events-none absolute -right-14 -top-14 h-60 w-60 rounded-full bg-white/[0.06]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 border border-white/20">
                <History size={17} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200/70">My Farm</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">My Lots</h1>
            <p className="mt-0.5 text-[13px] text-emerald-100/75">Track all your submitted & inspected lots in one place.</p>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              className="rounded-xl border border-white/20 bg-white/10 pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/45 backdrop-blur-sm outline-none focus:border-white/50 focus:ring-1 focus:ring-white/25 w-64"
              placeholder="Search lot or certificate…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Lots',    value: items.length,     icon: Package, grad: 'from-forest to-[#0e6b44]', ring: 'bg-forest/10 text-forest' },
          { label: 'Average Score', value: avg,              icon: ScanLine, grad: 'from-sb-500 to-sb-700', ring: 'bg-sb-100 text-sb-700', suffix: '/100' },
          { label: 'Grade A Lots',  value: gradeA,           icon: Award,   grad: 'from-amber-400 to-amber-600', ring: 'bg-amber-50 text-amber-600' },
          { label: 'Showing Now',   value: filtered.length,  icon: Filter,  grad: 'from-rose-400 to-reject', ring: 'bg-rose-50 text-reject' },
        ].map((s) => (
          <StaggerItem key={s.label}>
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="relative overflow-hidden rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5"
              style={{ boxShadow: '0 1px 3px rgba(20,20,25,0.04), 0 8px 24px rgba(20,20,25,0.05)' }}
            >
              <div className={`pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.08] ${s.grad}`} />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{s.label}</span>
                <span className={`rounded-xl p-2 ${s.ring}`}><s.icon size={15} /></span>
              </div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-[30px] font-extrabold text-ink leading-none tracking-tight"><AnimatedNumber value={s.value} /></span>
                {(s as any).suffix && <span className="mb-0.5 text-[14px] font-semibold text-muted">{(s as any).suffix}</span>}
              </div>
            </motion.div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all duration-150 ${
              statusFilter === tab
                ? 'bg-forest text-white shadow-[0_3px_10px_rgba(11,93,59,0.22)]'
                : 'border border-[rgba(20,20,25,0.10)] bg-white text-muted hover:text-ink hover:bg-bg'
            }`}
          >
            {tab}
            {tabCounts[tab] > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${statusFilter === tab ? 'bg-white/20 text-white' : 'bg-[rgba(20,20,25,0.07)] text-muted'}`}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-reject/20 bg-reject/5 px-4 py-3 text-sm font-medium text-reject">{error}</div>
      )}

      {/* Lot cards */}
      {filtered.length === 0 ? (
        <EmptyState title="No lots found" hint="Try a different filter or search term." icon={Package} />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2" gap={0.05}>
          {filtered.map((i) => (
            <StaggerItem key={i.id}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 cursor-pointer"
                style={{ boxShadow: '0 1px 3px rgba(20,20,25,0.04), 0 8px 24px rgba(20,20,25,0.05)' }}
                onClick={() => nav(`/farmer/report/${i.id}`)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-lg bg-forest/10 px-2 py-0.5 text-[11px] font-bold text-forest font-mono border border-forest/15">
                        {i.lotNumber || '—'}
                      </span>
                      {i.isReassessment && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">Reassessed</span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-muted font-mono">{i.certificateNumber}</p>
                  </div>
                  <GradeBadge grade={i.grade} />
                </div>

                {/* Score bars */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Vision', val: i.visionScore, icon: ScanLine },
                    { label: 'Gas+Env', val: i.gasScore, icon: Wind },
                    { label: 'Final', val: i.qualityScore, icon: Award },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-[rgba(20,20,25,0.03)] border border-[rgba(20,20,25,0.07)] py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-muted mb-1">
                        <m.icon size={10} /> {m.label}
                      </div>
                      <div className="text-[18px] font-extrabold text-forest leading-none">
                        {m.val != null ? <AnimatedNumber value={Number(m.val)} /> : <span className="text-muted text-sm">—</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[rgba(20,20,25,0.07)]">
                  <span className="text-[11px] text-muted">{new Date(i.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); nav(`/farmer/report/${i.id}`); }}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline transition"
                    >
                      <FileText size={12} /> Report
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nav(`/certificate/${i.id}`); }}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-forest hover:underline transition"
                    >
                      Certificate <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}
