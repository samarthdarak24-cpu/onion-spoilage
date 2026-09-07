/**
 * Quality Certificates — Officer Panel
 *
 * Shows the CURRENT active inspection (from localStorage) and lets the
 * officer generate + view the certificate for that exact inspection.
 *
 * ONE INSPECTION = ONE CERTIFICATE.
 * A new inspection always starts with a fresh certificate state.
 * Old inspection certificates are NEVER shown as the current certificate.
 *
 * 6 UI States:
 *   1. No active inspection          → prompt to start one
 *   2. Loading inspection data       → skeleton
 *   3. Inspection not finalized      → Generate disabled, explains why
 *   4. Finalized, no certificate     → Generate Certificate button
 *   5. Generating                    → spinner
 *   6. Certificate exists            → View Certificate
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award, CheckCircle2, AlertCircle, Loader2, ArrowRight,
  FileText, User, Package, MapPin, Calendar, ShieldCheck, GitMerge,
  Eye, Wind, RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { PageTransition } from '../../components/motion';

const LS_INSP_KEY = 'onionsure_current_inspection_id';

/* ── helpers ──────────────────────────────────────────────────────── */
const na = (v: any, label?: string) =>
  v != null && v !== '' ? v : (label ?? 'Not Available');

const gradeColor = (g: string) =>
  g?.includes('GRADE A') ? 'text-forest' :
  g?.includes('URS')     ? 'text-amber-600' :
  g?.includes('REJECTED')? 'text-reject' : 'text-ink';

const gradeBg = (g: string) =>
  g?.includes('GRADE A') ? 'bg-forest/10 border-forest/25' :
  g?.includes('URS')     ? 'bg-amber/10 border-amber/30'   :
  g?.includes('REJECTED')? 'bg-reject/10 border-reject/25' : 'bg-sb-50 border-border';

