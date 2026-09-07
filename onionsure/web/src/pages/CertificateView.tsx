/**
 * CertificateView.tsx
 *
 * Official A4-style Quality Certificate.
 * Loaded at /certificate/:id  (public, no auth required)
 *
 * KEY RULES:
 *  - Every value comes from the backend response.
 *  - If a value is null / undefined → "Not Available".
 *  - NO hardcoded fallback numbers (no 91, 94, 72, 'GRADE A', 'Ramesh', etc.).
 *  - QR encodes the CERTIFICATE NUMBER so /verify/:certificateNumber works.
 *  - Print CSS hides everything except the certificate document.
 */

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, Printer, QrCode, ShieldCheck, ShieldAlert,
  Award, Eye, Wind, GitMerge, Activity, FileText,
  Calendar, MapPin, User, Package, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { api } from '../lib/api';
import { Spinner } from '../components/ui';

/* ── helpers ────────────────────────────────────────────────────── */

/** Show the value, or "Not Available" if absent. Never invent data. */
const na = (v: any): string => (v != null && v !== '' ? String(v) : 'Not Available');

const fmt = (iso: string | null | undefined) => {
  if (!iso) return 'Not Available';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' · '
      + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return 'Not Available'; }
};

const gradeAccent = (grade: string) => {
  if (!grade) return { bar: '#6b7280', text: '#374151', bg: '#f9fafb' };
  if (grade.includes('GRADE A')) return { bar: '#0B5D3B', text: '#06452C', bg: '#f0faf4' };
  if (grade.includes('URS'))     return { bar: '#d97706', text: '#92400e', bg: '#fffbeb' };
  return { bar: '#dc2626', text: '#991b1b', bg: '#fff1f2' };
};

const pctBar = (v: number | null | undefined, color: string) =>
  v != null ? (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div style={{ width: `${Math.min(100, v)}%`, background: color }} className="h-full rounded-full" />
    </div>
  ) : null;

