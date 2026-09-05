import React, { useEffect, useState } from 'react';
import { GitMerge, Eye, Wind, Thermometer, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, Spinner, ProgressBar } from '../../components/ui';
import { FusionFlow } from '../../components/animations';
import type { FusionResult } from '../../lib/types';

const SCENARIOS = {
  normal: {
    label: 'Healthy Batch',
    vision: { visionScore: 95, confidence: 0.95 },
    gas: { stage: 'LOW', gasScore: 90, confidence: 0.9 },
    environment: { environmentScore: 91, confidence: 0.95 },
  },
  early: {
    label: 'Early Spoilage (vision looks fine)',
    vision: { visionScore: 94, confidence: 0.95 },
    gas: { stage: 'HIGH', gasScore: 45, confidence: 0.9 },
    environment: { environmentScore: 91, confidence: 0.95 },
  },
};

export default function Fusion() {
  const [scenario, setScenario] = useState<'normal' | 'early'>('normal');
  const [fusion, setFusion] = useState<FusionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const s = SCENARIOS[scenario];
    api.calculateFusion(s).then(setFusion).catch(() => {}).finally(() => setLoading(false));
  }, [scenario]);

  const s = SCENARIOS[scenario];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Multimodal Engine</div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl"><GitMerge size={22} className="text-fresh" /> Quality Intelligence Fusion</h1>
          <p className="mt-0.5 text-sm text-muted">Confidence-weighted fusion of vision + gas + environment into one grade.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {(['normal', 'early'] as const).map((k) => (
            <button key={k} onClick={() => setScenario(k)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${scenario === k ? 'bg-forest text-white' : 'text-muted hover:text-ink'}`}>
              {SCENARIOS[k].label}
            </button>
          ))}
        </div>
      </div>

      {loading || !fusion ? (
        <div className="grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-mint/60" />)}
          <div className="h-56 animate-pulse rounded-2xl bg-mint/60 md:col-span-3" />
        </div>
      ) : (
        <>
          {fusion.earlySpoilageAlert && (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-amber bg-amber/10 p-4">
              <AlertTriangle className="mt-0.5 text-amber-600" size={22} />
              <div>
                <div className="font-bold text-amber-700">⚠ Early Spoilage Alert</div>
                <p className="text-sm text-amber-700/90">{fusion.explanation}</p>
              </div>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-3">
            <Panel icon={Eye} title="Vision" score={s.vision.visionScore} tone="forest" sub={`confidence ${Math.round(s.vision.confidence * 100)}%`} />
            <Panel icon={Wind} title="Gas" score={s.gas.gasScore} tone="amber" sub={`stage ${s.gas.stage}`} />
            <Panel icon={Thermometer} title="Environment" score={s.environment.environmentScore} tone="fresh" sub={`confidence ${Math.round(s.environment.confidence * 100)}%`} />
          </div>

          <Card className="flex flex-col items-center p-6">
            <FusionFlow>
              <div className="rounded-2xl bg-forest px-8 py-3 text-center text-white">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-100"><GitMerge size={16} /> Fusion Engine</div>
                <div className="mt-0.5 text-xs text-emerald-100/80">Vision {fusion.visionScore} · Gas {fusion.gasScore} · Env {fusion.environmentalScore}</div>
              </div>
            </FusionFlow>

            <div className="mt-5 grid w-full max-w-2xl gap-3">
              <ScoreBar label="Vision" value={fusion.visionScore} tone="forest" />
              <ScoreBar label="Gas" value={fusion.gasScore} tone="amber" />
              <ScoreBar label="Environment" value={fusion.environmentalScore} tone="fresh" />
            </div>

            <div className="mt-5 w-full max-w-2xl rounded-3xl bg-gradient-to-br from-darkgreen to-forest p-6 text-center text-white shadow-soft">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-100">Final Quality Score</div>
              <div className="text-6xl font-extrabold">{fusion.finalScore}<span className="text-2xl text-emerald-200">/100</span></div>
              <div className="mt-2"><Badge tone={fusion.grade === 'GRADE A' ? 'forest' : fusion.grade === 'URS' ? 'amber' : 'reject'} className={fusion.grade === 'GRADE A' ? 'bg-white/15 text-white' : ''}>{fusion.grade}</Badge></div>
              <div className="mt-3 text-sm text-emerald-100/85">Confidence {Math.round(fusion.confidence * 100)}% · Risk {fusion.riskLevel}</div>
            </div>

            <p className="mt-4 max-w-xl text-center text-sm text-muted">{fusion.explanation}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><SlidersHorizontal size={13} /> Weights are tuned by an administrator in <b className="text-ink">Settings</b>.</p>
          </Card>
        </>
      )}
    </div>
  );
}

function Panel({ icon: I, title, score, tone, sub }: { icon: any; title: string; score: number; tone: 'forest' | 'amber' | 'fresh'; sub: string }) {
  const colors: any = { forest: 'text-forest', amber: 'text-amber-600', fresh: 'text-fresh' };
  const barTone: any = { forest: 'forest', amber: 'amber', fresh: 'fresh' };
  return (
    <Card className="flex flex-col items-center text-center p-5">
      <div className={`mx-auto grid h-10 w-10 place-items-center rounded-xl bg-mint ${colors[tone]}`}><I size={20} /></div>
      <div className="mt-3 text-xs font-bold uppercase tracking-widest text-muted">{title}</div>
      <div className={`text-5xl font-extrabold ${colors[tone]}`}>{score}%</div>
      <div className="mt-3 w-full"><ProgressBar value={score} tone={barTone[tone]} /></div>
      <div className="mt-2 text-xs text-muted">{sub}</div>
    </Card>
  );
}

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: 'forest' | 'amber' | 'fresh' }) {
  const colors: any = { forest: 'bg-forest', amber: 'bg-amber', fresh: 'bg-fresh' };
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm font-semibold text-ink">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-mint">
        <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-bold text-ink">{value}</span>
    </div>
  );
}