/* ═══════════════════════════════════════════════════════════════════ */
export default function Certificates() {
  const nav = useNavigate();

  // All state declared first so the storage listener closure can reference setters
  const [inspectionId, setInspectionId] = useState<string | null>(() =>
    localStorage.getItem(LS_INSP_KEY) || null
  );
  const [inspection,  setInspection]  = useState<any>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [loading,     setLoading]     = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [errMsg,      setErrMsg]      = useState('');

  // Listen for localStorage changes from any tab or page:
  //   - NewInspection.tsx sets the key when an inspection is created
  //   - auth.tsx clearSession() removes it on logout
  // This keeps the page reactive without polling.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_INSP_KEY) {
        const next = e.newValue || null;
        setInspectionId(next);
        setInspection(null);
        setCertificate(null);
        setErrMsg('');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* Load the current inspection + check for existing certificate.
     Clears previous data first so stale content never shows. */
  const loadData = async () => {
    if (!inspectionId) {
      setInspection(null);
      setCertificate(null);
      return;
    }
    setLoading(true);
    setErrMsg('');
    setInspection(null);   // clear before fetch — no stale flash
    setCertificate(null);
    try {
      const insp = await api.getInspection(inspectionId);
      setInspection(insp);

      // Check if a certificate already exists for this SPECIFIC inspection only
      const existingCert = await api.getCertificate(inspectionId).catch(() => null);
      if (existingCert?.certificate) setCertificate(existingCert.certificate);
      else setCertificate(null);
    } catch (e: any) {
      setErrMsg(e.message || 'Failed to load inspection data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [inspectionId]);

  /* Generate certificate */
  const handleGenerate = async () => {
    if (!inspectionId) return;
    setGenerating(true);
    setErrMsg('');
    try {
      const cert = await api.generateCertificate({ inspectionId });
      setCertificate(cert);
    } catch (e: any) {
      setErrMsg(e.message || 'Certificate generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /* ── derived state ───────────────────────────────────────────────── */
  const sess    = inspection?.session || inspection;
  const lot     = inspection?.lot;
  const fusion  = inspection?.fusion;
  const farmer  = inspection?.farmer  || null; // may not be on getInspection
  const center  = inspection?.center  || null;
  const fpo     = inspection?.fpo     || null;

  const isFinalized =
    sess?.workflowState === 'FUSION_COMPLETED' ||
    sess?.workflowState === 'CERTIFICATE_ISSUED' ||
    sess?.status === 'analyzed' ||
    sess?.status === 'completed';

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */
  return (
    <PageTransition className="space-y-5">

      {/* Page heading */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">
          Quality &amp; Trust
        </div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl">
          <Award size={22} className="text-fresh" /> Quality Certificate
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Generate and manage the official certificate for the current inspection.
        </p>
      </div>

      {/* ── STATE 1: No active inspection ───────────────────────────── */}
      {!inspectionId && (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-muted/20 bg-gray-50">
            <Award size={26} className="text-muted/40" />
          </div>
          <h3 className="text-base font-bold text-ink">No Active Inspection</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Create an inspection before generating a quality certificate.
          </p>
          <Link to="/quality/new-inspection" className="btn-primary mt-5 inline-flex items-center gap-2">
            <ArrowRight size={15} /> Start New Inspection
          </Link>
        </Card>
      )}

      {/* ── STATE 2: Loading ────────────────────────────────────────── */}
      {inspectionId && loading && (
        <div className="flex items-center gap-2 text-sm text-muted py-4">
          <Loader2 size={16} className="animate-spin text-forest" />
          Loading inspection data…
        </div>
      )}

      {/* Error banner */}
      {errMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-reject/25 bg-reject/5 px-4 py-3 text-sm font-medium text-reject">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {errMsg}
        </div>
      )}

      {/* ── When inspection is loaded ───────────────────────────────── */}
      {inspectionId && !loading && inspection && (
        <>
          {/* Current Inspection card */}
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
            <div className="border-b border-border bg-sb-50/60 px-5 py-3 flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">
                Current Inspection
              </div>
              <button
                onClick={loadData}
                className="flex items-center gap-1 text-[11.5px] font-semibold text-muted hover:text-forest transition"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[13px]">
                <InfoRow icon={<FileText size={13} />} label="Central Lot ID"   value={na(lot?.lotNumber || lot?.centralLotId)} />
                <InfoRow icon={<FileText size={13} />} label="Inspection ID"    value={na(inspectionId?.slice(-12))} />
                <InfoRow icon={<User size={13} />}     label="Farmer"           value={na(farmer?.fullName || farmer?.name || farmer?.farmName)} />
                <InfoRow icon={<User size={13} />}     label="Farmer ID"        value={na(farmer?.farmerId)} />
                <InfoRow icon={<Package size={13} />}  label="Variety"          value={na(lot?.variety)} />
                <InfoRow icon={<Package size={13} />}  label="Quantity"         value={lot?.quantityKg ? `${lot.quantityKg} kg` : 'Not Available'} />
                <InfoRow icon={<MapPin size={13} />}   label="Center"           value={na(center?.name)} />
                <InfoRow icon={<User size={13} />}     label="FPO"              value={na(fpo?.name)} />
                <InfoRow icon={<Calendar size={13} />} label="Inspection Date"  value={sess?.startedAt ? new Date(sess.startedAt).toLocaleString() : 'Not Available'} />
                <InfoRow icon={<FileText size={13} />} label="Status"           value={na(sess?.workflowState || sess?.status)} />
                {fusion && <>
                  <InfoRow icon={<ShieldCheck size={13} />} label="Final Grade"   value={na(fusion.grade)} highlight />
                  <InfoRow icon={<GitMerge size={13} />}   label="Quality Score"  value={fusion.finalScore != null ? `${fusion.finalScore}/100` : 'Not Available'} highlight />
                </>}
              </div>

              {/* Evidence sources */}
              {fusion && (
                <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4">
                  <EvidenceBadge icon={<Eye size={13} />}     label="AI Vision"        done={!!fusion.visionScore} />
                  <EvidenceBadge icon={<Wind size={13} />}    label="IoT Assessment"   done={!!fusion.gasScore} />
                  <EvidenceBadge icon={<GitMerge size={13} />} label="Quality Decision" done={isFinalized} />
                </div>
              )}
            </div>
          </div>

          {/* ── STATE 3: Not finalized ──────────────────────────────── */}
          {!isFinalized && (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <div className="text-sm font-bold text-ink">Assessment Not Finalized</div>
                  <p className="mt-1 text-sm text-muted">
                    Finalize the quality assessment in{' '}
                    <Link to="/quality/fusion" className="font-semibold text-forest hover:underline">
                      Fusion Intelligence
                    </Link>{' '}
                    before generating a certificate.
                  </p>
                </div>
              </div>
              <button
                disabled
                className="mt-4 flex items-center gap-2 rounded-xl bg-forest/40 px-6 py-3 text-[14px] font-extrabold text-white cursor-not-allowed"
              >
                <Award size={17} /> Generate Certificate
              </button>
            </Card>
          )}

          {/* ── STATE 4: Finalized, no certificate ──────────────────── */}
          {isFinalized && !certificate && !generating && (
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-fresh">
                    Ready to Issue
                  </div>
                  <h3 className="mt-1 text-lg font-extrabold text-ink">
                    Generate Official Certificate
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-muted">
                    The quality assessment is complete. Generate the official certificate for this inspection.
                    Once generated, the certificate is permanent and cannot be modified.
                  </p>
                  {fusion && (
                    <div className={`mt-3 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold ${gradeBg(fusion.grade)}`}>
                      <ShieldCheck size={15} />
                      <span className={gradeColor(fusion.grade)}>{fusion.grade}</span>
                      <span className="text-muted">·</span>
                      <span className="text-ink">{fusion.finalScore}/100</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 rounded-xl bg-forest px-7 py-3.5 text-[14px] font-extrabold text-white shadow-[0_4px_16px_-4px_rgba(11,93,59,0.45)] transition hover:bg-darkgreen"
                >
                  <Award size={17} /> Generate Certificate
                </button>
              </div>
            </Card>
          )}

          {/* ── STATE 5: Generating ─────────────────────────────────── */}
          {generating && (
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <Loader2 size={22} className="animate-spin text-forest" />
                <div>
                  <div className="text-sm font-bold text-ink">Generating Certificate…</div>
                  <p className="text-xs text-muted">
                    Creating and persisting the official quality certificate. Please wait.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ── STATE 6: Certificate exists ─────────────────────────── */}
          {isFinalized && certificate && !generating && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-border bg-forest/5 px-5 py-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-forest" />
                <span className="text-sm font-bold text-forest">Certificate Generated</span>
              </div>
              <div className="p-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[13px]">
                  <InfoRow icon={<Award size={13} />}    label="Certificate Number" value={na(certificate.certificateNumber)} highlight />
                  <InfoRow icon={<FileText size={13} />} label="Central Lot ID"     value={na(lot?.lotNumber || lot?.centralLotId)} />
                  <InfoRow icon={<FileText size={13} />} label="Inspection ID"      value={na(inspectionId?.slice(-12))} />
                  <InfoRow icon={<ShieldCheck size={13} />} label="Grade"           value={na(certificate.grade)} highlight />
                  <InfoRow icon={<GitMerge size={13} />} label="Quality Score"      value={certificate.qualityScore != null ? `${certificate.qualityScore}/100` : 'Not Available'} highlight />
                  <InfoRow icon={<Calendar size={13} />} label="Issued"             value={certificate.createdAt ? new Date(certificate.createdAt).toLocaleString() : 'Not Available'} />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => nav(`/certificate/${certificate.id}`)}
                    className="flex items-center gap-2 rounded-xl bg-forest px-6 py-3 text-[13.5px] font-extrabold text-white shadow-[0_4px_16px_-4px_rgba(11,93,59,0.40)] transition hover:bg-darkgreen"
                  >
                    <FileText size={16} /> View Certificate
                  </button>
                  <button
                    onClick={() => nav(`/certificate/${certificate.id}`)}
                    className="flex items-center gap-2 rounded-xl border border-forest/30 bg-white px-5 py-3 text-[13px] font-semibold text-forest transition hover:bg-sb-50"
                  >
                    <ArrowRight size={14} /> Open Full View
                  </button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </PageTransition>
  );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function InfoRow({ icon, label, value, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</div>
        <div className={`mt-0.5 truncate font-semibold ${highlight ? 'text-forest' : 'text-ink'}`}>{value}</div>
      </div>
    </div>
  );
}

function EvidenceBadge({ icon, label, done }: { icon: React.ReactNode; label: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all ${
      done ? 'border-forest/20 bg-forest/5 text-forest' : 'border-border bg-gray-50 text-muted opacity-60'
    }`}>
      {done ? <CheckCircle2 size={13} className="text-forest" /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-muted" />}
      {icon}
      {label}
    </div>
  );
}
