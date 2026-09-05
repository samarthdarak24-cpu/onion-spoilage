import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, Upload, Image as ImgIcon, Sparkles, AlertTriangle, Layers, Ruler,
  Boxes, Leaf, Bug, Trash2, Sprout, CheckCircle2, Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import { Card, Badge, Spinner } from './ui';
import { DefectBars } from './charts';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from './motion';

/**
 * One AI inspector, reused by all three inspection roles (Procurement Officer,
 * FPO, Farmer). Talks to the OnionCheck detector through `/api/vision/analyze`
 * and draws the returned bounding boxes on top of the operator's own photo.
 */

const CLASS_COLOR: Record<string, string> = {
  healthy: '#3FAE5A',
  damaged: '#F4B942',
  rotten: '#D9534F',
  sprouted: '#8B5CF6',
  undersized: '#0EA5E9',
};
const CLASS_ICON: Record<string, any> = {
  healthy: Leaf, damaged: Bug, rotten: Trash2, sprouted: Sprout, undersized: Ruler,
};

function pickAnnotated(r: any): string | null {
  const raw = r?.annotatedImage || r?.annotated_image_url || r?.annotated_image_base64 || r?.annotated_image || null;
  if (!raw) return null;
  return String(raw).startsWith('data:') ? String(raw) : `data:image/jpeg;base64,${raw}`;
}
function pickOriginal(r: any): string | null {
  const raw = r?.originalImage || r?.original_image || r?.image_url || null;
  if (!raw) return null;
  return String(raw).startsWith('data:') || String(raw).startsWith('http') ? String(raw) : `data:image/jpeg;base64,${raw}`;
}

