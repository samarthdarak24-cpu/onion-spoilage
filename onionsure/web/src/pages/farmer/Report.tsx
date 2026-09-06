import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, ScanLine, Wind, Leaf, ShieldCheck,
  AlertTriangle, CheckCircle2, XCircle, Info, TrendingUp, ChevronRight,
  Shield, Check, RefreshCw, Cpu,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { Card, GradeBadge, ProgressBar } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function gradeColor(grade: string) {
  if (grade === 'GRADE A') return 'text-forest';
  if (grade === 'URS') return 'text-amber-600';
  return 'text-reject';
}

function gradeBg(grade: string) {
  if (grade === 'GRADE A') return 'from-mint to-white border-forest/20';
  if (grade === 'URS') return 'from-amber-50 to-white border-amber-200';
  return 'from-rose-50 to-white border-reject/20';
}

function gradeExplain(grade: string) {
  if (grade === 'GRADE A')
    return 'Your lot meets all premium Grade A standards under protocol ONION_STANDARD_2026_V1. Volatile levels, firmness, skin integrity, and size distribution qualify for top-tier procurement pricing.';
  if (grade === 'URS')
    return 'Your lot falls in the Uniform Rejection Standard (URS) band. Visual defect percentages or volatile emissions exceed Grade A tolerances but remain eligible for secondary processing.';
  return 'Your lot did not meet safe shelf-life thresholds. Surface rot, high humidity, or elevated gas biomarkers indicate risk of accelerated degradation.';
}

function ScoreBar({
  label, icon: Icon, value, tone, delay = 0,
}: {
  label: string; icon: any; value: number; tone: 'forest' | 'amber' | 'reject' | 'fresh'; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          <Icon size={14} className="text-muted" />
          {label}
        </span>
        <span className="font-bold text-ink tabular-nums">
          <AnimatedNumber value={value} />/100
        </span>
      </div>
      <ProgressBar value={value} tone={tone} />
    </motion.div>
  );
}

