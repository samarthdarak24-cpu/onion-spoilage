import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio, Camera, ScanLine, GitMerge, Award, CheckCircle2, ArrowRight, RotateCcw,
  Cpu, Thermometer, Droplets, Wind, AlertTriangle, ClipboardList, Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, Spinner, ProgressBar, GradeBadge } from '../../components/ui';
import { LiveLine } from '../../components/charts';
import { PageTransition } from '../../components/motion';
import { LiveIndicator } from '../../components/RealtimeStatus';

const STEPS = ['Lot Details', 'IoT Pod', 'Stabilize', 'Capture', 'AI Analysis', 'Result'];
const ANGLES = ['Front', 'Top', 'Side', 'Close-up'];
const CROPS = ['Onion', 'Potato', 'Tomato', 'Garlic', 'Chilli'];

interface Reading { ethane: number; methane: number; temperature: number; humidity: number; }
interface Device { deviceId: string; connected: boolean; transport: string; battery: number; signal: string; location: string; reading: Reading; }

export default function NewInspection() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);

  // reference data
  const [centers, setCenters] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [fpos, setFpos] = useState<any[]>([]);

  // step 0 — lot form
  const [form, setForm] = useState({
    farmerId: '', fpoId: '', crop: 'Onion', variety: 'Nashik Red',
    quantityKg: 1000, procurementCenterId: '',
  });
  const [lot, setLot] = useState<any>(null);
  const [inspectionId, setInspectionId] = useState('');

  // step 1 — IoT pod
  const [device, setDevice] = useState<Device | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);

  // step 2 — stabilization
  const [count, setCount] = useState(60);
  const [history, setHistory] = useState<{ t: string; value: number }[]>([]);

  // step 3 — images
  const [images, setImages] = useState<{ file?: File; preview?: string; uploaded: boolean }[]>(
    ANGLES.map(() => ({ uploaded: false })),
  );
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // step 4 — analysis
  const [result, setResult] = useState<any>(null);
  // step 5 — certificate
  const [cert, setCert] = useState<any>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getCenters().then(setCenters).catch(() => {});
    api.getFarmers().then(setFarmers).catch(() => {});
    api.getFpos().then(setFpos).catch(() => {});
  }, []);

  // stop the simulated device if the user leaves the page
  useEffect(() => () => {
    if (device) api.simulateStop({ deviceId: device.deviceId }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------- validation ----------------------------- */
  const cropValid = form.crop.trim().length > 0;
  const qtyValid = Number(form.quantityKg) > 0;
  const centerValid = !!form.procurementCenterId;
  const farmerValid = !!form.farmerId;
  const lotValid = cropValid && qtyValid && centerValid && farmerValid;

  /* ------------------------------ navigation ----------------------------- */
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submitLot = async () => {
    if (!lotValid) { setErr('Please complete all required lot fields.'); return; }
    setBusy(true); setErr('');
    try {
      const created = await api.createLot({
        farmerId: form.farmerId, fpoId: form.fpoId || undefined,
        crop: form.crop, variety: form.variety, quantityKg: Number(form.quantityKg),
        procurementCenterId: form.procurementCenterId,
      });
      setLot(created);
      const insp = await api.startInspection({ lotId: created.id, sampleWeightKg: 1.5, mode: 'DEMO' });
      setInspectionId(insp.id);
      next();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const connectPod = async () => {
    setBusy(true); setErr('');
    try {
      const d = await api.simulateStart({});
      setDevice(d);
      setReading(d.reading);
      setHistory([{ t: '0', value: d.reading.temperature }]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const startStabilize = () => { setCount(60); next(); };

  // countdown
  useEffect(() => {
    if (step !== 2) return;
    const iv = setInterval(() => setCount((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(iv);
  }, [step]);

  // sensor ticks while stabilizing
  useEffect(() => {
    if (step !== 2 || count === 0 || !device) return;
    const t = setTimeout(async () => {
      try {
        const r = await api.simulateTick({ deviceId: device.deviceId, scenario: 'normal' });
        setDevice(r.device);
        setReading(r.device.reading);
        setHistory((h) => [...h.slice(-30), { t: String(61 - count), value: r.device.reading.temperature }]);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [count, step, device]);

  useEffect(() => {
    if (step === 2 && count === 0) {
      const t = setTimeout(() => next(), 700);
      return () => clearTimeout(t);
    }
  }, [count, step]);

  /* ------------------------------ images ------------------------------ */
  const onPick = async (i: number, file?: File) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    try {
      await api.addImage(inspectionId, { angle: ANGLES[i], fileName: file.name });
      setImages((prev) => {
        const n = [...prev];
        if (n[i].preview) URL.revokeObjectURL(n[i].preview!);
        n[i] = { file, preview, uploaded: true };
        return n;
      });
    } catch (e: any) { setErr(e.message); }
  };

  const capturedCount = images.filter((i) => i.uploaded).length;

  /* ------------------------------ analysis ------------------------------ */
  const runAnalysis = async () => {
    if (capturedCount < 1) { setErr('Capture at least one image before analysis.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await api.analyzeInspection(inspectionId, {
        scenario: 'random',
        ethane: reading?.ethane ?? 0.42, methane: reading?.methane ?? 0.18,
        temperature: reading?.temperature ?? 25, humidity: reading?.humidity ?? 61,
      });
      setResult(r);
      next();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const generateCert = async () => {
    setBusy(true); setErr('');
    try {
      const c = await api.generateCertificate({ inspectionId });
      setCert(c);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const reset = () => {
    if (device) api.simulateStop({ deviceId: device.deviceId }).catch(() => {});
    setStep(0); setLot(null); setInspectionId(''); setDevice(null); setReading(null);
    setHistory([]); setImages(ANGLES.map(() => ({ uploaded: false }))); setResult(null); setCert(null);
    setForm({ farmerId: '', fpoId: '', crop: 'Onion', variety: 'Nashik Red', quantityKg: 1000, procurementCenterId: '' });
  };

  /* ------------------------------ render ------------------------------ */
  return (
    <PageTransition className="space-y-5">
      {/* Header + stepper */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-ink">
            <ClipboardList size={22} className="text-forest" /> New Inspection
          </h2>
          <p className="mt-0.5 text-sm text-muted">Register a lot, capture sensor &amp; image data, and generate a quality certificate.</p>
        </div>
        <LiveIndicator />
      </div>

      <Card className="!p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{Math.round(((step) / (STEPS.length - 1)) * 100)}% complete</span>
        </div>
        <ProgressBar value={((step) / (STEPS.length - 1)) * 100} tone="forest" />
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s} className={clsxStep(active, done)}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold">
                  {done ? <CheckCircle2 size={14} /> : i + 1}
                </span>
                <span className="truncate text-[11px] font-semibold sm:text-xs">{s}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {err && (
        <div className="flex items-center gap-2 rounded-xl bg-reject/10 px-4 py-2.5 text-sm font-medium text-reject">
          <AlertTriangle size={16} /> {err}
        </div>
      )}

      {/* Main + summary */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* ---------------- MAIN COLUMN ---------------- */}
        <div className="space-y-5">
          {/* STEP 0 — Lot Details */}
          {step === 0 && (
            <Card>
              <h3 className="text-lg font-bold text-ink">Lot Registration</h3>
              <p className="mb-4 text-sm text-muted">Attribute this lot to a farmer and the procurement center that received it.</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Farmer" required error={!farmerValid ? 'Select a farmer' : ''}>
                  <select className="input" value={form.farmerId}
                    onChange={(e) => setForm({ ...form, farmerId: e.target.value })}>
                    <option value="">Select farmer…</option>
                    {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </Field>

                <Field label="FPO (optional)">
                  <select className="input" value={form.fpoId}
                    onChange={(e) => setForm({ ...form, fpoId: e.target.value })}>
                    <option value="">Select FPO…</option>
                    {fpos.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </Field>

                <Field label="Crop" required error={!cropValid ? 'Required' : ''}>
                  <select className="input" value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}>
                    {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>

                <Field label="Variety">
                  <input className="input" value={form.variety}
                    onChange={(e) => setForm({ ...form, variety: e.target.value })} placeholder="e.g. Nashik Red" />
                </Field>

                <Field label="Quantity (kg)" required error={!qtyValid ? 'Must be greater than 0' : ''}>
                  <input type="number" min={1} className="input" value={form.quantityKg}
                    onChange={(e) => setForm({ ...form, quantityKg: +e.target.value })} />
                </Field>

                <Field label="Procurement Center" required error={!centerValid ? 'Select a center' : ''}>
                  <select className="input" value={form.procurementCenterId}
                    onChange={(e) => setForm({ ...form, procurementCenterId: e.target.value })}>
                    <option value="">Select center…</option>
                    {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <span className="text-xs text-muted">{lotValid ? 'Ready to register' : 'Complete the required fields above'}</span>
                <button className="btn-primary" disabled={busy || !lotValid} onClick={submitLot}>
                  {busy ? <Spinner label="Registering…" /> : <>Register &amp; Continue <ArrowRight size={16} /></>}
                </button>
              </div>
            </Card>
          )}

          {/* STEP 1 — IoT Pod */}
          {step === 1 && (
            <Card>
              <h3 className="text-lg font-bold text-ink">Sample &amp; IoT Pod</h3>
              <p className="mb-4 text-sm text-muted">Place a 1–2 kg sample inside the IoT pod and connect the sensor over BLE/Wi-Fi.</p>

              {!device ? (
                <button className="btn-ghost" onClick={connectPod} disabled={busy}>
                  {busy ? <Spinner label="Connecting…" /> : <><Radio size={16} /> Connect IoT Pod</>}
                </button>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="forest"><Cpu size={12} /> {device.deviceId}</Badge>
                    <Badge tone="gray"><Radio size={12} /> {device.transport}</Badge>
                    <Badge tone="gray"><Sparkles size={12} /> Battery {Math.round(device.battery)}%</Badge>
                    <Badge tone="gray"><Wind size={12} /> {device.signal}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <ReadingTile icon={Thermometer} label="Temperature" value={reading?.temperature} unit="°C" />
                    <ReadingTile icon={Droplets} label="Humidity" value={reading?.humidity} unit="%" />
                    <ReadingTile icon={Wind} label="Ethane" value={reading?.ethane} unit="ppm" />
                    <ReadingTile icon={Wind} label="Methane" value={reading?.methane} unit="ppm" />
                  </div>
                </>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button className="btn-ghost" onClick={back}>Back</button>
                <button className="btn-primary" disabled={!device} onClick={startStabilize}>
                  Begin Stabilization <ArrowRight size={16} />
                </button>
              </div>
            </Card>
          )}

          {/* STEP 2 — Stabilization */}
          {step === 2 && (
            <Card>
              <h3 className="text-lg font-bold text-ink">Sensor Stabilization</h3>
              <p className="mb-3 text-sm text-muted">Holding steady while the pod records a stable reading window.</p>
              <div className="text-center text-6xl font-extrabold tabular-nums text-forest">{String(count).padStart(2, '0')}</div>
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">seconds remaining · DEMO DATA</p>
              <div className="mt-4"><LiveLine data={history} /></div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <Mini label="Ethane" value={reading?.ethane} />
                <Mini label="Methane" value={reading?.methane} />
                <Mini label="Temp" value={reading?.temperature} suffix="°C" />
                <Mini label="Hum" value={reading?.humidity} suffix="%" />
              </div>
            </Card>
          )}

          {/* STEP 3 — Capture */}
          {step === 3 && (
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-ink">Image Capture</h3>
                  <p className="text-sm text-muted">Capture multiple angles. Files are uploaded and stored with the inspection.</p>
                </div>
                <Badge tone={capturedCount === ANGLES.length ? 'forest' : 'amber'}>{capturedCount}/{ANGLES.length} captured</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {ANGLES.map((a, i) => (
                  <div key={a} className="relative grid h-40 place-items-center overflow-hidden rounded-xl2 border-2 border-dashed border-border bg-bg">
                    {images[i].preview ? (
                      <img src={images[i].preview} alt={a} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-muted"><Camera size={26} /><span className="mt-1 text-xs">No photo</span></div>
                    )}
                    <span className="absolute left-2 top-2 rounded-md bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">{a}</span>
                    {images[i].uploaded && (
                      <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-fresh text-white"><CheckCircle2 size={13} /></span>
                    )}
                    <input ref={(el) => (fileRefs.current[i] = el)} type="file" accept="image/*" className="hidden"
                      onChange={(e) => onPick(i, e.target.files?.[0])} />
                    <button className="absolute bottom-2 right-2 rounded-lg bg-forest px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => fileRefs.current[i]?.click()}>
                      {images[i].uploaded ? 'Retake' : 'Upload'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button className="btn-ghost" onClick={back}>Back</button>
                <button className="btn-primary" disabled={capturedCount < 1 || busy} onClick={runAnalysis}>
                  {busy ? <Spinner label="Analyzing…" /> : <>Run AI Analysis <ArrowRight size={16} /></>}
                </button>
              </div>
            </Card>
          )}

          {/* STEP 4 — Analysis */}
          {step === 4 && result && (
            <Card>
              <h3 className="flex items-center gap-2 text-lg font-bold text-ink"><ScanLine size={18} className="text-fresh" /> AI Analysis</h3>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <ScoreTile label="Vision" value={result.vision.visionScore} tone="forest" />
                <ScoreTile label={`Gas (${result.gas.stage})`} value={result.gas.gasScore} tone="amber" />
                <ScoreTile label="Environment" value={result.environment.environmentScore} tone="fresh" />
              </div>
              <div className="mt-3 rounded-xl2 bg-bg p-4 text-sm font-semibold text-ink">
                <GitMerge size={14} className="mr-1 inline text-forest" />
                Fusion score: <span className="text-forest">{result.fusion.finalScore}/100</span> · {result.fusion.grade}
                <span className="ml-2 text-muted">· confidence {Math.round((result.fusion.confidence ?? 0) * 100)}%</span>
              </div>
              {result.fusion.earlySpoilageAlert && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber/15 px-3 py-2 text-sm font-medium text-amber-700">
                  <AlertTriangle size={15} /> {result.fusion.explanation}
                </div>
              )}
              <div className="mt-6 flex items-center justify-between gap-3">
                <button className="btn-ghost" onClick={back}>Back</button>
                <button className="btn-primary" onClick={next}>View Result <ArrowRight size={16} /></button>
              </div>
            </Card>
          )}

          {/* STEP 5 — Result */}
          {step === 5 && result && (
            <Card>
              <div className="text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-muted">Final Grade</div>
                <div className="mt-1 text-5xl font-extrabold text-forest">{result.fusion.grade}</div>
                <div className="mt-1 text-2xl font-bold text-ink">{result.fusion.finalScore}<span className="text-lg text-muted">/100</span></div>
                <div className="mt-2"><GradeBadge grade={result.fusion.grade} /></div>
              </div>
              <div className="mt-5 space-y-3">
                <ScoreRow label="Vision" v={result.fusion.visionScore} tone="forest" />
                <ScoreRow label="Gas" v={result.fusion.gasScore} tone="amber" />
                <ScoreRow label="Environment" v={result.fusion.environmentalScore} tone="fresh" />
              </div>

              {cert ? (
                <div className="mt-6 rounded-xl2 bg-mint/50 p-4 text-center">
                  <CheckCircle2 className="mx-auto text-fresh" size={28} />
                  <div className="mt-2 text-sm font-semibold text-ink">Certificate generated</div>
                  <div className="font-mono text-xs text-muted">{cert.certificateNumber}</div>
                  <div className="mt-3 flex justify-center gap-2">
                    <button className="btn-primary" onClick={() => nav(`/certificate/${cert.id}`)}><Award size={16} /> View Certificate</button>
                    <button className="btn-ghost" onClick={reset}><RotateCcw size={16} /> New Inspection</button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex justify-center">
                  {busy
                    ? <Spinner label="Generating…" />
                    : <button className="btn-primary" onClick={generateCert}><Award size={16} /> Generate Certificate</button>}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ---------------- SIDE SUMMARY ---------------- */}
        <SummaryPanel
          step={step}
          lot={lot}
          device={device}
          reading={reading}
          captured={capturedCount}
          total={ANGLES.length}
          result={result}
          cert={cert}
        />
      </div>
    </PageTransition>
  );
}

/* ----------------------------- sub-components ----------------------------- */

function clsxStep(active: boolean, done: boolean) {
  if (active) return 'flex items-center gap-2 rounded-xl2 bg-ink px-3 py-2 text-white';
  if (done) return 'flex items-center gap-2 rounded-xl2 bg-forest/10 px-3 py-2 text-forest';
  return 'flex items-center gap-2 rounded-xl2 bg-bg px-3 py-2 text-muted';
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-reject"> *</span>}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-reject">{error}</p>}
    </div>
  );
}

function ReadingTile({ icon: Icon, label, value, unit }: { icon: any; label: string; value?: number; unit: string }) {
  return (
    <div className="rounded-xl2 border border-border bg-bg p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted"><Icon size={13} /> {label}</div>
      <div className="mt-1 text-xl font-extrabold text-ink">{value ?? '—'}<span className="ml-0.5 text-sm font-semibold text-muted">{unit}</span></div>
    </div>
  );
}

function Mini({ label, value, suffix = '' }: { label: string; value?: number; suffix?: string }) {
  return (
    <div className="rounded-lg bg-bg p-2">
      <div className="text-[10px] font-semibold uppercase text-muted">{label}</div>
      <div className="font-bold text-ink">{value ?? '—'}{suffix}</div>
    </div>
  );
}

function ScoreTile({ label, value, tone }: { label: string; value: number; tone: 'forest' | 'amber' | 'fresh' }) {
  const bg: any = { forest: 'bg-forest/10 text-forest', amber: 'bg-amber/15 text-amber-700', fresh: 'bg-fresh/15 text-forest' };
  return (
    <div className={`rounded-xl2 p-4 ${bg[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function ScoreRow({ label, v, tone }: { label: string; v: number; tone: 'forest' | 'amber' | 'fresh' }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="text-muted">{label}</span><span className="font-semibold text-ink">{v}</span></div>
      <ProgressBar value={v} tone={tone} />
    </div>
  );
}

const TIPS = [
  'Select the farmer and the procurement center that received this lot — both are required.',
  'Connect the ESP32 pod; it streams live ethane, methane, temperature and humidity.',
  'The pod records a stable 60-second window before analysis begins.',
  'Capture clear photos from every angle. At least one is required; four is ideal.',
  'Vision, gas and environment scores are fused into a single grade and risk level.',
  'Generate the certificate to complete the workflow and share the QR-verifiable result.',
];

function SummaryPanel({ step, lot, device, reading, captured, total, result, cert }: any) {
  const checks = [
    { label: 'Lot registered', done: !!lot, meta: lot?.lotNumber },
    { label: 'IoT pod connected', done: !!device, meta: device?.deviceId },
    { label: 'Sensor readings', done: !!reading, meta: reading ? `${reading.temperature}°C · ${reading.humidity}%` : '' },
    { label: 'Images captured', done: captured > 0, meta: `${captured}/${total}` },
    { label: 'AI analysis run', done: !!result, meta: result?.fusion?.grade },
    { label: 'Certificate issued', done: !!cert, meta: cert?.certificateNumber },
  ];
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <Card className="!p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-ink"><ClipboardList size={16} className="text-forest" /> Inspection Summary</div>
        <div className="mt-4 space-y-2.5">
          {checks.map((c) => (
            <div key={c.label} className="flex items-start gap-2.5">
              <span className={c.done ? 'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-fresh text-white' : 'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border text-muted'}>
                {c.done ? <CheckCircle2 size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-muted/50" />}
              </span>
              <div className="min-w-0">
                <div className={`text-[13px] font-semibold ${c.done ? 'text-ink' : 'text-muted'}`}>{c.label}</div>
                {c.meta && <div className="truncate text-[11px] text-muted">{c.meta}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl2 bg-bg p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-forest">
            <Sparkles size={12} /> Tip
          </div>
          <p className="mt-1 text-[12px] leading-snug text-muted">{TIPS[step]}</p>
        </div>

        {result && (
          <div className="mt-4 rounded-xl2 border border-border bg-white p-3 text-center">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Live Result</div>
            <div className="mt-1 text-2xl font-extrabold text-forest">{result.fusion.grade}</div>
            <div className="text-sm font-semibold text-ink">{result.fusion.finalScore}/100</div>
          </div>
        )}
      </Card>
    </aside>
  );
}
