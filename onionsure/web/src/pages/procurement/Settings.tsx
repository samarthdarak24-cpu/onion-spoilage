import React, { useEffect, useState } from 'react';
import { Settings as Gear, Save, ShieldAlert, SlidersHorizontal, Gauge, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Card, Spinner, ProgressBar, Badge } from '../../components/ui';

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    api.configFusion().then(setCfg).catch(() => setCfg({ weights: { vision: 0.45, gas: 0.35, environment: 0.2 }, grading: { gradeA: 85, urs: 65 } })).finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="space-y-5">
        <Header />
        <Card className="border-amber/30 bg-amber/5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber/15 text-amber-600"><ShieldAlert size={24} /></div>
            <div>
              <div className="text-lg font-extrabold text-ink">Administrator access required</div>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                Fusion weights and grading thresholds are managed by administrators only. These values drive how
                vision, gas and environment scores combine into the final grade for every lot.
              </p>
              <ul className="mt-3 grid gap-1.5 text-sm text-muted sm:grid-cols-2">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Fusion modality weights</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Grade A &amp; URS thresholds</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Early-spoilage override logic</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Platform-wide grading policy</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const save = async () => {
    setSaving(true); setMsg('');
    try { await api.updateConfigFusion(cfg); setMsg('Settings saved. Thresholds &amp; weights updated.'); }
    catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  if (loading || !cfg) return <div className="grid h-64 place-items-center"><Spinner label="Loading settings…" /></div>;

  const setW = (k: string, v: number) => setCfg({ ...cfg, weights: { ...cfg.weights, [k]: v } });
  const setG = (k: string, v: number) => setCfg({ ...cfg, grading: { ...cfg.grading, [k]: v } });

  const w = cfg.weights;
  const total = (w.vision + w.gas + w.environment) || 1;

  return (
    <div className="space-y-5">
      <Header />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-1 flex items-center gap-2 font-bold text-ink"><SlidersHorizontal size={18} className="text-fresh" /> Fusion Weights</div>
          <p className="mb-4 text-xs text-muted">Confidence-weighted contribution of each modality in the fusion engine.</p>
          {Object.entries(cfg.weights).map(([k, v]: any) => (
            <div key={k} className="mb-4">
              <div className="flex justify-between text-sm capitalize"><span className="font-medium text-ink">{k}</span><span className="font-semibold text-forest">{Number(v).toFixed(2)}</span></div>
              <input type="range" min={0} max={1} step={0.05} value={v} onChange={(e) => setW(k, +e.target.value)} className="mt-1.5 w-full accent-forest" />
            </div>
          ))}
          <div className="mt-1">
            <div className="mb-1 flex justify-between text-xs text-muted"><span>Effective mix</span><span>Σ {total.toFixed(2)}</span></div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-mint">
              <div className="h-full bg-forest" style={{ width: `${(w.vision / total) * 100}%` }} />
              <div className="h-full bg-amber" style={{ width: `${(w.gas / total) * 100}%` }} />
              <div className="h-full bg-fresh" style={{ width: `${(w.environment / total) * 100}%` }} />
            </div>
            <div className="mt-1.5 flex gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-forest" /> Vision {Math.round((w.vision / total) * 100)}%</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber" /> Gas {Math.round((w.gas / total) * 100)}%</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-fresh" /> Env {Math.round((w.environment / total) * 100)}%</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-1 flex items-center gap-2 font-bold text-ink"><Gauge size={18} className="text-fresh" /> Grading Thresholds</div>
          <p className="mb-4 text-xs text-muted">Final score cutoffs that decide each lot's grade.</p>
          <div className="mb-4">
            <label className="label">Grade A ≥</label>
            <input type="number" className="input" value={cfg.grading.gradeA} onChange={(e) => setG('gradeA', +e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="label">URS ≥</label>
            <input type="number" className="input" value={cfg.grading.urs} onChange={(e) => setG('urs', +e.target.value)} />
          </div>

          <div className="rounded-xl bg-mint p-3 text-sm">
            <div className="mb-2 font-semibold text-ink">Resulting grades</div>
            <div className="space-y-1.5">
              <GradeRow color="bg-forest" range={`≥ ${cfg.grading.gradeA}`} label="GRADE A" />
              <GradeRow color="bg-amber" range={`${cfg.grading.urs}–${cfg.grading.gradeA - 1}`} label="URS" />
              <GradeRow color="bg-reject" range={`< ${cfg.grading.urs}`} label="REJECTED" />
            </div>
          </div>
        </Card>
      </div>

      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 p-3 shadow-card backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          {msg ? (
            msg.includes('saved') ? <span className="flex items-center gap-1.5 font-medium text-forest"><CheckCircle2 size={16} /> {msg}</span>
              : <span className="font-medium text-reject">{msg}</span>
          ) : <span className="text-muted">Changes apply platform-wide on save.</span>}
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : <><Save size={16} /> Save Settings</>}</button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Management</div>
      <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl"><Gear size={22} className="text-fresh" /> Settings</h1>
      <p className="mt-0.5 text-sm text-muted">Tune fusion weights and grading thresholds.</p>
    </div>
  );
}

function GradeRow({ color, range, label }: { color: string; range: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="w-16 font-semibold text-ink">{label}</span>
      <span className="text-muted">score {range}</span>
    </div>
  );
}
