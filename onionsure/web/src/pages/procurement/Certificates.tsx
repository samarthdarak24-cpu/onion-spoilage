import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Search, FileCheck2, ShieldCheck, ArrowRight, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { GradeBadge, EmptyState, ProgressBar } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_CERTIFICATES } from '../../lib/events';
import { PageHeader, StatGrid, StatTile } from '../../components/PageHeader';

export default function Certificates() {
  const nav = useNavigate();
  const { data, loading } = useLiveData<any[]>(
    () => api.getCertificates(),
    { events: EV_CERTIFICATES, pollMs: 20000 },
  );
  const [q, setQ] = React.useState('');

  const certs    = data || [];
  const filtered = certs.filter((c) => (c.certificateNumber + c.grade).toLowerCase().includes(q.toLowerCase()));
  const total    = certs.length;
  const avg      = total ? Math.round(certs.reduce((a, c) => a + (Number(c.qualityScore) || 0), 0) / total) : 0;
  const gradeA   = certs.filter((c) => c.grade === 'GRADE A').length;

  if (loading && !data) return (
    <PageTransition className="space-y-5">
      <div className="h-28 animate-pulse rounded-2xl bg-mint/60" />
      <div className="grid gap-4 sm:grid-cols-3">{[0,1,2].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-mint/60" />)}</div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0,1,2,3,4,5].map(i => <div key={i} className="h-52 animate-pulse rounded-2xl bg-mint/60" />)}</div>
    </PageTransition>
  );

  return (
    <PageTransition className="space-y-5">
      <PageHeader icon={<Award size={22} />} eyebrow="Quality & Trust" title="Quality Certificates" subtitle="Tamper-evident digital certificates issued for every graded lot." />

      <StatGrid cols={3}>
        <StatTile label="Certificates" value={<AnimatedNumber value={total} />} sub="issued this period" icon={FileCheck2} accent="green" />
        <StatTile label="Avg Quality" value={<AnimatedNumber value={avg} />} sub="across all certs" icon={Award} accent="blue" suffix="/100" />
        <StatTile label="Grade A" value={<AnimatedNumber value={gradeA} />} sub="premium quality" icon={ShieldCheck} accent="green" />
      </StatGrid>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9 w-64" placeholder="Search certificate…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-xs text-muted">{filtered.length} of {total} shown</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No certificates found" hint="Run a New Inspection to generate one." />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {filtered.map((c) => (
            <StaggerItem key={c.id} className="h-full">
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft hover:shadow-card transition-shadow cursor-pointer"
                onClick={() => nav(`/certificate/${c.id}`)}
              >
                {/* Grade stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${c.grade === 'GRADE A' ? 'bg-forest' : c.grade === 'URS' ? 'bg-amber' : 'bg-reject'}`} />

                <div className="flex items-center justify-between pt-2 mb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-forest/10 text-forest">
                    <Award size={18} />
                  </div>
                  <GradeBadge grade={c.grade} />
                </div>

                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Certificate</p>
                <p className="font-bold text-forest font-mono text-sm mt-0.5 truncate">{c.certificateNumber}</p>

                <div className="flex items-end justify-between mt-4 mb-1">
                  <div>
                    <p className="text-[10px] text-muted">Quality Score</p>
                    <p className="text-3xl font-extrabold text-ink leading-none">
                      <AnimatedNumber value={Number(c.qualityScore) || 0} />
                      <span className="text-base text-muted">/100</span>
                    </p>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    {[
                      { l: 'Grade A', v: c.grade_a_percentage, col: 'text-forest' },
                      { l: 'URS',     v: c.urs_percentage,     col: 'text-amber-600' },
                      { l: 'Rejected',v: c.rejected_percentage, col: 'text-reject' },
                    ].map(({ l, v, col }) => (
                      <div key={l} className="flex items-center gap-1.5 justify-end">
                        <span className="text-muted">{l}</span>
                        <span className={`font-bold ${col}`}>{v ?? '—'}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex h-2 overflow-hidden rounded-full mt-3 mb-4">
                  <div className="bg-forest" style={{ width: `${c.grade_a_percentage || 0}%` }} />
                  <div className="bg-amber" style={{ width: `${c.urs_percentage || 0}%` }} />
                  <div className="bg-reject" style={{ width: `${c.rejected_percentage || 0}%` }} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-forest">
                    <QrCode size={13} /> View & Verify
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
