import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, QrCode, FileDown, ShieldCheck, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, GradeBadge, EmptyState, StatCard } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';

export default function FarmerCertificates() {
  const nav = useNavigate();
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCertificates().then(setCerts).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-mint/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-mint/60" />)}</div>
      </PageTransition>
    );
  }

  const avg = certs.length ? Math.round(certs.reduce((a, c) => a + (Number(c.qualityScore) || 0), 0) / certs.length) : 0;
  const gradeA = certs.filter((c) => c.grade === 'GRADE A').length;

  return (
    <PageTransition className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">My Farm</div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl">
            <Award size={22} className="text-fresh" /> My Quality Certificates
          </h1>
          <p className="mt-0.5 text-sm text-muted">{certs.length} digital certificates issued for your lots.</p>
        </div>
      </div>

      {certs.length === 0 ? (
        <EmptyState title="No certificates yet" hint="Certificates are generated automatically once your lot is inspected and graded." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="My Certificates" value={<AnimatedNumber value={certs.length} />} sub="issued to date" accent="forest" icon={Award} />
            <StatCard label="Avg Quality" value={<><AnimatedNumber value={avg} /><span className="text-base text-muted">/100</span></>} sub="across my lots" accent="fresh" icon={TrendingUp} />
            <StatCard label="Grade A Certs" value={<AnimatedNumber value={gradeA} />} sub="premium quality" accent="fresh" icon={ShieldCheck} />
          </div>

          <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" gap={0.05}>
            {certs.map((c) => (
              <StaggerItem key={c.id} className="h-full">
                <Card className="relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-card">
                  <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-forest to-darkgreen opacity-10" />
                  <div className="flex items-center justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-forest/10 text-forest"><ShieldCheck size={22} /></div>
                    <GradeBadge grade={c.grade} />
                  </div>
                  <div className="mt-4 text-xs uppercase tracking-wide text-muted">Certificate</div>
                  <div className="truncate font-bold text-forest">{c.certificateNumber}</div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-[11px] text-muted">Quality Score</div>
                      <div className="text-3xl font-extrabold text-ink">{c.qualityScore}<span className="text-base text-muted">/100</span></div>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <div>A {c.grade_a_percentage ?? '—'}%</div>
                      <div>U {c.urs_percentage ?? '—'}%</div>
                      <div>R {c.rejected_percentage ?? '—'}%</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3 py-2 text-sm font-semibold text-white transition hover:bg-darkgreen" onClick={() => nav(`/certificate/${c.id}`)}>
                      <QrCode size={15} /> View / Verify
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-forest transition hover:bg-mint/40" onClick={() => nav(`/certificate/${c.id}`)}>
                      <FileDown size={15} /> Download
                    </button>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}
    </PageTransition>
  );
}
