import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Clock, ChevronRight, Send,
  MessageSquare, RotateCcw, ShieldAlert, Leaf, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { Card, GradeBadge } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem } from '../../components/motion';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type DisputeStatus = 'submitted' | 'under_review' | 'reinspection' | 'resolved';

interface DisputeTimelineItem {
  status: DisputeStatus;
  label: string;
  timestamp: string;
  note?: string;
}

interface DisputeItem {
  id: string;
  disputeNumber: string;
  lotId: string;
  centralLotId?: string;
  inspectionId?: string;
  certificateNumber?: string;
  grade: string;
  qualityScore?: number;
  reason: string;
  description?: string;
  status: DisputeStatus;
  timeline?: DisputeTimelineItem[];
  createdAt: string;
  updatedAt: string;
  resolvedGrade?: string;
  resolutionNote?: string;
}

/* ------------------------------------------------------------------ */
/* Timeline step component                                             */
/* ------------------------------------------------------------------ */

const STEPS: { key: DisputeStatus; label: string; desc: string }[] = [
  { key: 'submitted', label: 'Submitted', desc: 'Dispute filed & registered.' },
  { key: 'under_review', label: 'Under Review', desc: 'Technical team reviewing evidence.' },
  { key: 'reinspection', label: 'Re-inspection', desc: 'Physical lot scheduled / re-inspected.' },
  { key: 'resolved', label: 'Resolved', desc: 'Updated official grade & certificate issued.' },
];

