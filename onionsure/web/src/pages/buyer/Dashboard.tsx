import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Search, QrCode, Filter, Award, TrendingUp, ShieldCheck, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { api } from '../../lib/api';
import { GradeBadge, EmptyState } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_CERTIFICATES } from '../../lib/events';
import { PageHeader, StatGrid, StatTile } from '../../components/PageHeader';

const GRADES = ['ALL', 'GRADE A', 'URS', 'REJECTED'] as const;

export default function BuyerDashboard() {
  const nav = useNavigate();
  const { data, loading } = useLiveData<any[]>(
    () => api.getCertificates(),
    { events: EV_CERTIFICATES, pollMs: 20000 },
  );
  const [grade, setGrade] = React.useState<string>('ALL');
  const [q, setQ]         = React.useState('');

  const certs    = data || [];
  const filtered = certs.filter((c) =>
    (grade === 'ALL' || c.grade === grade) &&
    (c.certificateNumber + c.grade).toLowerCase().includes(q.toLowerCase()),
  );

  if (loading && !data) return (
    <PageTransition className="space-y-5">
      <div className="h-32 animate-pulse rounded-2xl bg-[rgba(20,20,25,0.07)]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-[rgba(20,20,25,0.05)]" />)}</div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0,1,2,3,4,5].map(i => <div key={i} className="h-52 animate-pulse rounded-2xl bg-[rgba(20,20,25,0.05)]" />)}</div>
    </PageTransition>
  );

  const avg      = certs.length ? Math.round(certs.reduce((a, c) => a + (Number(c.qualityScore) || 0), 0) / certs.length) : 0;
  const gradeACt = certs.filter((c) => c.grade === 'GRADE A').length;
  const rejected = certs.filter((c) => c.grade === 'REJECTED').length;

  return (
    <PageTransition className="space-y-5">
      <PageHeader
        icon={<Store size={21} />}
        eyebrow="Buyer"
        title="Verified Lots"
        subtitle="Source with confidence — every lot is digitally documented and graded."
        gradient="from-[#1a3a5c] via-[#1e4976] to-[#0d2e50]"
        actions={
          <Link to="/quality/qr-verify"
            className="inline-flex items-center gap-2 rounded-xl bg-white/20 border border-white/30 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30">
            <QrCode size={14} /> Scan QR
          </Link>
        }
      />

      <StatGrid cols={4}>
        <StatTile label="Verified Lots" value={<AnimatedNumber value={certs.length} />}  sub="available to source" icon={ShieldCheck} accent="green" />
        <StatTile label="Avg Quality"   value={<AnimatedNumber value={avg} />}            sub="across all lots"     icon={TrendingUp}  accent="blue"  suffix="/100" />
        <StatTile label="Grade A"       value={<AnimatedNumber value={gradeACt} />}       sub="premium quality"     icon={Award}       accent="green" />
        <StatTile label="Rejected"      value={<AnimatedNumber value={rejected} />}       sub="failed inspection"   icon={QrCode}      accent="red"   />
      </StatGrid>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search certificates…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted">
            <SlidersHorizontal size={14} />
            <span className="text-[12px] font-semibold hidden sm:block">Filter:</span>
          </div>
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`rounded-xl px-4 py-2 text-[12px] font-semibold transition-all duration-150 ${
                grade === g
                  ? 'bg-forest text-white shadow-[0_3px_10px_rgba(11,93,59,0.25)]'
                  : 'border border-[rgba(20,20,25,0.10)] bg-white text-muted hover:text-ink hover:border-[rgba(20,20,25,0.18)]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No lots match your filters"
          hint="Try a different search term or grade filter."
          icon={ShieldCheck}
        />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {filtered.map((c) => (
            <StaggerItem key={c.id} className="h-full">
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="relative flex h-full flex-col rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 cursor-pointer overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(20,20,25,0.04), 0 8px 24px rgba(20,20,25,0.05)' }}
                onClick={() => nav(`/certificate/${c.id}`)}
              >
                {/* Grade accent stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${c.grade === 'GRADE A' ? 'bg-forest' : c.grade === 'URS' ? 'bg-amber' : 'bg-reject'}`} />

                <div className="flex items-center justify-between pt-2 mb-4">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${c.grade === 'GRADE A' ? 'bg-forest/10 text-forest' : c.grade === 'URS' ? 'bg-amber/15 text-amber-700' : 'bg-reject/10 text-reject'}`}>
                    <ShieldCheck size={18} />
                  </div>
                  <GradeBadge grade={c.grade} />
                </div>

                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Certificate</p>
                <p className="font-bold text-forest font-mono text-[13px] mt-0.5 truncate">{c.certificateNumber}</p>
                {c.lotNumber && (
                  <p className="text-[12px] text-muted mt-0.5">Lot: <span className="font-semibold text-ink font-mono">{c.lotNumber}</span></p>
                )}

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-muted font-medium">Quality Score</p>
                    <p className="text-[32px] font-extrabold text-ink leading-none tracking-tight">
                      <AnimatedNumber value={Number(c.qualityScore) || 0} />
                      <span className="text-[14px] text-muted">/100</span>
                    </p>
                  </div>
                </div>

                <div className="flex h-1.5 overflow-hidden rounded-full mt-3 mb-4 gap-px">
                  <div className="bg-forest rounded-l-full" style={{ width: `${c.grade_a_percentage || 0}%` }} />
                  <div className="bg-amber" style={{ width: `${c.urs_percentage || 0}%` }} />
                  <div className="bg-reject rounded-r-full" style={{ width: `${c.rejected_percentage || 0}%` }} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[rgba(20,20,25,0.07)] mt-auto">
                  <span className="text-[11px] text-muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline">
                    <QrCode size={12} /> Verify <ArrowRight size={11} />
                  </span>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}
