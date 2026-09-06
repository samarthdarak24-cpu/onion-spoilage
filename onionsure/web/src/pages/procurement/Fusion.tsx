import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitMerge,
  Eye,
  Wind,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  ShieldCheck,
  Cpu,
  Radio,
  FileCheck2,
  Calendar,
  Sparkles,
  RefreshCw,
  Scale,
  Award,
  AlertOctagon,
  ArrowDown,
  UserCheck,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Info,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, Spinner, ProgressBar } from '../../components/ui';
import type { FusionResult, FusionContextResponse, RuleTraceItem } from '../../lib/types';

// Pre-configured test scenarios to demonstrate engine behavior & reliability fallbacks
const SCENARIOS = {
  standard: {
    label: 'Standard Lot (Balanced Signals)',
    description: 'Clean optical scan & normal headspace volatile gas baseline. All rules pass for Grade A.',
    vision: { visionScore: 94, confidence: 0.95, counts: { healthy: 92, damaged: 4, rotten: 1, sprouted: 2, undersized: 1 } },
    gas: {
      stage: 'LOW',
      gasScore: 87,
      confidence: 0.92,
      readings: { temperature: 24.2, humidity: 60.5, co2: 430, ch4: 0.15, c2h4: 0.35, nh3: 0.10, moisture: 14.0, ph: 6.0 },
    },
    environment: { environmentScore: 90, confidence: 0.95, temperature: 24.2, humidity: 60.5 },
    forceDegraded: false,
  },
  earlySpoilage: {
    label: 'Early Internal Spoilage (Gas Alert)',
    description: 'Visual skin looks 94% healthy, but headspace sensors detect sharp volatile spikes. System triggers hidden rot alert & downgrades.',
    vision: { visionScore: 94, confidence: 0.95, counts: { healthy: 92, damaged: 4, rotten: 1, sprouted: 2, undersized: 1 } },
    gas: {
      stage: 'HIGH',
      gasScore: 45,
      confidence: 0.94,
      readings: { temperature: 28.5, humidity: 76.0, co2: 1250, ch4: 0.85, c2h4: 1.45, nh3: 0.58, moisture: 21.0, ph: 5.2 },
    },
    environment: { environmentScore: 65, confidence: 0.95, temperature: 28.5, humidity: 76.0 },
    forceDegraded: false,
  },
  sensorDegraded: {
    label: 'Sensor Degraded (Hardware Fallback)',
    description: 'IoT sensor SNR degrades or telemetry is out of envelope. Engine triggers Graceful Fallback (90% Vision, 10% Sensor) & flags physical check.',
    vision: { visionScore: 94, confidence: 0.95, counts: { healthy: 92, damaged: 4, rotten: 1, sprouted: 2, undersized: 1 } },
    gas: {
      stage: 'LOW',
      gasScore: 80,
      confidence: 0.20,
      mode: 'DEGRADED',
      readings: { temperature: 24.2, humidity: 60.5, co2: 430, ch4: 0.15, c2h4: 0.35, nh3: 0.10, moisture: 14.0, ph: 6.0 },
    },
    environment: { environmentScore: 85, confidence: 0.30, temperature: 24.2, humidity: 60.5 },
    forceDegraded: true,
  },
  highDefects: {
    label: 'High Defect Lot (Reject Trigger)',
    description: 'Optical analysis detects 22% total defects (severe rot & cuts). Engine rejects lot per standardized tolerance threshold.',
    vision: { visionScore: 58, confidence: 0.93, counts: { healthy: 78, damaged: 10, rotten: 6, sprouted: 3, undersized: 3 } },
    gas: {
      stage: 'MEDIUM',
      gasScore: 68,
      confidence: 0.88,
      readings: { temperature: 26.0, humidity: 68.0, co2: 780, ch4: 0.38, c2h4: 0.72, nh3: 0.28, moisture: 17.5, ph: 5.6 },
    },
    environment: { environmentScore: 78, confidence: 0.90, temperature: 26.0, humidity: 68.0 },
    forceDegraded: false,
  },
};

type ScenarioKey = keyof typeof SCENARIOS;