/* ── Row sub-component ──────────────────────────────────────────── */
function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2 text-xs leading-relaxed">
      <span className="w-40 shrink-0 font-medium text-gray-500">{label}</span>
      <span className="text-gray-400 shrink-0">:</span>
      <span className={`font-semibold text-gray-800 break-all ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</span>
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────────── */
function SectionHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-emerald-100 pb-1.5 mb-3">
      <span className="text-[#0B5D3B]">{icon}</span>
      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0B5D3B]">{title}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function CertificateView() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [err,  setErr]  = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    const load = () =>
      api.getCertificate(id)
        .then(d  => active && setData(d))
        .catch(e => active && setErr(e.message));
    load();
    // Refresh every 15 s (in case data arrives after loading)
    const iv = setInterval(load, 15000);
    return () => { active = false; clearInterval(iv); };
  }, [id]);

  /* ── Error state ──────────────────────────────────────────────── */
  if (err) return (
    <div className="grid min-h-screen place-items-center bg-gray-50 p-6 text-center print:hidden">
      <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-lg max-w-md">
        <ShieldAlert size={40} className="mx-auto text-red-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Certificate Error</h2>
        <p className="mt-2 text-sm text-gray-500">{err}</p>
        <Link to="/quality/certificates" className="btn-primary mt-6 text-sm inline-block">
          ← Back to certificates
        </Link>
      </div>
    </div>
  );

  /* ── Loading state ────────────────────────────────────────────── */
  if (!data) return (
    <div className="grid min-h-screen place-items-center bg-gray-50 print:hidden">
      <Spinner label="Loading Certificate…" />
    </div>
  );

  /* ── Extract backend data — NO fallbacks to fake values ───────── */
  const {
    certificate: c,
    lot,
    fusion,
    center,
    fpo,
    farmer,
    inspector,
    session: sess,
    defectCounts,
  } = data;

  if (!c) return (
    <div className="grid min-h-screen place-items-center bg-gray-50 p-6 text-center print:hidden">
      <p className="text-sm text-gray-500">Certificate data is missing.</p>
      <Link to="/quality/certificates" className="btn-primary mt-4 text-sm inline-block">← Back</Link>
    </div>
  );

  /* QR — encode the CERTIFICATE NUMBER so /verify/:certNumber works */
  const certNumber  = c.certificateNumber || null;
  const qrValue     = certNumber
    ? `${window.location.origin}/verify/${encodeURIComponent(certNumber)}`
    : null;

  const accent = gradeAccent(c.grade || '');

  /* Grade distribution */
  const gradeAPct   = c.grade_a_percentage   ?? null;
  const ursPct      = c.urs_percentage       ?? null;
  const rejectedPct = c.rejected_percentage  ?? null;

  /* Fusion scores */
  const visionScore  = fusion?.visionScore    ?? null;
  const gasScore     = fusion?.gasScore       ?? null;
  const envScore     = fusion?.environmentalScore ?? null;
  const fusionScore  = fusion?.finalScore     ?? null;
  const confidence   = fusion?.confidence != null ? Math.round(fusion.confidence * 100) : null;
  const spoilageRisk = fusion?.spoilageRisk   || fusion?.riskLevel || null;

  /* Evidence presence flags (no invention) */
  const hasVision    = visionScore != null;
  const hasIoT       = gasScore    != null;
  const hasDecision  = fusion      != null;

  /* Why this grade — real reasons from grading engine */
  const reasons: string[] = fusion?.reasons?.length > 0
    ? fusion.reasons
    : [];

  /* ── RENDER ───────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Print-only global style ───────────────────────────────── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #cert-document, #cert-document * { display: revert !important; }
          #cert-document {
            position: fixed; inset: 0;
            margin: 0; padding: 0;
            width: 210mm; min-height: 297mm;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* ── Action bar (hidden on print) ─────────────────────────── */}
      <div className="print:hidden mx-auto max-w-4xl mb-5 flex items-center justify-between gap-3 px-4 pt-5">
        <Link
          to="/quality/certificates"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B5D3B] hover:text-[#06452C] transition"
        >
          <ArrowLeft size={16} /> Back to certificates
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-emerald-300 px-4 py-2 text-sm font-semibold text-[#0B5D3B] shadow-sm hover:bg-emerald-50 transition"
          >
            <Printer size={16} /> Print / Save PDF
          </button>
          {certNumber && (
            <Link
              to={`/verify/${encodeURIComponent(certNumber)}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B5D3B] text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-[#06452C] transition"
            >
              <QrCode size={16} /> Verify
            </Link>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CERTIFICATE DOCUMENT
      ═══════════════════════════════════════════════════════════ */}
      <div
        id="cert-document"
        className="mx-auto max-w-4xl bg-white shadow-2xl print:shadow-none print:max-w-full print:rounded-none"
        style={{ fontFamily: '"Inter", "Segoe UI", sans-serif' }}
      >
        {/* Top accent bar */}
        <div style={{ height: 6, background: `linear-gradient(90deg, ${accent.bar}, #3FAE5A)` }} />

        <div className="p-8 sm:p-10 print:p-8">

          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-5">
            <div className="flex items-center gap-3">
              {/* OnionSure logo mark */}
              <div className="grid h-12 w-12 place-items-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg,#0B5D3B,#04331F)' }}>
                <svg viewBox="0 0 36 36" className="h-7 w-7">
                  <path d="M18 3c0 0-5 5-5 12 0 4.5 2.5 8 5 10 2.5-2 5-5.5 5-10 0-7-5-12-5-12z" fill="#3FAE5A" />
                  <circle cx="18" cy="22" r="9" fill="#0B5D3B" />
                  <path d="M18 15c-3.5 4-4 9 0 13 4-4 3.5-9 0-13z" fill="#A7F3D0" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight text-[#0B4A2D]">OnionSure</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#226E37]">Quality Intelligence</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Certificate No.</div>
              <div className="font-mono text-sm font-extrabold text-[#0B4A2D]">{na(certNumber)}</div>
            </div>
          </div>

          {/* ── Title ───────────────────────────────────────────── */}
          <div className="my-5 text-center">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-[#06452C]">
              Onion Quality Certificate
            </h1>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
              AI-Assisted Quality Assessment &amp; Traceability
            </p>
          </div>

          {/* ── Grade hero + QR ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

            {/* Grade card — spans 2 cols */}
            <div
              className="sm:col-span-2 rounded-2xl p-5 flex items-center justify-between"
              style={{ background: accent.bg, border: `1.5px solid ${accent.bar}30` }}
            >
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 mb-1">
                  Final Quality Grade
                </div>
                <div
                  className="text-3xl sm:text-4xl font-black tracking-tight"
                  style={{ color: accent.text }}
                >
                  {na(c.grade)}
                </div>
                <div className="mt-1 text-lg font-black" style={{ color: accent.bar }}>
                  {c.qualityScore != null ? `${c.qualityScore} / 100` : 'Not Available'}
                </div>

                {/* Grade distribution bar */}
                {(gradeAPct != null || ursPct != null || rejectedPct != null) && (
                  <div className="mt-3 space-y-1.5 max-w-xs">
                    {gradeAPct != null && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="w-16 text-gray-500">Grade A</span>
                        {pctBar(gradeAPct, '#0B5D3B')}
                        <span className="w-9 text-right font-bold text-gray-700">{gradeAPct}%</span>
                      </div>
                    )}
                    {ursPct != null && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="w-16 text-gray-500">URS</span>
                        {pctBar(ursPct, '#d97706')}
                        <span className="w-9 text-right font-bold text-gray-700">{ursPct}%</span>
                      </div>
                    )}
                    {rejectedPct != null && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="w-16 text-gray-500">Rejected</span>
                        {pctBar(rejectedPct, '#dc2626')}
                        <span className="w-9 text-right font-bold text-gray-700">{rejectedPct}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confidence + Spoilage Risk */}
              <div className="hidden sm:flex flex-col items-end gap-3 text-right">
                {confidence != null && (
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">AI Confidence</div>
                    <div className="text-2xl font-black text-gray-800">{confidence}%</div>
                  </div>
                )}
                {spoilageRisk && (
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Spoilage Risk</div>
                    <div className={`text-lg font-black ${
                      spoilageRisk === 'LOW' ? 'text-[#0B5D3B]' :
                      spoilageRisk === 'MEDIUM' ? 'text-amber-600' : 'text-red-600'
                    }`}>{spoilageRisk}</div>
                  </div>
                )}
              </div>
            </div>

            {/* QR card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col items-center justify-center text-center">
              {qrValue ? (
                <>
                  <div className="p-1 border border-gray-100 rounded-lg shadow-inner bg-white">
                    <QRCodeSVG
                      value={qrValue}
                      size={100}
                      bgColor="#ffffff"
                      fgColor="#06452C"
                      level="M"
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-gray-500 font-medium">Scan to verify</div>
                  <div className="mt-1.5 flex items-center gap-1 rounded-full bg-[#0B5D3B] px-2.5 py-0.5 text-[10px] font-black text-white">
                    <CheckCircle2 size={10} strokeWidth={3} /> CERTIFICATE
                  </div>
                  <div className="mt-1 font-mono text-[9px] text-gray-400 break-all">{certNumber}</div>
                </>
              ) : (
                <div className="text-[11px] text-gray-400">QR Not Available</div>
              )}
            </div>
          </div>

          {/* ── Reassessment / Override banners ──────────────────── */}
          {(c.isReassessment || c.reassessmentNote) && (
            <div className="mb-4 rounded-xl border-2 border-purple-300 bg-purple-50 px-4 py-3 flex items-start gap-3">
              <span className="rounded bg-purple-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shrink-0">Reassessment</span>
              <p className="text-xs text-purple-800">
                {fusion?.previousGrade && <>Original Grade: <s>{fusion.previousGrade}</s> → Reassessed: <b>{c.grade}</b>. </>}
                {c.reassessmentNote || fusion?.reassessmentReason || ''}
              </p>
            </div>
          )}
          {(c.overridden || fusion?.humanOverridden) && (
            <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <span className="rounded bg-amber-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shrink-0">Override</span>
              <p className="text-xs text-amber-800">
                Officer Override: "{c.overrideReason || fusion?.overrideReason || 'Authorized override'}"
                {(c.overriddenBy || fusion?.overriddenBy) && ` — ${c.overriddenBy || fusion?.overriddenBy}`}
              </p>
            </div>
          )}

          {/* ── 3-col info grid ──────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">

            {/* Certificate Information */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <SectionHead icon={<FileText size={14} />} title="Certificate" />
              <div className="space-y-1.5">
                <Row label="Certificate No."  value={na(certNumber)} mono />
                <Row label="Central Lot ID"   value={na(lot?.lotNumber || lot?.centralLotId)} mono />
                <Row label="Inspection ID"    value={na(sess?.id || c.inspectionId)} mono />
                <Row label="Issued"           value={fmt(c.createdAt)} />
                <Row label="Inspection Date"  value={fmt(sess?.completedAt || sess?.startedAt)} />
              </div>
            </div>

            {/* Farmer / Lot */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <SectionHead icon={<User size={14} />} title="Farmer &amp; Lot" />
              <div className="space-y-1.5">
                <Row label="Farmer"           value={na(farmer?.fullName || farmer?.name || farmer?.farmName)} />
                <Row label="Farmer ID"        value={na(farmer?.farmerId)} />
                <Row label="FPO"              value={na(fpo?.name)} />
                <Row label="Variety"          value={na(lot?.variety)} />
                <Row label="Quantity"         value={lot?.quantityKg != null ? `${lot.quantityKg} kg` : 'Not Available'} />
                <Row label="Center"           value={na(center?.name)} />
              </div>
            </div>

            {/* Assessment Summary */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <SectionHead icon={<GitMerge size={14} />} title="Assessment" />
              <div className="space-y-1.5">
                {visionScore != null && <Row label="Vision Score"    value={`${visionScore} / 100`} />}
                {gasScore    != null && <Row label="IoT Score"       value={`${gasScore} / 100`}    />}
                {envScore    != null && <Row label="Env Score"       value={`${envScore} / 100`}    />}
                {fusionScore != null && <Row label="Fusion Score"    value={`${fusionScore} / 100`} />}
                {confidence  != null && <Row label="AI Confidence"   value={`${confidence}%`}       />}
                {spoilageRisk        && <Row label="Spoilage Risk"   value={na(spoilageRisk)}       />}
                {fusion?.rulesVersion && <Row label="Rules Version" value={na(fusion.rulesVersion)} />}
              </div>
            </div>
          </div>

          {/* ── Evidence sources ─────────────────────────────────── */}
          <div className="mb-5">
            <SectionHead icon={<Activity size={14} />} title="Assessment Sources" />
            <div className="flex flex-wrap gap-3">
              <EvidencePill icon={<Eye size={13} />}      label="AI Vision"        done={hasVision} />
              <EvidencePill icon={<Wind size={13} />}     label="IoT Assessment"   done={hasIoT}    />
              <EvidencePill icon={<GitMerge size={13} />} label="Quality Decision" done={hasDecision} />
            </div>
          </div>

          {/* ── Why This Grade ───────────────────────────────────── */}
          {reasons.length > 0 && (
            <div className="mb-5">
              <SectionHead icon={<ShieldCheck size={14} />} title="Why This Grade?" />
              <ul className="space-y-1.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#0B5D3B]" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Defect counts (only if data exists) ──────────────── */}
          {defectCounts && Object.values(defectCounts).some(v => (v as number) > 0) && (
            <div className="mb-5">
              <SectionHead icon={<Eye size={14} />} title="Detected Defects" />
              <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
                {([
                  ['Healthy',    defectCounts.healthy,    '#0B5D3B'],
                  ['Damaged',    defectCounts.damaged,    '#d97706'],
                  ['Rotten',     defectCounts.rotten,     '#dc2626'],
                  ['Sprouted',   defectCounts.sprouted,   '#7c3aed'],
                  ['Undersized', defectCounts.undersized, '#0284c7'],
                ] as [string, number, string][]).map(([label, count, color]) => (
                  <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 py-2">
                    <div className="text-base font-black" style={{ color }}>{count ?? '—'}</div>
                    <div className="font-medium text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Officer explanation (if available) ───────────────── */}
          {(fusion?.officerExplanation || fusion?.explanation) && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#0B5D3B] mb-1.5">
                Official Assessment Memorandum
              </div>
              <p className="text-xs leading-relaxed text-gray-700">
                {fusion.officerExplanation || fusion.explanation}
              </p>
            </div>
          )}

          {/* ── Traceability ─────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-5">
            <SectionHead icon={<FileText size={14} />} title="Traceability" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Grading Standard" value={na(fusion?.rulesVersion)} />
              <Row label="Inspector"        value={na(inspector?.username || inspector?.name)} />
              <Row label="Center"           value={na(center?.name)} />
              <Row label="Issued"           value={fmt(c.createdAt)} />
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────── */}
          <div className="border-t border-gray-200 pt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[9px] text-gray-400 font-medium max-w-sm">
              This certificate is issued by the OnionSure AI Quality Intelligence Platform and represents
              the official quality assessment for the referenced inspection session.
            </div>
            <div className="text-[9px] font-mono text-gray-400">
              {na(certNumber)} · {fmt(c.createdAt)}
            </div>
          </div>

          {/* Print-only disclaimer */}
          <div className="hidden print:block mt-3 text-[8px] text-gray-400 text-center">
            Verify authenticity at: {qrValue || 'Not Available'}
          </div>

        </div>{/* /p-8 */}
      </div>{/* /cert-document */}
    </>
  );
}

/* ── Evidence pill ──────────────────────────────────────────────── */
function EvidencePill({ icon, label, done }: { icon: React.ReactNode; label: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11.5px] font-semibold ${
      done
        ? 'border-[#0B5D3B]/20 bg-[#0B5D3B]/5 text-[#0B5D3B]'
        : 'border-gray-200 bg-gray-50 text-gray-400 opacity-60'
    }`}>
      {done ? <CheckCircle2 size={13} /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-300" />}
      {icon}
      {label}
    </div>
  );
}