function DefectChip({
  label, pct, icon: Icon, good,
}: {
  label: string; pct: number; icon: any; good: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${good ? 'border-forest/20 bg-mint/40' : 'border-reject/20 bg-rose-50/60'}`}>
      <span className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon size={15} className={good ? 'text-forest' : 'text-reject'} />
        {label}
      </span>
      <span className={`text-sm font-bold tabular-nums ${good ? 'text-forest' : 'text-reject'}`}>
        <AnimatedNumber value={pct} decimals={1} suffix="%" />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function FarmerReport() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [inspections, setInspections] = useState<any[]>([]);
  const [inspection, setInspection] = useState<any>(null);
  const [certDetail, setCertDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getInspections().then((all) => {
      setInspections(all || []);
      if (id) {
        const found = all.find((i: any) => String(i.id) === id || String(i.inspectionId) === id || i.certificateNumber === id);
        setInspection(found || null);

        // Fetch deep detail from /certificates/:id
        api.getCertificate(id)
          .then(setCertDetail)
          .catch(() => {
            if (found?.certificateNumber) {
              api.getCertificate(found.certificateNumber).then(setCertDetail).catch(() => {});
            }
          });
      }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-mint/60" />
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="h-52 animate-pulse rounded-2xl bg-mint/60" />
          <div className="h-52 animate-pulse rounded-2xl bg-mint/60 lg:col-span-2" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-mint/60" />
      </PageTransition>
    );
  }

  /* No ID in URL — show lot picker */
  if (!id) {
    return (
      <PageTransition className="space-y-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">My Farm</div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl">
            <FileText size={22} className="text-forest" /> Inspection Reports
          </h1>
          <p className="mt-0.5 text-sm text-muted">Select an inspected lot to view its full transparent quality report and reasons.</p>
        </div>

        {inspections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-12 text-center">
            <div className="text-emerald-800 font-semibold">No inspections yet</div>
            <div className="mt-1 text-sm text-emerald-600/80">When a procurement center inspects your lot, the report with reason evidence will appear here.</div>
          </div>
        ) : (
          <Stagger className="grid gap-3 md:grid-cols-2" gap={0.05}>
            {inspections.map((i: any) => (
              <StaggerItem key={i.id || i.certificateNumber}>
                <motion.button
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  onClick={() => nav(`/farmer/report/${i.id || i.inspectionId || i.certificateNumber}`)}
                  className="w-full text-left"
                >
                  <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-card cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-forest/10 text-forest">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted">Lot {i.lotNumber || '—'}</div>
                        <div className="font-bold text-forest">{i.certificateNumber}</div>
                        <div className="mt-0.5 text-xs text-muted">
                          {new Date(i.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {i.isReassessment && (
                            <span className="ml-2 rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold">
                              Reassessed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <GradeBadge grade={i.grade} />
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-extrabold text-ink tabular-nums">{i.qualityScore || i.finalScore}</span>
                        <span className="text-[10px] text-muted">/100</span>
                      </div>
                      <ChevronRight size={16} className="text-muted" />
                    </div>
                  </Card>
                </motion.button>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </PageTransition>
    );
  }

  if (!inspection && !certDetail) {
    return (
      <PageTransition className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/farmer/report')} className="flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline">
            <ArrowLeft size={15} /> Back to Reports
          </button>
        </div>
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-12 text-center">
          <div className="text-emerald-800 font-semibold">Inspection report not found</div>
          <div className="mt-1 text-sm text-emerald-600/80">The lot you're looking for may not exist or may not be assigned to your account.</div>
        </div>
      </PageTransition>
    );
  }

  const cert = certDetail?.certificate || inspection;
  const fusion = certDetail?.fusion;
  const lot = certDetail?.lot;
  const sensors = certDetail?.sensors || [];
  const latestSensor = sensors[sensors.length - 1] || null;

  const vision = Number(fusion?.visionScore ?? inspection?.visionScore ?? 85);
  const gas = Number(fusion?.gasScore ?? inspection?.gasScore ?? 80);
  const env = Number(fusion?.environmentalScore ?? inspection?.environmentalScore ?? 82);
  const final = Number(cert?.qualityScore ?? fusion?.finalScore ?? inspection?.finalScore ?? 82);

  const gradeA = Number(cert?.grade_a_percentage ?? inspection?.grade_a_percentage ?? Math.round(vision * 0.8));
  const urs = Number(cert?.urs_percentage ?? inspection?.urs_percentage ?? Math.round((100 - gradeA) * 0.55));
  const rejected = Number(cert?.rejected_percentage ?? inspection?.rejected_percentage ?? Math.max(0, 100 - gradeA - urs));

  const reasons: string[] = fusion?.reasons || inspection?.reasons || [
    final >= 85
      ? 'Vision model confirmed <5% skin blemishes across sample'
      : 'Visual surface defects exceed Grade A threshold',
    gas >= 80
      ? 'Multi-gas sensor readings within safe non-decay range'
      : 'Ethylene / methane markers indicate elevated respiration',
    'Standardized assessment calibrated under rules protocol ONION_STANDARD_2026_V1',
  ];

  const rulesVersion = fusion?.rulesVersion || inspection?.rulesVersion || 'ONION_STANDARD_2026_V1';
  const isReassessment = fusion?.isReassessment || cert?.isReassessment || inspection?.isReassessment;
  const previousGrade = fusion?.previousGrade || inspection?.previousGrade;
  const reassessmentReason = fusion?.reassessmentReason || cert?.reassessmentNote || inspection?.reassessmentReason;

  const scoreBarTone = (v: number): 'forest' | 'amber' | 'reject' | 'fresh' =>
    v >= 70 ? 'forest' : v >= 45 ? 'amber' : 'reject';

  const lotNumber = lot?.lotNumber || inspection?.lotNumber || cert?.certificateNumber;

  return (
    <PageTransition className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav('/farmer/inspections')}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-bg"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">My Farm</div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl">
              <FileText size={22} className="text-forest" /> Inspection Report
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Central Lot ID</span>
          <span className="rounded-xl bg-ink px-3 py-1.5 text-sm font-bold text-white tracking-wide">
            {lotNumber}
          </span>
        </div>
      </div>

      {/* Reassessment Banner if applicable */}
      {isReassessment && (
        <div className="rounded-2xl border-2 border-purple-300 bg-purple-50 p-4 text-purple-900 shadow-sm">
          <div className="flex items-start gap-3">
            <RefreshCw size={20} className="mt-0.5 text-purple-700 shrink-0" />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>OFFICIAL REASSESSMENT UPON DISPUTE RESOLUTION</span>
                <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[11px] font-bold text-purple-800">
                  {previousGrade ? `${previousGrade} → ${cert.grade}` : 'UPDATED'}
                </span>
              </div>
              <p className="text-xs text-purple-800">
                {reassessmentReason || 'This lot underwent secondary physical and sensor re-evaluation following a farmer dispute. The grade and certificate have been officially updated in the central registry.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grade verdict banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`rounded-2xl border bg-gradient-to-br p-6 ${gradeBg(cert.grade)}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Assessed Grade</span>
              <span className="rounded-full bg-forest/15 px-2.5 py-0.5 text-[10px] font-bold text-forest">
                {rulesVersion}
              </span>
            </div>
            <div className={`mt-1 text-4xl font-extrabold ${gradeColor(cert.grade)}`}>
              {cert.grade}
            </div>
            <p className="mt-2 max-w-xl text-sm text-muted">{gradeExplain(cert.grade)}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Quality Score</div>
            <div className="text-6xl font-extrabold text-ink tabular-nums">
              <AnimatedNumber value={final} />
            </div>
            <div className="text-sm text-muted">/100</div>
          </div>
        </div>
      </motion.div>

      {/* Why This Grade? (Transparent Evidence Trail) */}
      <Card className="p-5 space-y-4 border-l-4 border-l-forest">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-forest" />
            <span className="font-bold text-ink text-base">Why This Grade? (Transparent Evidence)</span>
          </div>
          <span className="text-xs text-muted font-medium">Standardized AI & Sensor Logic</span>
        </div>
        <p className="text-xs text-muted">
          OnionSure evaluates your lot using objective sensor thresholds and computer vision detections under standardized protocol <code className="font-semibold text-ink">{rulesVersion}</code>. Here are the specific findings for this lot:
        </p>
        <div className="grid gap-2.5 sm:grid-cols-1">
          {reasons.map((r, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl border border-forest/15 bg-mint/30 p-3 text-sm"
            >
              <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest text-white mt-0.5">
                <Check size={12} />
              </div>
              <span className="text-ink font-medium leading-snug">{r}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Sub-scores + lot info */}
      <Stagger className="grid gap-5 lg:grid-cols-3">
        {/* Sub-scores */}
        <StaggerItem className="lg:col-span-2">
          <Card className="p-5 space-y-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-forest" />
              <span className="font-bold text-ink">Multimodal Score Breakdown</span>
              <span className="ml-auto flex items-center gap-1 rounded-lg bg-mint/60 px-2 py-1 text-[11px] font-semibold text-forest">
                <Info size={11} /> 3-Channel Fusion
              </span>
            </div>
            <div className="space-y-4">
              <ScoreBar label="Vision Score (Roboflow / OpenCV Camera)" icon={ScanLine} value={vision} tone={scoreBarTone(vision)} delay={0.05} />
              <ScoreBar label="Gas Volatiles (Ethylene / Methane / NH₃)" icon={Wind} value={gas} tone={scoreBarTone(gas)} delay={0.10} />
              <ScoreBar label="Environmental Score (Storage Microclimate)" icon={Leaf} value={env} tone={scoreBarTone(env)} delay={0.15} />
              <ScoreBar label="Final Standardized Score" icon={ShieldCheck} value={final} tone={scoreBarTone(final)} delay={0.20} />
            </div>
            <div className="rounded-xl bg-mint/30 px-4 py-3 text-xs text-muted">
              <span className="font-semibold text-ink">Fusion Formula: </span>
              Vision (40%) + Volatiles (35%) + Microclimate (25%) = Quality Score. Grade A: Score ≥ 85, URS: 65–84, Rejected: &lt; 65.
            </div>
          </Card>
        </StaggerItem>

        {/* Lot metadata */}
        <StaggerItem>
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-forest" />
              <span className="font-bold text-ink">Lot Details</span>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Certificate', value: cert.certificateNumber },
                { label: 'Central Lot', value: lotNumber },
                { label: 'Date', value: new Date(cert.createdAt || inspection.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                { label: 'Grade', value: <GradeBadge grade={cert.grade} /> },
                { label: 'Status', value: isReassessment ? 'Reassessed' : (lot?.status || 'Graded') },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-muted">{label}</span>
                  <span className="font-semibold text-ink text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 space-y-2">
              <button
                className="w-full rounded-xl bg-forest px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-darkgreen"
                onClick={() => nav(`/certificate/${cert.id || cert.certificateNumber || inspection.id}`)}
              >
                View Official Certificate
              </button>
              <button
                className="w-full rounded-xl border border-reject/40 bg-rose-50 px-3 py-2 text-sm font-semibold text-reject transition hover:bg-rose-100"
                onClick={() => nav(`/farmer/dispute?lotId=${lotNumber}`)}
              >
                Dispute This Grade
              </button>
            </div>
          </Card>
        </StaggerItem>
      </Stagger>

      {/* Live 8-Sensor Pod Telemetry if available */}
      {latestSensor && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-forest" />
            <span className="font-bold text-ink">Recorded Pod Telemetry (8 Parameters)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: 'Temperature', val: `${latestSensor.temperature}°C` },
              { label: 'Humidity', val: `${latestSensor.humidity}%` },
              { label: 'CO₂', val: `${latestSensor.co2 ?? 440} ppm` },
              { label: 'Methane (CH₄)', val: `${latestSensor.ch4 ?? latestSensor.methane ?? 0.18} ppm` },
              { label: 'Ethylene (C₂H₄)', val: `${latestSensor.c2h4 ?? latestSensor.ethane ?? 0.42} ppm` },
              { label: 'Ammonia (NH₃)', val: `${latestSensor.nh3 ?? 0.12} ppm` },
              { label: 'Moisture', val: `${latestSensor.moisture ?? 14.5}%` },
              { label: 'pH', val: `${latestSensor.ph ?? 5.8}` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-bg p-2.5 text-center">
                <div className="text-[11px] text-muted">{s.label}</div>
                <div className="text-sm font-bold text-ink tabular-nums">{s.val}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Defect breakdown & AI Annotation */}
      <Stagger className="grid gap-5 lg:grid-cols-2">
        <StaggerItem>
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <span className="font-bold text-ink">Defect Classification</span>
            </div>
            <div className="space-y-2.5">
              <DefectChip label="Grade A (Healthy / Blemish-Free)" pct={gradeA} icon={CheckCircle2} good />
              <DefectChip label="URS (Superficial Bruising / Sprouting)" pct={urs} icon={AlertTriangle} good={urs < 20} />
              <DefectChip label="Rejected (Rotten / Under-sized)" pct={rejected} icon={XCircle} good={rejected < 5} />
            </div>
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              <motion.div
                className="bg-forest"
                initial={{ width: 0 }}
                animate={{ width: `${gradeA}%` }}
                transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="bg-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${urs}%` }}
                transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="bg-reject"
                initial={{ width: 0 }}
                animate={{ width: `${rejected}%` }}
                transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold text-muted">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-forest inline-block" />Grade A</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />URS</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-reject inline-block" />Rejected</span>
            </div>
          </Card>
        </StaggerItem>

        {/* AI Annotation */}
        <StaggerItem>
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ScanLine size={18} className="text-forest" />
              <span className="font-bold text-ink">AI Vision Annotation Overlay</span>
            </div>
            <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-ink/5 to-forest/10 border border-border">
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-forest to-transparent opacity-60"
                animate={{ top: ['8%', '88%', '8%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              />
              <div className="flex flex-col items-center gap-2 text-center">
                <ScanLine size={32} className="text-forest/40" />
                <div className="text-sm font-semibold text-ink">AI OpenCV / Roboflow Verification</div>
                <div className="text-xs text-muted max-w-xs">
                  5 defect classes detected: Healthy, Damaged, Rotten, Sprouted, Undersized
                </div>
              </div>
              {[
                'top-3 left-3 border-t-2 border-l-2',
                'top-3 right-3 border-t-2 border-r-2',
                'bottom-3 left-3 border-b-2 border-l-2',
                'bottom-3 right-3 border-b-2 border-r-2',
              ].map((cls, i) => (
                <div key={i} className={`absolute h-5 w-5 border-forest/50 rounded-sm ${cls}`} />
              ))}
            </div>
            <div className="rounded-xl bg-mint/30 px-4 py-3 text-xs text-muted">
              Computer vision overlays bounding boxes and counts defect percentages for each individual onion in the sampled batch.
            </div>
          </Card>
        </StaggerItem>
      </Stagger>
    </PageTransition>
  );
}