function DisputeTimeline({ status }: { status: DisputeStatus }) {
  const activeIdx = STEPS.findIndex((s) => s.key === status);
  const currentIdx = activeIdx >= 0 ? activeIdx : 0;

  return (
    <div className="flex items-start gap-0">
      {STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div className="relative h-0.5 flex-1">
                  <div className="absolute inset-0 bg-emerald-100 rounded-full" />
                  {done && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-forest"
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </div>
              )}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? 'border-forest bg-forest text-white'
                    : 'border-emerald-200 bg-white text-muted'
                }`}
              >
                {done ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                {active && (
                  <motion.span
                    className="absolute -inset-1 rounded-full border-2 border-forest/30"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                )}
              </motion.div>
              {i < STEPS.length - 1 && (
                <div className="relative h-0.5 flex-1">
                  <div className="absolute inset-0 bg-emerald-100 rounded-full" />
                  {i < currentIdx && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-forest"
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.4, delay: (i + 1) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 px-1 text-center">
              <div className={`text-[11px] font-bold ${done ? 'text-forest' : 'text-muted'}`}>
                {step.label}
              </div>
              {active && (
                <div className="mt-0.5 text-[10px] text-muted">{step.desc}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

function StatusChip({ status }: { status: DisputeStatus }) {
  const map: Record<DisputeStatus, { label: string; cls: string; icon: any }> = {
    submitted: { label: 'Submitted', cls: 'bg-amber-100 text-amber-700', icon: Clock },
    under_review: { label: 'Under Review', cls: 'bg-blue-50 text-blue-700', icon: RotateCcw },
    reinspection: { label: 'Re-inspection', cls: 'bg-purple-50 text-purple-700', icon: ShieldAlert },
    resolved: { label: 'Resolved', cls: 'bg-mint text-forest', icon: CheckCircle2 },
  };
  const cfg = map[status] || map.submitted;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${cfg.cls}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

const REASON_OPTIONS = [
  { value: 'wrong_grade', label: 'Grade seems incorrect based on lot appearance' },
  { value: 'equipment_error', label: 'Sensor / equipment or ambient reading anomaly' },
  { value: 'lot_mismatch', label: 'Lot identity or weight mismatch' },
  { value: 'cross_center_variation', label: 'Cross-center quality score variation' },
  { value: 'other', label: 'Other quality reassessment request' },
];

export default function FarmerDispute() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [inspections, setInspections] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState('');
  const [reason, setReason] = useState('wrong_grade');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getInspections(),
      api.getDisputes(),
    ]).then(([allInspections, allDisputes]) => {
      setInspections(allInspections || []);
      setDisputes(allDisputes || []);

      const paramLot = searchParams.get('lotId');
      if (paramLot) {
        // Match by lotId or lotNumber
        const matched = allInspections?.find(
          (i: any) => i.id === paramLot || i.lotNumber === paramLot || i.certificateNumber === paramLot
        );
        if (matched) {
          setSelectedLot(matched.lotNumber || matched.id);
        } else {
          setSelectedLot(paramLot);
        }
      }
    }).finally(() => setLoading(false));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    setSubmitting(true);
    try {
      const reasonLabel = REASON_OPTIONS.find((r) => r.value === reason)?.label || reason;
      await api.createDispute({
        lotId: selectedLot,
        reason: reasonLabel,
        description: description.trim(),
      });
      setSubmitted(true);
      // Reload disputes directly from backend
      const updated = await api.getDisputes();
      setDisputes(updated || []);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit dispute. Please check the lot selection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">My Farm</div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl">
            <ShieldAlert size={22} className="text-reject" /> Raise a Dispute
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Challenge an inspection grade with official reasoning — our quality team tracks and resolves each dispute.
          </p>
        </div>
      </div>

      <Stagger className="grid gap-5 lg:grid-cols-5">
        {/* Form */}
        <StaggerItem className="lg:col-span-3">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare size={18} className="text-forest" />
              <span className="font-bold text-ink">New Dispute Request</span>
            </div>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center gap-4 py-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                    className="grid h-16 w-16 place-items-center rounded-full bg-mint text-forest"
                  >
                    <CheckCircle2 size={32} />
                  </motion.div>
                  <div>
                    <div className="text-lg font-extrabold text-ink">Dispute Submitted to Central System!</div>
                    <div className="mt-1 max-w-sm text-sm text-muted">
                      Your dispute has been logged with an official dispute reference ID. The procurement center's senior quality officer has been notified.
                    </div>
                  </div>
                  <div className="w-full max-w-sm">
                    <DisputeTimeline status="submitted" />
                  </div>
                  <button
                    onClick={() => { setSubmitted(false); setSelectedLot(''); setDescription(''); }}
                    className="mt-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-bg"
                  >
                    Raise Another Dispute
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {/* Lot selector */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-ink">Select Inspected Lot *</label>
                    <select
                      required
                      value={selectedLot}
                      onChange={(e) => setSelectedLot(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">— choose an inspected lot —</option>
                      {inspections.map((i: any) => (
                        <option key={i.id} value={i.lotNumber || i.id}>
                          {i.lotNumber || i.certificateNumber} — Grade: {i.grade} ({i.qualityScore ?? i.finalScore ?? '—'}/100)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-ink">Reason for Dispute *</label>
                    <div className="space-y-2">
                      {REASON_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            reason === opt.value
                              ? 'border-forest bg-mint/40'
                              : 'border-border bg-white hover:bg-bg'
                          }`}
                        >
                          <input
                            type="radio"
                            name="reason"
                            value={opt.value}
                            checked={reason === opt.value}
                            onChange={() => setReason(opt.value)}
                            className="accent-forest"
                          />
                          <span className="text-sm font-semibold text-ink">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-ink">Supporting Justification / Observations</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide specific details (e.g., visual lot condition, cross-center variation observations, harvest conditions)…"
                      rows={4}
                      className="input w-full resize-none"
                    />
                  </div>

                  {/* Info box */}
                  <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-xs text-amber-700">
                      Disputes trigger an <strong>official technical audit & re-inspection</strong> under standardized protocol <code className="font-bold">ONION_STANDARD_2026_V1</code>.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedLot || submitting}
                    className="btn-primary w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Transmitting Dispute…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Send size={16} /> Submit Formal Dispute
                      </span>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </Card>
        </StaggerItem>

        {/* Right column */}
        <StaggerItem className="lg:col-span-2 space-y-5">
          {/* How it works */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Leaf size={18} className="text-forest" />
              <span className="font-bold text-ink">Dispute Lifecycle Protocol</span>
            </div>
            <div className="space-y-3">
              {[
                { step: '01', title: '1. Submitted', desc: 'Dispute recorded permanently in Central Audit Trail.' },
                { step: '02', title: '2. Under Review', desc: 'Officer audits camera detections & gas sensor readings.' },
                { step: '03', title: '3. Re-inspection', desc: 'Secondary physical test or calibrated re-evaluation.' },
                { step: '04', title: '4. Resolution', desc: 'Grade updated & official revised certificate generated.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-forest text-[11px] font-extrabold text-white">
                    {step}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">{title}</div>
                    <div className="text-xs text-muted">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* SLA */}
          <div className="flex items-center gap-3 rounded-2xl border border-forest/20 bg-mint/40 px-4 py-3">
            <Clock size={18} className="shrink-0 text-forest" />
            <div className="text-sm">
              <div className="font-bold text-ink">Central Quality Trail Linked</div>
              <div className="text-xs text-muted">All reassessments reference the original Central Lot ID</div>
            </div>
          </div>
        </StaggerItem>
      </Stagger>

      {/* Existing disputes */}
      {disputes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw size={16} className="text-muted" />
            <span className="font-bold text-ink">My Central Lot Disputes</span>
            <span className="ml-1 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-bold text-white">{disputes.length}</span>
          </div>
          <Stagger className="space-y-3" gap={0.06}>
            {disputes.map((d) => (
              <StaggerItem key={d.id}>
                <Card className="p-5 space-y-4 transition-shadow hover:shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-muted uppercase tracking-wide">
                        {d.disputeNumber || `DSP-${d.id}`}
                      </div>
                      <div className="font-bold text-forest text-base">
                        Central Lot: {d.centralLotId || d.lotId}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                        <GradeBadge grade={d.grade} />
                        <span className="text-muted">·</span>
                        <span className="font-medium text-ink">{d.reason}</span>
                      </div>
                      {d.description && (
                        <p className="mt-1.5 text-xs text-muted italic bg-bg p-2 rounded-lg border border-border">
                          "{d.description}"
                        </p>
                      )}
                    </div>
                    <StatusChip status={d.status} />
                  </div>

                  <DisputeTimeline status={d.status} />

                  {/* Resolution banner if resolved */}
                  {d.status === 'resolved' && (
                    <div className="rounded-xl border border-forest/30 bg-mint/50 p-3 text-xs text-forest flex items-center justify-between">
                      <span className="font-semibold">
                        Resolved Grade: <span className="underline font-bold">{d.resolvedGrade || 'Updated'}</span> — {d.resolutionNote || 'Re-inspection completed.'}
                      </span>
                      <Check size={16} className="text-forest" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-border">
                    <span>Submitted: {new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>Updated: {new Date(d.updatedAt || d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {d.inspectionId && (
                      <button
                        onClick={() => nav(`/farmer/report/${d.inspectionId}`)}
                        className="flex items-center gap-1 font-semibold text-forest hover:underline"
                      >
                        View Report <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      )}
    </PageTransition>
  );
}