export default function InspectionStudio({
  role = 'officer',
  title = 'AI Vision Inspection',
  subtitle = 'Upload an onion photo — the OnionCheck detector scans for defects in real time.',
}: {
  role?: 'officer' | 'fpo' | 'farmer';
  title?: string;
  subtitle?: string;
}) {
  const [vision, setVision] = useState<any>(null);
  const [annotated, setAnnotated] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [source, setSource] = useState<string>('demo');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [fileName, setFileName] = useState('');
  const [view, setView] = useState<'overlay' | 'annotated'>('overlay');
  const [ppc, setPpc] = useState<number>(38);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyze = (file: File) => {
    setLoading(true); setErr(''); setFileName(file.name);
    api.visionAnalyzeImage(file, ppc)
      .then((r: any) => {
        setVision(r);
        setAnnotated(pickAnnotated(r));
        setOriginal(pickOriginal(r) || URL.createObjectURL(file));
        setSource(r.source || 'demo');
        setNote(r.note || '');
        setView('overlay');
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  const runDemo = () => {
    setLoading(true); setErr(''); setFileName('');
    api.visionAnalyze({ scenario: 'random' })
      .then((r: any) => {
        setVision(r); setAnnotated(null); setOriginal(null);
        setSource('demo'); setNote('Simulated batch — no image analysed.');
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  const detections: any[] = vision?.detections || [];
  const counts = vision?.counts || {};

  const sizeBuckets: Record<string, number> = { Small: 0, Medium: 0, Large: 0 };
  detections.forEach((d: any) => {
    const cat = String(d.sizeCategory || '').toLowerCase();
    if (cat.includes('small')) sizeBuckets.Small++;
    else if (cat.includes('medium')) sizeBuckets.Medium++;
    else if (cat) sizeBuckets.Large++;
    else {
      const cm = d.diameterCm != null ? d.diameterCm : (d.size != null ? d.size / 10 : null);
      if (cm == null) sizeBuckets.Medium++;
      else if (cm < 5) sizeBuckets.Small++;
      else if (cm < 7) sizeBuckets.Medium++;
      else sizeBuckets.Large++;
    }
  });
  const sizeData = Object.entries(sizeBuckets).map(([k, v]) => ({ name: k, value: v }));
  const baseImage = view === 'annotated' && annotated ? annotated : original || annotated;
  const live = source === 'onioncheck';

  return (
    <PageTransition className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">
            {role === 'officer' ? 'Procurement Officer' : role === 'fpo' ? 'FPO' : 'Farmer'} · Inspection
          </div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-emerald-950 md:text-2xl">
            <ScanLine size={22} className="text-fresh" /> {title}
          </h1>
          <p className="mt-0.5 text-sm text-emerald-700/80">{subtitle}</p>
        </div>
        <Badge tone={live ? 'forest' : 'amber'}>
          {live ? <><Sparkles size={12} /> ONIONCHECK LIVE</> : <><AlertTriangle size={12} /> DEMO MODE</>}
        </Badge>
      </div>

      {/* Controls */}
      <Card className="flex flex-wrap items-center gap-3">
        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className="btn-primary py-2.5 text-sm disabled:opacity-60">
          <Upload size={16} /> {loading ? 'Scanning…' : 'Upload Onion Image'}
        </button>
        <button onClick={runDemo} disabled={loading}
          className="btn-ghost py-2.5 text-sm disabled:opacity-60">
          <Sparkles size={16} /> Run Demo Scan
        </button>
        <label className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <Ruler size={13} className="text-fresh" /> Calibration
          <input type="number" min={1} max={100} step={1} value={ppc}
            onChange={(e) => setPpc(Math.max(1, Math.min(100, Number(e.target.value) || 38)))}
            className="w-16 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-emerald-900 outline-none focus:border-fresh" />
          px/cm
        </label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) analyze(f); }} />
        {fileName && <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700"><ImgIcon size={14} /> {fileName}</span>}
        {note && <span className="w-full text-xs text-emerald-600/90">{note}</span>}
      </Card>

      {err && <div className="rounded-xl border border-reject/20 bg-reject/5 px-4 py-3 text-sm text-reject">{err}</div>}
      {loading && <div className="grid h-40 place-items-center"><Spinner label="Running computer vision…" /></div>}

      {!loading && vision && (
        <Stagger className="grid gap-5 lg:grid-cols-2" gap={0.06}>
          {/* Image + boxes */}
          <StaggerItem className="h-full">
            <Card className="flex h-full flex-col p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Detection View</span>
                {annotated && (
                  <div className="flex gap-1 rounded-lg bg-emerald-50 p-0.5 text-xs">
                    <button onClick={() => setView('overlay')}
                      className={`rounded-md px-2 py-1 font-semibold transition ${view === 'overlay' ? 'bg-white text-forest shadow' : 'text-emerald-600'}`}>
                      <Layers size={11} className="mr-1 inline" /> Boxes
                    </button>
                    <button onClick={() => setView('annotated')}
                      className={`rounded-md px-2 py-1 font-semibold transition ${view === 'annotated' ? 'bg-white text-forest shadow' : 'text-emerald-600'}`}>
                      <ImgIcon size={11} className="mr-1 inline" /> Annotated
                    </button>
                  </div>
                )}
              </div>

              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-emerald-950">
                {baseImage ? (
                  <img src={baseImage} alt="Onion scan" className="h-full w-full object-contain" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-darkgreen to-forest">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 40%, #fff5, transparent 60%)' }} />
                    <div className="absolute inset-0 grid grid-cols-6 gap-2 p-6">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="h-full w-full rounded-full bg-gradient-to-br from-fresh to-forest opacity-80"
                          style={{ transform: `scale(${0.7 + (i % 3) * 0.1})` }} />
                      ))}
                    </div>
                    <div className="absolute bottom-2 left-2 chip bg-white/15 text-white backdrop-blur">DEMO SIMULATION</div>
                  </div>
                )}

                {baseImage && view === 'overlay' && live && detections.map((d: any, i: number) => {
                  const b = d.bbox || d.box || {};
                  if (!b || b.width == null || b.height == null) return null;
                  const color = CLASS_COLOR[d.class] || '#3FAE5A';
                  return (
                    <motion.div key={d.id || i}
                      initial={{ opacity: 0, scale: 1.08 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      className="pointer-events-none absolute rounded-[3px] border-2"
                      style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.width}%`, height: `${b.height}%`, borderColor: color }}>
                      <span className="absolute -top-[18px] left-0 whitespace-nowrap rounded px-1 text-[9px] font-bold leading-[15px] text-white" style={{ background: color }}>
                        {(d.label || d.class)} {Math.round((d.confidence ?? 0) * 100)}%
                      </span>
                    </motion.div>
                  );
                })}

                {baseImage && (
                  <div className="absolute bottom-2 left-2 chip bg-black/50 text-white backdrop-blur">
                    {live ? 'LIVE · ONIONCHECK' : 'DEMO'} · {detections.length} BOXES
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(CLASS_COLOR).map(([c, col]) => (
                  <span key={c} className="flex items-center gap-1 text-xs text-emerald-700">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />{c}
                  </span>
                ))}
              </div>
            </Card>
          </StaggerItem>

          {/* Results */}
          <StaggerItem className="h-full">
            <div className="flex h-full flex-col gap-5">
              <Card className="p-4">
                <div className="mb-2 flex items-center gap-2 font-bold text-emerald-950"><Boxes size={18} className="text-fresh" /> Detection Summary</div>
                <div className="grid grid-cols-2 gap-3">
                  <SummaryStat label="Total" value={vision.total} />
                  <SummaryStat label="Vision" value={`${vision.visionScore}/100`} />
                  {Object.entries(counts).map(([k, v]) => (
                    <SummaryStat key={k} label={k} value={v as number} color={CLASS_COLOR[k]} icon={CLASS_ICON[k]} />
                  ))}
                </div>
              </Card>

              {live && detections.length > 0 && (
                <Card className="p-4">
                  <div className="mb-2 flex items-center gap-2 font-bold text-emerald-950"><ScanLine size={18} className="text-fresh" /> Detected Defects</div>
                  <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                    {detections.map((d: any, i: number) => (
                      <div key={d.id || i} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-xs">
                        <span className="flex items-center gap-2 font-semibold text-emerald-900">
                          <i className="h-2 w-2 rounded-full" style={{ background: CLASS_COLOR[d.class] }} />
                          {d.label || d.class}
                          {d.severity != null && <span className="rounded bg-emerald-100 px-1 text-[10px] text-emerald-700">sev {d.severity}</span>}
                        </span>
                        <span className="text-emerald-600">
                          {d.confidence != null && <>{Math.round(d.confidence * 100)}% · </>}
                          {d.diameterCm != null ? `${d.diameterCm} cm` : d.size ? `${d.size} mm` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-4">
                <div className="mb-2 flex items-center gap-2 font-bold text-emerald-950"><Ruler size={18} className="text-fresh" /> Size Distribution</div>
                <DefectBars data={sizeData} height={150} />
              </Card>
            </div>
          </StaggerItem>
        </Stagger>
      )}

      {!vision && !loading && (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-forest/10 text-forest"><ScanLine size={26} /></div>
          <div className="font-bold text-emerald-950">No scan yet</div>
          <div className="max-w-md text-sm text-emerald-600/80">Upload a photo of your onion batch to run live defect detection, or run a demo scan to preview the results.</div>
          <AnimatedNumber value={0} className="sr-only" />
        </Card>
      )}
    </PageTransition>
  );
}

function SummaryStat({ label, value, color, icon: Icon }: { label: string; value: React.ReactNode; color?: string; icon?: any }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
        {Icon && <Icon size={12} style={{ color }} />}{label}
      </div>
      <div className="text-xl font-bold" style={{ color: color || '#06452C' }}>{value}</div>
    </div>
  );
}
