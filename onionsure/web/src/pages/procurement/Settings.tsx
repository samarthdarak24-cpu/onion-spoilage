import React, { useEffect, useState } from 'react';
import { Settings as Gear, Save, ShieldAlert, SlidersHorizontal, Gauge, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Spinner } from '../../components/ui';

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    api.configFusion()
      .then(setCfg)
      .catch(() => setCfg({ weights: { vision: 0.45, gas: 0.35, environment: 0.2 }, grading: { gradeA: 85, urs: 65 } }))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="space-y-5">
        <Header />
        <div className="rounded-2xl border border-amber/25 bg-amber/5 p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber/15 text-amber-600">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="text-[15px] font-extrabold text-ink">Administrator access required</div>
              <p className="mt-1 max-w-2xl text-[13px] text-muted leading-relaxed">
                Fusion weights and grading thresholds are managed by administrators only.
                These values drive how vision, gas and environment scores combine into the final grade for every lot.
              </p>
              <ul className="mt-3 grid gap-1.5 text-[13px] text-muted sm:grid-cols-2">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Fusion modality weights</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Grade A &amp; URS thresholds</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Early-spoilage override logic</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Platform-wide grading policy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const save = async () => {
    setSaving(true); setMsg('');
    try { await api.updateConfigFusion(cfg); setMsg('Settings saved. Thresholds & weights updated.'); }
    catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  if (loading || !cfg) return (
    <div className="grid h-64 place-items-center">
      <Spinner label="Loading settings…" />
    </div>
  );

  const setW = (k: string, v: number) => setCfg({ ...cfg, weights: { ...cfg.weights, [k]: v } });
  const setG = (k: string, v: number) => setCfg({ ...cfg, grading: { ...cfg.grading, [k]: v } });

  const w = cfg.weights;
  const total = (w.vision + w.gas + w.environment) || 1;

  return (
    <div className="space-y-5">
      <Header />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Fusion weights */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest/10 text-forest">
              <SlidersHorizontal size={15} />
            </div>
            <div>
              <p className="font-extrabold text-ink text-[15px]">Fusion Weights</p>
              <p className="text-[12px] text-muted">Confidence-weighted modality contribution.</p>
            </div>
          </div>
          {Object.entries(cfg.weights).map(([k, v]: any) => (
            <div key={k} className="space-y-2">
              <div className="flex justify-between text-[13px] capitalize">
                <span className="font-semibold text-ink">{k}</span>
                <span className="font-extrabold text-forest">{Number(v).toFixed(2)}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05} value={v}
                onChange={(e) => setW(k, +e.target.value)}
                className="w-full h-2 rounded-full accent-forest cursor-pointer"
              />
            </div>
          ))}
          <div>
            <div className="flex justify-between text-[11px] text-muted mb-1.5">
              <span>Effective mix</span>
              <span>Σ = {total.toFixed(2)}</span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-[rgba(20,20,25,0.07)]">
              <div className="h-full bg-forest transition-all duration-300" style={{ width: `${(w.vision / total) * 100}%` }} />
              <div className="h-full bg-amber transition-all duration-300" style={{ width: `${(w.gas / total) * 100}%` }} />
              <div className="h-full bg-fresh transition-all duration-300" style={{ width: `${(w.environment / total) * 100}%` }} />
            </div>
            <div className="mt-2 flex gap-4 text-[11px] text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-forest" /> Vision {Math.round((w.vision / total) * 100)}%</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber" /> Gas {Math.round((w.gas / total) * 100)}%</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-fresh" /> Env {Math.round((w.environment / total) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Grading thresholds */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest/10 text-forest">
              <Gauge size={15} />
            </div>
            <div>
              <p className="font-extrabold text-ink text-[15px]">Grading Thresholds</p>
              <p className="text-[12px] text-muted">Final score cutoffs that decide each lot's grade.</p>
            </div>
          </div>
          <div>
            <label className="label">Grade A minimum score (≥)</label>
            <input type="number" className="input" value={cfg.grading.gradeA} onChange={(e) => setG('gradeA', +e.target.value)} />
          </div>
          <div>
            <label className="label">URS minimum score (≥)</label>
            <input type="number" className="input" value={cfg.grading.urs} onChange={(e) => setG('urs', +e.target.value)} />
          </div>
          <div className="rounded-xl bg-mint/40 border border-forest/10 p-4 space-y-2.5">
            <p className="text-[12px] font-bold text-ink mb-1">Resulting grade bands</p>
            <GradeRow color="bg-forest" range={`≥ ${cfg.grading.gradeA}`} label="GRADE A" />
            <GradeRow color="bg-amber"  range={`${cfg.grading.urs}–${cfg.grading.gradeA - 1}`} label="URS" />
            <GradeRow color="bg-reject" range={`< ${cfg.grading.urs}`} label="REJECTED" />
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-[rgba(20,20,25,0.08)] bg-white/90 p-3.5 backdrop-blur-md"
        style={{ boxShadow: '0 4px 24px rgba(20,20,25,0.10)' }}>
        <div className="flex items-center gap-2 text-[13px]">
          {msg ? (
            msg.includes('saved')
              ? <span className="flex items-center gap-1.5 font-semibold text-forest"><CheckCircle2 size={15} /> {msg}</span>
              : <span className="font-medium text-reject">{msg}</span>
          ) : (
            <span className="text-muted font-medium">Changes apply platform-wide immediately on save.</span>
          )}
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? <Spinner /> : <><Save size={15} /> Save Settings</>}
        </button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Management</p>
      <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl mt-0.5">
        <Gear size={20} className="text-fresh" /> Settings
      </h1>
      <p className="mt-0.5 text-[13px] text-muted">Tune fusion weights and grading thresholds.</p>
    </div>
  );
}

function GradeRow({ color, range, label }: { color: string; range: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${color}`} />
      <span className="w-20 font-bold text-ink">{label}</span>
      <span className="text-muted">score {range}</span>
    </div>
  );
}
