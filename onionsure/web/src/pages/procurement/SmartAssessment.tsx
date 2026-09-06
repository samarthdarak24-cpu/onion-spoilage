import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Radio, Camera, ScanLine, GitMerge, Award, CheckCircle2, 
  ArrowRight, ArrowLeft, AlertTriangle, Thermometer, Droplets, Wind, Cpu,
  Eye, Activity, Shield, Sparkles, ChevronRight
} from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, Spinner, ProgressBar, GradeBadge } from '../../components/ui';
import { LiveLine } from '../../components/charts';
import { PageTransition } from '../../components/motion';

const STEPS = ['Lot Details', 'IoT Pod', 'Stabilize', 'Capture', 'AI Analysis', 'Result'];
const ANGLES = ['Front', 'Top', 'Side', 'Close-up'];

interface Reading {
  temperature: number;
  humidity: number;
  co2?: number;
  ch4?: number;
  c2h4?: number;
  nh3?: number;
  moisture?: number;
  ph?: number;
  ethane: number;
  methane: number;
}

interface Device {
  deviceId: string;
  connected: boolean;
  transport: string;
  battery: number;
  signal: string;
  location: string;
  reading: Reading;
}

export default function SmartAssessment() {
  const { inspectionId } = useParams();
  const nav = useNavigate();
  
  const [step, setStep] = useState(0);
  const [inspection, setInspection] = useState<any>(null);
  const [lot, setLot] = useState<any>(null);
  const [farmer, setFarmer] = useState<any>(null);
  const [center, setCenter] = useState<any>(null);
  
  // Step 1: IoT Pod
  const [device, setDevice] = useState<Device | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  
  // Step 2: Stabilize
  const [count, setCount] = useState(60);
  const [history, setHistory] = useState<{ t: string; value: number }[]>([]);
  
  // Step 3: Capture
  const [images, setImages] = useState<{ file?: File; preview?: string; uploaded: boolean }[]>(
    ANGLES.map(() => ({ uploaded: false }))
  );
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Step 4: AI Analysis
  const [result, setResult] = useState<any>(null);
  
  // Step 5: Result / Override
  const [overrideGrade, setOverrideGrade] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSaved, setOverrideSaved] = useState(false);
  
  // Step 6: Certificate
  const [cert, setCert] = useState<any>(null);
  
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Load inspection data
  useEffect(() => {
    if (!inspectionId) {
      nav('/quality/new-inspection');
      return;
    }

    setLoading(true);
    Promise.all([
      api.getInspection(inspectionId),
      // Load additional data as needed
    ])
      .then(([insp]) => {
        setInspection(insp);
        
        // Determine current step based on inspection status
        if (insp.status === 'completed') {
          setStep(5);
        } else if (insp.aiAnalysis) {
          setStep(4);
        } else if (insp.images && insp.images.length > 0) {
          setStep(3);
        } else if (insp.sensorConnected) {
          setStep(2);
        } else {
          setStep(0);
        }

        // Load related data
        return api.getLot(insp.lotId);
      })
      .then((lotData) => {
        setLot(lotData);
        return Promise.all([
          api.getFarmers().then(farmers => farmers.find(f => f.id === lotData.farmerId)),
          api.getCenters().then(centers => centers.find(c => c.id === lotData.procurementCenterId))
        ]);
      })
      .then(([farmerData, centerData]) => {
        setFarmer(farmerData);
        setCenter(centerData);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [inspectionId, nav]);

  // Stop device on unmount
  useEffect(() => {
    return () => {
      if (device) api.simulateStop({ deviceId: device.deviceId }).catch(() => {});
    };
  }, [device]);

  // Stabilization countdown
  useEffect(() => {
    if (step !== 2 || count === 0) return;
    const iv = setInterval(() => setCount((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(iv);
  }, [step, count]);

  // Sensor ticks during stabilization
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

  // Auto-advance from stabilize
  useEffect(() => {
    if (step === 2 && count === 0) {
      const t = setTimeout(() => next(), 700);
      return () => clearTimeout(t);
    }
  }, [count, step]);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  // Step 1: Connect IoT Pod
  const connectPod = async () => {
    setBusy(true);
    setErr('');
    try {
      const d = await api.simulateStart({});
      setDevice(d);
      setReading(d.reading);
      setHistory([{ t: '0', value: d.reading.temperature }]);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Start stabilization
  const startStabilize = () => {
    setCount(60);
    next();
  };

  // Step 3: Image upload
  const onPick = async (i: number, file?: File) => {
    if (!file || !inspectionId) return;
    const preview = URL.createObjectURL(file);
    try {
      await api.addImage(inspectionId, { angle: ANGLES[i], fileName: file.name });
      setImages((prev) => {
        const n = [...prev];
        if (n[i].preview) URL.revokeObjectURL(n[i].preview!);
        n[i] = { file, preview, uploaded: true };
        return n;
      });
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const capturedCount = images.filter((i) => i.uploaded).length;

  // Step 4: Run AI Analysis
  const runAnalysis = async () => {
    if (capturedCount < 1) {
      setErr('Capture at least one image before analysis.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const r = await api.analyzeInspection(inspectionId!, {
        scenario: 'random',
        ethane: reading?.ethane ?? 0.42,
        methane: reading?.methane ?? 0.18,
        temperature: reading?.temperature ?? 25,
        humidity: reading?.humidity ?? 61,
      });
      setResult(r);
      next();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Step 5: Apply override
  const applyOverride = async () => {
    if (!overrideGrade || overrideReason.trim().length < 5) {
      setErr('Override requires a grade and reason (at least 5 characters).');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await api.overrideInspection(inspectionId!, {
        newGrade: overrideGrade,
        reason: overrideReason,
      });
      setOverrideSaved(true);
      setResult((prev: any) => ({
        ...prev,
        fusion: { ...prev.fusion, grade: overrideGrade },
      }));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Step 6: Generate certificate
  const generateCert = async () => {
    setBusy(true);
    setErr('');
    try {
      const c = await api.generateCertificate({ inspectionId: inspectionId! });
      setCert(c);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner label="Loading assessment..." />
      </div>
    );
  }

  if (!inspection || !lot) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <AlertTriangle size={40} className="mx-auto text-reject mb-3" />
          <h2 className="text-xl font-bold text-ink">Inspection not found</h2>
          <button onClick={() => nav('/quality/new-inspection')} className="btn-primary mt-4">
            Start New Inspection
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="space-y-5">
      {/* Breadcrumb */}
      <div className="text-xs text-muted">
        <span>Quality</span>
        <ChevronRight size={12} className="inline mx-1" />
        <span>Smart Quality Assessment</span>
        <ChevronRight size={12} className="inline mx-1" />
        <span className="font-mono font-semibold text-forest">{lot.lotNumber}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-ink">
            <ClipboardList size={22} className="text-forest" /> Smart Quality Assessment
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Unified workflow: IoT → Camera → AI → Result
          </p>
        </div>
      </div>

      {/* Progress Stepper */}
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
              <div
                key={s}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-center transition ${
                  active
                    ? 'bg-forest text-white'
                    : done
                    ? 'bg-mint text-forest'
                    : 'bg-bg text-muted'
                }`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold">
                  {done ? <CheckCircle2 size={14} /> : i + 1}
                </span>
                <span className="truncate text-[11px] font-semibold sm:text-xs">{s}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Error Display */}
      {err && (
        <div className="flex items-center gap-2 rounded-xl bg-reject/10 px-4 py-2.5 text-sm font-medium text-reject">
          <AlertTriangle size={16} /> {err}
        </div>
      )}

      {/* Main Content + Sidebar */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* MAIN COLUMN */}
        <div className="space-y-5">
          {/* STEP 0: Lot Details (Read-only) */}
          {step === 0 && (
            <Card>
              <h3 className="text-lg font-bold text-ink mb-4">Lot Details</h3>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <div className="text-xs font-bold text-muted">Central Lot ID</div>
                  <div className="font-mono font-bold text-forest">{lot.lotNumber}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted">Farmer</div>
                  <div className="font-bold text-ink">{farmer?.fullName || 'Loading...'}</div>
                  <div className="text-xs text-muted">{farmer?.farmerId}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted">Crop & Variety</div>
                  <div className="font-semibold text-ink">{lot.crop} - {lot.variety}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted">Quantity</div>
                  <div className="font-bold text-ink">{lot.quantityKg} KG</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted">Center</div>
                  <div className="font-semibold text-ink">{center?.name || 'Loading...'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted">Village</div>
                  <div className="font-semibold text-ink">{farmer?.village || '—'}</div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button className="btn-primary" onClick={next}>
                  Continue to IoT Pod <ArrowRight size={16} />
                </button>
              </div>
            </Card>
          )}

          {/* STEP 1: IoT Pod */}
          {step === 1 && (
            <Card>
              <h3 className="text-lg font-bold text-ink">IoT Pod Connection</h3>
              <p className="mb-4 text-sm text-muted">Connect the sensor pod to capture environmental and gas readings.</p>

              {!device ? (
                <button className="btn-ghost" onClick={connectPod} disabled={busy}>
                  {busy ? <Spinner label="Connecting..." /> : <><Radio size={16} /> Connect IoT Pod</>}
                </button>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge tone="forest"><Cpu size={12} /> {device.deviceId}</Badge>
                    <Badge tone="gray"><Radio size={12} /> {device.transport}</Badge>
                    <Badge tone="gray"><Sparkles size={12} /> Battery {Math.round(device.battery)}%</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <ReadingTile icon={Thermometer} label="Temperature" value={reading?.temperature} unit="°C" />
                    <ReadingTile icon={Droplets} label="Humidity" value={reading?.humidity} unit="%" />
                    <ReadingTile icon={Wind} label="Ethylene" value={reading?.c2h4 ?? reading?.ethane} unit="ppm" />
                    <ReadingTile icon={Wind} label="Methane" value={reading?.ch4 ?? reading?.methane} unit="ppm" />
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

          {/* STEP 2: Stabilization */}
          {step === 2 && (
            <Card>
              <h3 className="text-lg font-bold text-ink">Sample Stabilization</h3>
              <p className="mb-3 text-sm text-muted">Holding steady while the pod records a stable reading window.</p>
              <div className="text-center text-6xl font-extrabold tabular-nums text-forest">{String(count).padStart(2, '0')}</div>
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">seconds remaining</p>
              <div className="mt-4"><LiveLine data={history} /></div>
            </Card>
          )}

          {/* STEP 3: Capture */}
          {step === 3 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">Image Capture</h3>
                  <p className="text-sm text-muted">Capture multiple angles for AI analysis</p>
                </div>
                <Badge tone={capturedCount === ANGLES.length ? 'forest' : 'amber'}>
                  {capturedCount}/{ANGLES.length} captured
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {ANGLES.map((a, i) => (
                  <div key={a} className="relative grid h-40 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-bg">
                    {images[i].preview ? (
                      <img src={images[i].preview} alt={a} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-muted">
                        <Camera size={26} />
                        <span className="mt-1 text-xs">No photo</span>
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-md bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {a}
                    </span>
                    {images[i].uploaded && (
                      <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-fresh text-white">
                        <CheckCircle2 size={13} />
                      </span>
                    )}
                    <input
                      ref={(el) => (fileRefs.current[i] = el)}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPick(i, e.target.files?.[0])}
                    />
                    <button
                      className="absolute bottom-2 right-2 rounded-lg bg-forest px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => fileRefs.current[i]?.click()}
                    >
                      {images[i].uploaded ? 'Retake' : 'Upload'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button className="btn-ghost" onClick={back}>Back</button>
                <button className="btn-primary" disabled={capturedCount < 1 || busy} onClick={runAnalysis}>
                  {busy ? <Spinner label="Analyzing..." /> : <>Run AI Analysis <ArrowRight size={16} /></>}
                </button>
              </div>
            </Card>
          )}

          {/* STEP 4: AI Analysis */}
          {step === 4 && result && (
            <Card>
              <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
                <ScanLine size={18} className="text-fresh" /> AI Analysis Complete
              </h3>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <ScoreTile label="Vision" value={result.vision?.visionScore} tone="forest" />
                <ScoreTile label="Gas" value={result.gas?.gasScore} tone="amber" />
                <ScoreTile label="Environment" value={result.environment?.environmentScore} tone="fresh" />
              </div>
              <div className="mt-3 rounded-xl bg-bg p-4 text-sm font-semibold text-ink">
                <GitMerge size={14} className="mr-1 inline text-forest" />
                Fusion score: <span className="text-forest">{result.fusion?.finalScore}/100</span> · {result.fusion?.grade}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <button className="btn-ghost" onClick={back}>Back</button>
                <button className="btn-primary" onClick={next}>
                  View Result <ArrowRight size={16} />
                </button>
              </div>
            </Card>
          )}

          {/* STEP 5: Result & Override */}
          {step === 5 && result && (
            <Card>
              <div className="text-center mb-6">
                <div className="text-xs font-bold uppercase tracking-widest text-muted">Final Grade</div>
                <div className="mt-1 text-5xl font-extrabold text-forest">{result.fusion?.grade}</div>
                <div className="mt-1 text-2xl font-bold text-ink">
                  {result.fusion?.finalScore}<span className="text-lg text-muted">/100</span>
                </div>
                <div className="mt-2">
                  <GradeBadge grade={result.fusion?.grade} />
                </div>
              </div>

              {/* Why This Grade */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-forest">
                  <CheckCircle2 size={16} /> Why this grade?
                </div>
                <ul className="mt-2 space-y-1 text-xs text-ink">
                  {(result.fusion?.reasons || ['Analysis complete']).map((r: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 font-bold text-forest">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Override Section */}
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Officer Manual Override
                  </span>
                  <span className="text-[10px] font-semibold text-muted">Audit-Controlled</span>
                </div>

                {overrideSaved ? (
                  <div className="rounded-xl bg-mint p-3 text-xs font-semibold text-forest">
                    ✓ Override applied: {overrideGrade}. Logged with inspector identity.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-semibold text-muted">Override Grade</label>
                        <select
                          className="input mt-1 w-full bg-white text-xs"
                          value={overrideGrade}
                          onChange={(e) => setOverrideGrade(e.target.value)}
                        >
                          <option value="">— Select —</option>
                          <option value="GRADE A">GRADE A</option>
                          <option value="URS">URS</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted">Reason (min 5 chars)</label>
                        <input
                          type="text"
                          placeholder="Manual verification confirmed..."
                          className="input mt-1 w-full bg-white text-xs"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!overrideGrade || overrideReason.trim().length < 5 || busy}
                      onClick={applyOverride}
                      className="btn-ghost border border-amber-300 bg-white py-1.5 text-xs text-amber-800"
                    >
                      {busy ? <Spinner label="Saving..." /> : 'Save Override to Audit Log'}
                    </button>
                  </div>
                )}
              </div>

              {/* Finalize */}
              {cert ? (
                <div className="mt-6 rounded-xl bg-mint/50 p-4 text-center">
                  <CheckCircle2 className="mx-auto text-fresh" size={28} />
                  <div className="mt-2 text-sm font-semibold text-ink">Certificate generated</div>
                  <div className="font-mono text-xs text-muted">{cert.certificateNumber}</div>
                  <div className="mt-3 flex justify-center gap-2">
                    <button className="btn-primary" onClick={() => nav(`/certificate/${cert.id}`)}>
                      <Award size={16} /> View Certificate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex justify-center">
                  {busy ? (
                    <Spinner label="Generating..." />
                  ) : (
                    <button className="btn-primary" onClick={generateCert}>
                      <Award size={16} /> Finalize & Generate Certificate
                    </button>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* SIDEBAR: Inspection Progress */}
        <Card className="h-fit">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">Inspection Progress</h4>
          <div className="space-y-2 text-xs">
            <ProgressItem label="Lot registered" done={true} />
            <ProgressItem label="IoT pod connected" done={step >= 1 && device !== null} current={step === 1} />
            <ProgressItem label="Sample stabilized" done={step >= 3} current={step === 2} />
            <ProgressItem label="Images captured" done={step >= 4} current={step === 3} />
            <ProgressItem label="AI analysis complete" done={step >= 5} current={step === 4} />
            <ProgressItem label="Result finalized" done={cert !== null} current={step === 5 && !cert} />
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}

// Helper components
function ReadingTile({ icon: I, label, value, unit }: any) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 text-center">
      <I size={16} className="mx-auto text-fresh mb-1" />
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className="mt-1 text-lg font-bold text-ink">
        {value?.toFixed(1) ?? '—'}<span className="text-xs text-muted ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

function ScoreTile({ label, value, tone }: any) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="text-xs font-bold uppercase text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${tone === 'forest' ? 'text-forest' : tone === 'amber' ? 'text-amber' : 'text-fresh'}`}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function ProgressItem({ label, done, current }: { label: string; done: boolean; current?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${current ? 'bg-forest/10 text-forest' : done ? 'bg-mint/50 text-forest' : 'text-muted'}`}>
      {done ? (
        <CheckCircle2 size={14} className="text-forest" />
      ) : current ? (
        <div className="h-3 w-3 rounded-full border-2 border-forest" />
      ) : (
        <div className="h-3 w-3 rounded-full border-2 border-muted" />
      )}
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}