export default function Fusion() {
  const [scenario, setScenario] = useState<ScenarioKey>('standard');
  const [context, setContext] = useState<FusionContextResponse | null>(null);
  const [fusion, setFusion] = useState<FusionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [perspective, setPerspective] = useState<'officer' | 'farmer'>('officer');

  // Persistence State
  const [committing, setCommitting] = useState(false);
  const [committedRecord, setCommittedRecord] = useState<{ recordId: string; persistedAt: string } | null>(null);

  // Override Drawer State
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideGrade, setOverrideGrade] = useState<'GRADE A' | 'URS' | 'REJECTED'>('GRADE A');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  // Initial context load from backend
  useEffect(() => {
    let mounted = true;
    api.getFusionContext('ON-2026-00421')
      .then((ctx) => {
        if (mounted) {
          setContext(ctx);
          if (ctx.storedFusion) {
            setCommittedRecord({
              recordId: ctx.storedFusion.rulesVersion || 'FUS-COMMITTED',
              persistedAt: ctx.storedFusion.persistedAt || ctx.timestamp,
            });
          }
        }
      })
      .catch(() => {
        // graceful fallback if network fails
      });
    return () => { mounted = false; };
  }, []);

  // Compute fusion whenever scenario changes
  useEffect(() => {
    setLoading(true);
    const s = SCENARIOS[scenario];
    api.calculateFusion({
      vision: s.vision,
      gas: s.gas,
      environment: s.environment,
      forceDegraded: s.forceDegraded,
    })
      .then((res) => {
        setFusion(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [scenario]);

  const activeScenario = SCENARIOS[scenario];

  // Execute persistence
  const handleCommitDecision = async () => {
    if (!fusion || !context) return;
    setCommitting(true);
    try {
      const res = await api.commitFusion(context.inspectionId, context.lot?.id, fusion);
      setCommittedRecord({
        recordId: res.recordId,
        persistedAt: res.persistedAt,
      });
    } catch (e: any) {
      alert(`Commit error: ${e.message}`);
    } finally {
      setCommitting(false);
    }
  };

  // Execute manual override
  const handleApplyOverride = async () => {
    if (!overrideGrade || overrideReason.trim().length < 5) {
      setOverrideError('Override requires a justification reason (minimum 5 characters).');
      return;
    }
    if (!context) return;
    setOverrideBusy(true);
    setOverrideError('');
    try {
      await api.overrideInspection(context.inspectionId, {
        newGrade: overrideGrade,
        reason: overrideReason.trim(),
      });
      // update local fusion state
      setFusion((prev) => prev ? {
        ...prev,
        grade: overrideGrade,
        humanOverridden: true,
        originalGrade: prev.grade,
        overrideReason: overrideReason.trim(),
      } : null);
      setOverrideOpen(false);
      setOverrideReason('');
    } catch (e: any) {
      setOverrideError(e.message || 'Failed to submit override.');
    } finally {
      setOverrideBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. VISUAL HEADING & SUBTITLE                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-fresh">
            <Cpu size={14} /> Backend AI Decision Engine
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink md:text-3xl">
            FUSION INTELLIGENCE
          </h1>
          <p className="mt-1 text-sm font-medium text-muted">
            Combining visual evidence and environmental signals into one explainable quality decision.
          </p>
        </div>

        {/* Perspective Selector (Officer vs Farmer) */}
        <div className="flex items-center gap-1 rounded-2xl border border-emerald-900/10 bg-surface p-1.5 shadow-xs">
          <button
            onClick={() => setPerspective('officer')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              perspective === 'officer'
                ? 'bg-forest text-white shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <ShieldCheck size={14} />
            Officer Deep AI View
          </button>
          <button
            onClick={() => setPerspective('farmer')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              perspective === 'farmer'
                ? 'bg-fresh text-forest font-extrabold shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Sparkles size={14} />
            Farmer Transparent View
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. METADATA HEADER BAR (AS SPECIFIED BY USER)                 */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-surface via-[#FAF9F5] to-surface p-4 shadow-soft">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 text-xs">
          {/* CENTRAL LOT ID */}
          <div className="border-r border-border/70 pr-3 last:border-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Central Lot ID</div>
            <div className="mt-1 font-mono text-sm font-black text-ink">
              {context?.centralLotId || 'ON-2026-00421'}
            </div>
            <div className="mt-0.5 text-[10px] text-muted truncate">Nashik Red · 1,500 kg</div>
          </div>

          {/* INSPECTION */}
          <div className="border-r border-border/70 pr-3 last:border-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Inspection</div>
            <div className="mt-1 font-mono text-sm font-bold text-forest">
              {context?.inspectionNumber || 'INS-000421'}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">4-Angle Optical Sample</div>
          </div>

          {/* STATUS */}
          <div className="border-r border-border/70 pr-3 last:border-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Status</div>
            <div className="mt-1">
              {committedRecord ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-forest">
                  <CheckCircle2 size={12} /> PERSISTED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  <Radio size={12} className="animate-pulse" /> READY FOR FUSION
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">
              {committedRecord ? 'Committed in Registry' : 'Active Intake Evaluation'}
            </div>
          </div>

          {/* RULESET */}
          <div className="border-r border-border/70 pr-3 last:border-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Ruleset</div>
            <div className="mt-1 font-mono text-xs font-bold text-ink">
              {context?.rulesVersion || 'ONION_STANDARD_2026_V1'}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">National Standard PS 26031</div>
          </div>

          {/* AI MODEL */}
          <div className="border-r border-border/70 pr-3 last:border-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">AI Model</div>
            <div className="mt-1 font-semibold text-ink">
              {context?.aiModel || 'OnionSure Vision v1.4'}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">Multimodal Transformer</div>
          </div>

          {/* TIMESTAMP */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Timestamp</div>
            <div className="mt-1 font-mono text-xs font-semibold text-ink flex items-center gap-1">
              <Calendar size={12} className="text-muted" />
              {context?.timestamp || '06 Sep 2026 • 03:42 PM'}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">Calibrated Sync</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SCENARIO & RELIABILITY TEST TOGGLES                            */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
            <SlidersHorizontal size={14} className="text-fresh" />
            Decision Engine Test Scenarios & Modality Fallback:
          </div>
          <div className="text-[11px] text-muted">
            Test how standardized grading rules react to hidden spoilage or degraded telemetry.
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => {
            const sc = SCENARIOS[key];
            const isSelected = scenario === key;
            return (
              <button
                key={key}
                onClick={() => setScenario(key)}
                className={`flex flex-col text-left rounded-xl border p-3 transition ${
                  isSelected
                    ? 'border-forest bg-mint/50 shadow-xs ring-1 ring-forest'
                    : 'border-border bg-white hover:border-forest/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-forest' : 'text-ink'}`}>
                    {sc.label}
                  </span>
                  {isSelected && <span className="h-2 w-2 rounded-full bg-fresh" />}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted line-clamp-2">
                  {sc.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {loading || !fusion ? (
        <div className="grid place-items-center py-24">
          <Spinner label="Executing Backend Multimodal Decision Engine..." />
        </div>
      ) : (
        <>
          {/* ------------------------------------------------------------- */}
          {/* CRITICAL ALERTS (e.g. Early Spoilage or Degraded Sensor)       */}
          {/* ------------------------------------------------------------- */}
          {fusion.earlySpoilageAlert && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-4 shadow-sm"
            >
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={24} />
              <div>
                <div className="text-sm font-extrabold text-amber-900">
                  ⚠ EARLY SPOILAGE RISK DETECTED (Visual / Olfactory Conflict)
                </div>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">
                  Outer optical appearance shows a high healthy score ({fusion.visionScore}/100), but volatile headspace gas telemetry indicates active anaerobic decomposition (Stage HIGH). Standardized grading rules have flagged hidden internal rot and downgraded the lot.
                </p>
              </div>
            </motion.div>
          )}

          {fusion.calculationTrace?.dynamicFallbackApplied && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-2xl border-2 border-blue-400 bg-blue-50/90 p-4 shadow-sm"
            >
              <Info className="mt-0.5 shrink-0 text-blue-600" size={24} />
              <div>
                <div className="text-sm font-extrabold text-blue-950">
                  ℹ DYNAMIC RELIABILITY FALLBACK APPLIED ({fusion.calculationTrace.fallbackMode})
                </div>
                <p className="mt-1 text-xs leading-relaxed text-blue-800">
                  {fusion.calculationTrace.fallbackReason}
                </p>
              </div>
            </motion.div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 3. PRIMARY VISUAL FLOW PIPELINE (AS REQUESTED)                 */}
          {/* ------------------------------------------------------------- */}
          <div className="flex flex-col items-center">
            {/* Header: QUALITY SIGNALS */}
            <div className="mb-4 text-center">
              <span className="inline-block rounded-full bg-forest/10 px-4 py-1 font-mono text-xs font-black uppercase tracking-widest text-forest">
                QUALITY SIGNALS
              </span>
            </div>

            {/* Pipeline Container */}
            <div className="w-full max-w-3xl space-y-4">
              {/* --------------------------------------------------------- */}
              {/* STAGE 1: COMPUTER VISION                                  */}
              {/* --------------------------------------------------------- */}
              <div className="relative rounded-2xl border-2 border-forest/20 bg-white p-5 shadow-soft transition hover:border-forest/50">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-forest">
                      <Eye size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-ink">
                        COMPUTER VISION
                      </div>
                      <div className="text-[11px] text-muted">
                        Sample Size: 100 Bulbs · Model: OnionSure Vision v1.4 · 4 Angles
                      </div>
                    </div>
                  </div>
                  <Badge tone="forest">OPTICAL VALIDATED</Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-mint/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Vision Score</div>
                    <div className="mt-1 font-mono text-2xl font-black text-forest">
                      {fusion.visionScore} <span className="text-xs font-normal text-muted">/ 100</span>
                    </div>
                    <div className="mt-1 text-[10px] text-forest font-semibold">Surface Integrity</div>
                  </div>

                  <div className="rounded-xl bg-mint/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Confidence</div>
                    <div className="mt-1 font-mono text-2xl font-black text-forest">
                      {Math.round(fusion.visionConfidence * 100)}%
                    </div>
                    <div className="mt-1 text-[10px] text-muted">Optical Sharpness</div>
                  </div>

                  <div className="rounded-xl bg-mint/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Defects</div>
                    <div className="mt-1 font-mono text-2xl font-black text-reject">
                      {fusion.totalDefectsPercentage ?? 8}%
                    </div>
                    <div className="mt-1 text-[10px] text-muted">Total Flaws</div>
                  </div>
                </div>

                {/* Defect Breakdown Badges */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
                  <span className="text-[10px] font-bold uppercase text-muted">Breakdown:</span>
                  <span className="rounded-md bg-mint px-2 py-0.5 text-[11px] font-semibold text-forest">
                    Healthy: {fusion.defectBreakdown?.healthy ?? 92}%
                  </span>
                  <span className="rounded-md bg-amber/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    Damaged: {fusion.defectBreakdown?.damaged ?? 4}%
                  </span>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    Sprouted: {fusion.defectBreakdown?.sprouted ?? 2}%
                  </span>
                  <span className="rounded-md bg-reject/10 px-2 py-0.5 text-[11px] font-semibold text-reject">
                    Rotten: {fusion.defectBreakdown?.rotten ?? 1}%
                  </span>
                  <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                    Undersized: {fusion.defectBreakdown?.undersized ?? 1}%
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-muted">
                    Avg Size: 52.4 mm (Nashik Red)
                  </span>
                </div>
              </div>

              {/* Vertical Connector 1 */}
              <div className="flex flex-col items-center justify-center py-1">
                <div className="h-6 w-0.5 bg-gradient-to-b from-forest to-amber-500" />
                <ArrowDown size={18} className="text-amber-600 animate-bounce" />
              </div>

              {/* --------------------------------------------------------- */}
              {/* STAGE 2: GAS + ENVIRONMENT                                */}
              {/* --------------------------------------------------------- */}
              <div className="relative rounded-2xl border-2 border-amber-400/30 bg-white p-5 shadow-soft transition hover:border-amber-500/60">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber/15 text-amber-700">
                      <Wind size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-ink">
                        GAS + ENVIRONMENT
                      </div>
                      <div className="text-[11px] text-muted">
                        Headspace Volatiles & Storage Chamber Climate (8 Telemetry Channels)
                      </div>
                    </div>
                  </div>
                  {fusion.sensorValidation?.valid ? (
                    <Badge tone="forest">VALIDATED STREAM</Badge>
                  ) : (
                    <Badge tone="reject">DEGRADED TELEMETRY</Badge>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-amber/10 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Sensor Score</div>
                    <div className="mt-1 font-mono text-2xl font-black text-amber-700">
                      {fusion.sensorScore ?? fusion.gasScore} <span className="text-xs font-normal text-muted">/ 100</span>
                    </div>
                    <div className="mt-1 text-[10px] text-amber-800 font-semibold">
                      Gas {fusion.gasScore} · Env {fusion.environmentalScore}
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber/10 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Confidence</div>
                    <div className="mt-1 font-mono text-2xl font-black text-amber-700">
                      {Math.round((fusion.sensorConfidence ?? 0.92) * 100)}%
                    </div>
                    <div className="mt-1 text-[10px] text-muted">Signal-to-Noise Ratio</div>
                  </div>

                  <div className="rounded-xl bg-amber/10 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Spoilage Risk</div>
                    <div className={`mt-1 font-mono text-2xl font-black ${
                      fusion.spoilageRisk === 'HIGH' ? 'text-reject' : fusion.spoilageRisk === 'MEDIUM' ? 'text-amber-600' : 'text-forest'
                    }`}>
                      {fusion.spoilageRisk || 'LOW'}
                    </div>
                    <div className="mt-1 text-[10px] text-muted">Anaerobic VOC Status</div>
                  </div>
                </div>

                {/* 8-Channel Telemetry Grid */}
                <div className="mt-4 rounded-xl bg-[#F8F7F2] p-3 text-xs">
                  <div className="flex items-center justify-between pb-1.5 font-mono text-[10px] font-bold uppercase text-muted">
                    <span>8-Channel Calibrated Sensor Feed</span>
                    <span className={fusion.sensorValidation?.valid ? 'text-forest' : 'text-amber-700'}>
                      ● {fusion.sensorValidation?.message || 'Valid Operating Range'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1 font-mono text-[11px]">
                    <div className="rounded bg-white p-1.5 border border-border/60">
                      <span className="text-muted">C2H4: </span>
                      <b className="text-ink">{activeScenario.gas.readings.c2h4} ppm</b>
                    </div>
                    <div className="rounded bg-white p-1.5 border border-border/60">
                      <span className="text-muted">CH4: </span>
                      <b className="text-ink">{activeScenario.gas.readings.ch4} ppm</b>
                    </div>
                    <div className="rounded bg-white p-1.5 border border-border/60">
                      <span className="text-muted">NH3: </span>
                      <b className="text-ink">{activeScenario.gas.readings.nh3} ppm</b>
                    </div>
                    <div className="rounded bg-white p-1.5 border border-border/60">
                      <span className="text-muted">CO2: </span>
                      <b className="text-ink">{activeScenario.gas.readings.co2} ppm</b>
                    </div>
                    <div className="rounded bg-white p-1.5 border border-border/60">
                      <span className="text-muted">Temp: </span>
                      <b className="text-ink">{activeScenario.gas.readings.temperature}°C</b>
                    </div>
                    <div className="rounded bg-white p-1.5 border border-border/60">
                      <span className="text-muted">Humidity: </span>
                      <b className="text-ink">{activeScenario.gas.readings.humidity}%</b>
                    </div>
                    <div className="rounded bg-white p-1.5 border border-border/60">
                      <span className="text-muted">Moisture: </span>
                      <b className="text-ink">{activeScenario.gas.readings.moisture}%</b>
                    </div>
                    <div className="rounded bg-white p-1.5 border border-border/60">
                      <span className="text-muted">pH: </span>
                      <b className="text-ink">{activeScenario.gas.readings.ph}</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertical Connector 2 */}
              <div className="flex flex-col items-center justify-center py-1">
                <div className="h-6 w-0.5 bg-gradient-to-b from-amber-500 to-forest" />
                <ArrowDown size={18} className="text-forest animate-bounce" />
              </div>

              {/* --------------------------------------------------------- */}
              {/* STAGE 3: FUSION ENGINE                                    */}
              {/* --------------------------------------------------------- */}
              <div className="relative rounded-3xl border-2 border-forest bg-gradient-to-b from-[#0B3B24] to-[#062416] p-6 text-white shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-fresh">
                    <GitMerge size={20} /> FUSION ENGINE
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-emerald-200">
                    Confidence-Weighted Multimodal Decision Core
                  </span>
                </div>

                {/* 3-Way Input Convergence Box */}
                <div className="mt-5 grid gap-3 sm:grid-cols-3 text-center">
                  {/* Vision Input */}
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-3.5 backdrop-blur-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">
                      Vision Modality
                    </div>
                    <div className="mt-1 font-mono text-xl font-extrabold text-white">
                      {fusion.visionScore}
                      <span className="text-xs text-emerald-200/50"> / 100</span>
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-300 font-semibold">
                      Eff. Weight: {fusion.calculationTrace?.effectiveVisionWeightPct ?? 45.8}%
                    </div>
                    <div className="text-[10px] text-emerald-100/60">
                      Conf: {Math.round(fusion.visionConfidence * 100)}%
                    </div>
                  </div>

                  {/* Gas/Env Input */}
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-3.5 backdrop-blur-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">
                      Gas / Env Modality
                    </div>
                    <div className="mt-1 font-mono text-xl font-extrabold text-amber-200">
                      {fusion.sensorScore ?? fusion.gasScore}
                      <span className="text-xs text-amber-200/50"> / 100</span>
                    </div>
                    <div className="mt-1 text-[11px] text-amber-300 font-semibold">
                      Eff. Weight: {fusion.calculationTrace?.effectiveSensorWeightPct ?? 54.2}%
                    </div>
                    <div className="text-[10px] text-amber-100/60">
                      Conf: {Math.round((fusion.sensorConfidence ?? 0.92) * 100)}%
                    </div>
                  </div>

                  {/* Rule Set Input */}
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-3.5 backdrop-blur-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">
                      Standardized Rule Set
                    </div>
                    <div className="mt-1 font-mono text-sm font-extrabold text-fresh truncate">
                      {fusion.rulesVersion || 'ONION_STANDARD_2026_V1'}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-300 font-semibold">
                      5 Quality Checkpoints
                    </div>
                    <div className="text-[10px] text-emerald-100/60">
                      Central Registry Standard
                    </div>
                  </div>
                </div>

                {/* Mathematical Trace Box */}
                <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3.5 font-mono text-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-fresh">
                    <span className="flex items-center gap-1.5"><Scale size={12} /> Normalized Fusion Formula Trace</span>
                    <span className="text-white/60">Σ(W × C × Score) / Σ(W × C)</span>
                  </div>
                  <div className="mt-2 text-[11px] leading-relaxed text-emerald-100">
                    {fusion.calculationTrace?.formula || 'Mathematical calculation trace'}
                  </div>
                </div>
              </div>

              {/* Vertical Connector 3 */}
              <div className="flex flex-col items-center justify-center py-1">
                <div className="h-6 w-0.5 bg-gradient-to-b from-forest to-fresh" />
                <ArrowDown size={18} className="text-fresh animate-bounce" />
              </div>

              {/* --------------------------------------------------------- */}
              {/* STAGE 4: QUALITY DECISION (GRADE A / URS / REJECT)        */}
              {/* --------------------------------------------------------- */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500 bg-white p-6 shadow-soft text-center">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-muted">
                  FINAL QUALITY DECISION
                </div>

                {/* Main Grade Display */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                  <div className={`text-5xl font-black tracking-tight md:text-6xl ${
                    fusion.grade.includes('GRADE A')
                      ? 'text-forest'
                      : fusion.grade.includes('URS')
                      ? 'text-amber-600'
                      : 'text-reject'
                  }`}>
                    {fusion.grade}
                  </div>
                  {fusion.humanOverridden && (
                    <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-900">
                      OFFICER OVERRIDDEN
                    </span>
                  )}
                </div>

                {/* Final Score & Certainty */}
                <div className="mt-2 flex items-center justify-center gap-4 text-sm font-semibold text-ink">
                  <div>
                    Composite Score: <b className="text-forest text-lg font-mono">{fusion.finalScore} / 100</b>
                  </div>
                  <span className="text-muted">·</span>
                  <div>
                    Confidence: <b className="text-ink">{Math.round(fusion.confidence * 100)}%</b>
                  </div>
                  <span className="text-muted">·</span>
                  <div>
                    Risk: <b className={fusion.spoilageRisk === 'HIGH' ? 'text-reject' : 'text-forest'}>{fusion.spoilageRisk || 'LOW'}</b>
                  </div>
                </div>

                {/* Persistence Confirmation if committed */}
                {committedRecord && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-1.5 text-xs font-bold text-forest">
                    <CheckCircle2 size={14} /> Persisted to Central Registry (Record ID: <code className="font-mono">{committedRecord.recordId}</code>)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 4. DUAL PERSPECTIVE: OFFICER DEEP AI vs FARMER ADVISORY        */}
          {/* ------------------------------------------------------------- */}
          <div className="mt-8">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
                {perspective === 'officer' ? (
                  <>
                    <ShieldCheck className="text-forest" size={18} />
                    Officer Deep AI Explainability & Standardized Rule Trace
                  </>
                ) : (
                  <>
                    <Sparkles className="text-fresh" size={18} />
                    Farmer Transparent Quality Advisory (Plain Vernacular)
                  </>
                )}
              </h3>
              <span className="text-xs text-muted font-medium">
                Standard: <b className="text-ink">{fusion.rulesVersion || 'ONION_STANDARD_2026_V1'}</b>
              </span>
            </div>

            {/* PERSPECTIVE: OFFICER DEEP AI VIEW */}
            {perspective === 'officer' && (
              <div className="mt-4 space-y-4">
                {/* 5-Point Standardized Rule Verification Trace Table */}
                <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
                  <div className="bg-[#FAF9F5] px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-ink">
                      Standardized Quality Rule Matrix Trace (PS 26031)
                    </span>
                    <span className="text-[11px] text-muted">
                      5 Mandated Quality Checkpoints
                    </span>
                  </div>

                  <div className="divide-y divide-border text-xs">
                    {(fusion.rulesTrace || []).map((rule: RuleTraceItem, idx: number) => (
                      <div key={rule.id || idx} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-mint/10 transition">
                        <div className="space-y-1 max-w-lg">
                          <div className="flex items-center gap-2 font-bold text-ink">
                            <span className="font-mono text-[10px] text-muted">{rule.id}</span>
                            <span>{rule.title}</span>
                          </div>
                          <div className="text-[11px] text-muted">
                            Standard Threshold: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-ink">{rule.standard}</code>
                          </div>
                          <div className="text-[11px] text-emerald-800 font-medium">
                            Observed Telemetry: <b className="text-ink">{rule.actual}</b>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black uppercase ${
                            rule.status === 'PASSED'
                              ? 'bg-emerald-100 text-forest'
                              : rule.status === 'URS_QUALIFIED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-reject'
                          }`}>
                            {rule.status === 'PASSED' ? <CheckCircle2 size={12} /> : <AlertOctagon size={12} />}
                            {rule.status}
                          </span>
                          <div className="mt-1 text-[10px] text-muted">{rule.impact}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Diagnostic Memo */}
                <div className="rounded-2xl border border-emerald-900/10 bg-mint/30 p-4 text-xs leading-relaxed text-forest">
                  <div className="font-bold uppercase tracking-wider text-forest mb-1 flex items-center gap-1.5">
                    <BookOpen size={14} /> Official Inspection Diagnostic Memorandum:
                  </div>
                  <p className="text-ink">{fusion.officerExplanation || fusion.explanation}</p>
                </div>
              </div>
            )}

            {/* PERSPECTIVE: FARMER TRANSPARENT VIEW */}
            {perspective === 'farmer' && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Card 1: Why this grade */}
                <div className="rounded-2xl border border-border bg-white p-4 shadow-soft">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-forest">
                    1. Why This Grade?
                  </div>
                  <div className="mt-2 text-xl font-black text-ink">
                    {fusion.grade}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {fusion.farmerExplanation?.summary || 'Batch analyzed with transparent standards.'}
                  </p>
                </div>

                {/* Card 2: Bulb Quality */}
                <div className="rounded-2xl border border-border bg-white p-4 shadow-soft">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-forest">
                    2. Physical Bulb Condition
                  </div>
                  <div className="mt-2 text-sm font-bold text-ink">
                    Clean & Firm Outer Layers
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {fusion.farmerExplanation?.bulbQuality || 'Outer skins intact with uniform diameter standard.'}
                  </p>
                </div>

                {/* Card 3: Internal Freshness */}
                <div className="rounded-2xl border border-border bg-white p-4 shadow-soft">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-forest">
                    3. Internal Freshness & Smell
                  </div>
                  <div className="mt-2 text-sm font-bold text-ink">
                    Zero Hidden Rot Detected
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {fusion.farmerExplanation?.internalFreshness || 'Gas sensors confirm fresh core.'}
                  </p>
                </div>

                {/* Card 4: Price & Storage Advice */}
                <div className="rounded-2xl border border-border bg-white p-4 shadow-soft">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-forest">
                    4. Fair Price & Storage Advice
                  </div>
                  <div className="mt-2 text-sm font-bold text-forest">
                    100% MSP Qualification
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {fusion.farmerExplanation?.fairPriceImpact} {fusion.farmerExplanation?.storageAdvice}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 5. DECISION ACTIONS: COMMIT TO REGISTRY & HUMAN OVERRIDE       */}
          {/* ------------------------------------------------------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <div className="text-xs text-muted">
              {committedRecord ? (
                <span className="flex items-center gap-2 text-forest font-semibold">
                  <CheckCircle2 size={16} />
                  Decision committed to Central Registry at {committedRecord.persistedAt}
                </span>
              ) : (
                <span>Ready to commit official assessment to blockchain / central digital registry.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOverrideOpen(true)}
                className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
              >
                <UserCheck size={14} className="inline mr-1" />
                Officer Override
              </button>

              <button
                disabled={committing || Boolean(committedRecord)}
                onClick={handleCommitDecision}
                className={`rounded-xl px-5 py-2 text-xs font-extrabold shadow-sm transition ${
                  committedRecord
                    ? 'bg-mint text-forest cursor-default'
                    : 'bg-forest text-white hover:bg-darkgreen'
                }`}
              >
                {committing ? (
                  <Spinner label="Committing..." />
                ) : committedRecord ? (
                  <>✓ Decision Committed</>
                ) : (
                  <>Commit & Persist Decision</>
                )}
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* MODAL: OFFICER MANUAL OVERRIDE (AUDIT-CONTROLLED)              */}
          {/* ------------------------------------------------------------- */}
          <AnimatePresence>
            {overrideOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-border"
                >
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="text-base font-black text-ink flex items-center gap-2">
                      <UserCheck size={18} className="text-amber-600" />
                      Officer Manual Override
                    </div>
                    <button
                      onClick={() => setOverrideOpen(false)}
                      className="text-muted hover:text-ink text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-muted">
                    Overrides are logged with your Inspector ID and stored permanently in the audit trail.
                  </p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-ink">New Grade Selection</label>
                      <div className="mt-1.5 grid grid-cols-3 gap-2">
                        {(['GRADE A', 'URS', 'REJECTED'] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setOverrideGrade(g)}
                            className={`rounded-xl py-2 text-xs font-black transition border ${
                              overrideGrade === g
                                ? 'bg-forest text-white border-forest'
                                : 'bg-surface border-border text-ink hover:bg-mint/40'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ink">Mandatory Justification Rationale</label>
                      <textarea
                        rows={3}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="State physical evidence, calibration discrepancy, or sample cross-check finding..."
                        className="mt-1.5 w-full rounded-xl border border-border p-3 text-xs focus:border-forest focus:outline-none"
                      />
                      <div className="mt-1 text-[10px] text-muted">
                        Minimum 5 characters required for compliance audit.
                      </div>
                    </div>

                    {overrideError && (
                      <div className="rounded-lg bg-red-50 p-2 text-xs font-semibold text-reject">
                        {overrideError}
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setOverrideOpen(false)}
                        className="btn-ghost text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={overrideBusy}
                        onClick={handleApplyOverride}
                        className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-darkgreen"
                      >
                        {overrideBusy ? <Spinner label="Signing..." /> : 'Authorize & Sign Override'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
