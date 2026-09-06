import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor, Award, Leaf, QrCode, TrendingUp, ShieldAlert, PlusCircle, Package, MapPin, Sprout, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, GradeBadge, ProgressBar, StatCard, EmptyState } from '../../components/ui';
import { Donut } from '../../components/charts';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_CERTIFICATES } from '../../lib/events';
import { useAuth } from '../../lib/auth';

export default function FarmerDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [showLotForm, setShowLotForm] = useState(false);
  const [lotForm, setLotForm] = useState({ crop: 'Onion', variety: 'Nashik Red', quantityKg: 1000, village: '', notes: '' });
  const [lotBusy, setLotBusy] = useState(false);
  const [lotErr, setLotErr] = useState('');
  const [createdLot, setCreatedLot] = useState<any>(null);

  const { data, loading } = useLiveData<any[]>(
    () => api.getCertificates(),
    { events: EV_CERTIFICATES, pollMs: 20000 },
  );

  const { data: lotsData } = useLiveData<any[]>(
    () => api.getLots(),
    { events: EV_CERTIFICATES, pollMs: 20000 },
  );

  const certs = data || [];
  const lots = lotsData || [];

  const hasActiveLot = lots.length > 0;
  const hasCerts = certs.length > 0;

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

  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLotErr('');
    if (!lotForm.crop || !lotForm.quantityKg || lotForm.quantityKg <= 0) {
      setLotErr('Crop and quantity are required');
      return;
    }
    setLotBusy(true);
    try {
      const centers = await api.getCenters();
      const centerId = centers[0]?.id;
      const lot = await api.createLot({
        crop: lotForm.crop,
        variety: lotForm.variety || 'Nashik Red',
        quantityKg: lotForm.quantityKg,
        procurementCenterId: centerId,
      });
      setCreatedLot(lot);
      setShowLotForm(false);
      setLotForm({ crop: 'Onion', variety: 'Nashik Red', quantityKg: 1000, village: '', notes: '' });
    } catch (e: any) {
      setLotErr(e.message || 'Failed to create lot');
    } finally {
      setLotBusy(false);
    }
  };

  return (
    <PageTransition className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest text-white"><Tractor size={24} /></div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Farmer</div>
            <h1 className="text-xl font-extrabold text-ink md:text-2xl">Welcome, {user?.name || 'Farmer'}</h1>
            <p className="mt-0.5 text-sm text-muted">Transparent evidence for every lot you grade.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => nav('/farmer/dispute')} className="inline-flex items-center gap-2 rounded-xl border border-reject/30 bg-rose-50 px-4 py-2 text-sm font-semibold text-reject transition hover:bg-reject/10">
            <ShieldAlert size={15} /> Raise Dispute
          </button>
          <button onClick={() => nav('/farmer/inspection')} className="btn-primary py-2 text-sm">
            <Leaf size={15} /> Pre-Check
          </button>
        </div>
      </div>

      {/* Lot Creation Success Banner */}
      {createdLot && (
        <Card className="border-forest/30 bg-gradient-to-br from-mint/80 to-white p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={28} className="text-forest" />
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-fresh">YOUR CENTRAL LOT ID</div>
              <div className="mt-1 text-2xl font-extrabold text-ink font-mono">{createdLot.lotNumber || createdLot.centralLotId}</div>
              <div className="mt-1 text-sm text-muted">
                One physical lot = one Central Lot ID. This ID remains the same through inspection, grading, certification, and disputes.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Active Lot / Empty State */}
      {hasActiveLot ? (
        hasCerts ? (
          <Card className="border-forest/20 bg-gradient-to-br from-mint/60 via-white to-mint/30 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-forest px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                    CENTRAL LOT: {certs[0].lotNumber || lots[0]?.lotNumber || 'ON-2026-00421'}
                  </span>
                  <Badge tone="forest">LATEST INSPECTION COMPLETED</Badge>
                </div>
                <div className="mt-2 text-2xl font-extrabold text-ink">
                  Grade: <span className="text-forest">{certs[0].grade}</span>
                </div>
                <div className="mt-0.5 text-sm text-muted">
                  Quality Score: <span className="font-bold text-ink">{certs[0].qualityScore}/100</span> · Certificate: <span className="font-mono">{certs[0].certificateNumber}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => nav(`/farmer/report/${certs[0].id}`)}
                  className="btn-primary py-2 text-xs"
                >
                  <Award size={14} /> View Report &amp; Reasoning
                </button>
                <button
                  onClick={() => nav(`/certificate/${certs[0].id}`)}
                  className="btn-ghost border border-forest/30 bg-white py-2 text-xs"
                >
                  View Certificate
                </button>
                <button
                  onClick={() => nav('/farmer/dispute')}
                  className="rounded-xl border border-reject/30 bg-rose-50 px-3 py-2 text-xs font-semibold text-reject hover:bg-reject/10"
                >
                  <ShieldAlert size={14} className="inline mr-1" /> Dispute Result
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3 border-t border-border pt-4">
              <div><div className="flex justify-between text-xs font-semibold"><span className="text-muted">Grade A Quality</span><span className="font-bold text-ink">{certs[0].grade_a_percentage}%</span></div><ProgressBar value={Number(certs[0].grade_a_percentage) || 0} tone="forest" /></div>
              <div><div className="flex justify-between text-xs font-semibold"><span className="text-muted">URS Quality</span><span className="font-bold text-ink">{certs[0].urs_percentage}%</span></div><ProgressBar value={Number(certs[0].urs_percentage) || 0} tone="amber" /></div>
              <div><div className="flex justify-between text-xs font-semibold"><span className="text-muted">Rejected Defects</span><span className="font-bold text-ink">{certs[0].rejected_percentage}%</span></div><ProgressBar value={Number(certs[0].rejected_percentage) || 0} tone="reject" /></div>
            </div>
          </Card>
        ) : (
          <Card className="border-forest/20 bg-gradient-to-br from-mint/60 via-white to-mint/30 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-forest px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                    CENTRAL LOT: {lots[0]?.lotNumber || 'PENDING'}
                  </span>
                  <Badge tone="amber">AWAITING INSPECTION</Badge>
                </div>
                <div className="mt-2 text-lg font-bold text-ink">
                  {lots[0]?.crop || 'Onion'} · {lots[0]?.variety || 'Nashik Red'} · {lots[0]?.quantityKg || 0} KG
                </div>
                <div className="mt-1 text-sm text-muted">
                  Your lot has been registered. It will be inspected by a procurement officer.
                </div>
              </div>
              <button
                onClick={() => nav('/farmer/inspection')}
                className="btn-primary py-2 text-sm"
              >
                <Leaf size={15} /> Run Pre-Check
              </button>
            </div>
          </Card>
        )
      ) : !showLotForm ? (
        <Card className="border-2 border-dashed border-forest/30 bg-mint/30 p-8 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-forest/10">
            <Package size={32} className="text-forest" />
          </div>
          <div className="text-lg font-extrabold text-ink">NO ACTIVE LOT</div>
          <p className="mt-2 text-sm text-muted">
            You haven't submitted an onion lot yet. Create a lot to get a Central Lot ID and begin the quality assessment process.
          </p>
          <button
            onClick={() => setShowLotForm(true)}
            className="mt-4 btn-primary py-2.5 text-sm"
          >
            <PlusCircle size={16} /> Create / Submit Lot
          </button>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink">Create New Lot</h3>
            <button onClick={() => setShowLotForm(false)} className="text-sm text-muted hover:text-ink">Cancel</button>
          </div>
          <form onSubmit={handleCreateLot} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[13px] font-semibold text-ink">Crop *</label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                  value={lotForm.crop}
                  onChange={(e) => setLotForm({ ...lotForm, crop: e.target.value })}
                  placeholder="Onion"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-ink">Variety</label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                  value={lotForm.variety}
                  onChange={(e) => setLotForm({ ...lotForm, variety: e.target.value })}
                  placeholder="Nashik Red"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[13px] font-semibold text-ink">Quantity (KG) *</label>
                <input
                  type="number"
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                  value={lotForm.quantityKg}
                  onChange={(e) => setLotForm({ ...lotForm, quantityKg: Number(e.target.value) })}
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-ink">Village / Origin</label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                  value={lotForm.village}
                  onChange={(e) => setLotForm({ ...lotForm, village: e.target.value })}
                  placeholder="Nashik"
                />
              </div>
            </div>
            <div>
              <label className="text-[13px] font-semibold text-ink">Notes (optional)</label>
              <textarea
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                value={lotForm.notes}
                onChange={(e) => setLotForm({ ...lotForm, notes: e.target.value })}
                placeholder="Any additional information about this lot..."
                rows={2}
              />
            </div>
            {lotErr && (
              <div className="rounded-xl border border-reject/20 bg-reject/5 px-4 py-2.5 text-[13px] font-medium text-reject">{lotErr}</div>
            )}
            <button type="submit" disabled={lotBusy} className="btn-primary py-3 text-sm w-full">
              {lotBusy ? 'Creating…' : (
                <>
                  <PlusCircle size={16} /> Submit Lot
                </>
              )}
            </button>
          </form>
        </Card>
      )}

      {/* Stats */}
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
