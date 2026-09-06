import React, { useEffect, useRef, useState } from 'react';
import { Radio, BatteryMedium, Wifi, MapPin, Activity, AlertTriangle, Wind, Flame, Thermometer, Droplets, Cpu, Zap } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, Spinner } from '../../components/ui';
import { LiveLine } from '../../components/charts';
import { PulseDot } from '../../components/animations';

const riskTone: any = { LOW: 'forest', MEDIUM: 'amber', HIGH: 'reject' };
const riskText: any = { LOW: 'text-forest', MEDIUM: 'text-amber-700', HIGH: 'text-reject' };

export default function LiveSensor() {
  const [device, setDevice] = useState<any>(null);
  const [series, setSeries] = useState<{ t: string; value: number }[]>([]);
  const [ethSeries, setEthSeries] = useState<{ t: string; value: number }[]>([]);
  const [reading, setReading] = useState<any>(null);
  const [gas, setGas] = useState<any>(null);
  const [scenario, setScenario] = useState<'normal' | 'spoilage'>('normal');
  const [connecting, setConnecting] = useState(false);
  const [err, setErr] = useState('');
  const n = useRef(0);

  const connect = async () => {
    setConnecting(true); setErr('');
    try {
      const d = await api.simulateStart({});
      setDevice(d); setReading(d.reading);
      setSeries([{ t: '0', value: d.reading.temperature }]);
      setEthSeries([{ t: '0', value: d.reading.ethane }]);
      n.current = 1;
    } catch (e: any) { setErr(e.message); } finally { setConnecting(false); }
  };

  const stop = async () => {
    if (device) await api.simulateStop({ deviceId: device.deviceId });
    setDevice(null); setReading(null); setGas(null); setSeries([]); setEthSeries([]);
  };

  useEffect(() => {
    if (!device) return;
    const iv = setInterval(async () => {
      try {
        const r = await api.simulateTick({ deviceId: device.deviceId, scenario });
        setReading(r.device.reading);
        setGas(r.gas);
        setSeries((s) => [...s.slice(-40), { t: String(n.current++), value: r.device.reading.temperature }]);
        setEthSeries((s) => [...s.slice(-40), { t: String(n.current), value: r.device.reading.ethane }]);
      } catch {}
    }, 1200);
    return () => clearInterval(iv);
  }, [device, scenario]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Realtime Telemetry</div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl"><Radio size={22} className="text-fresh" /> Live Sensor Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">ESP32-grade gas &amp; environmental streams from the field pod.</p>
        </div>
        <div className="flex gap-2">
          {!device ? (
            <button className="btn-primary" onClick={connect} disabled={connecting}>{connecting ? <Spinner label="Connecting…" /> : <><Radio size={16} /> Connect Demo Pod</>}</button>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setScenario((s) => s === 'normal' ? 'spoilage' : 'normal')} disabled={connecting}>
                {scenario === 'spoilage' ? 'Scenario: Spoilage' : 'Scenario: Normal'}
              </button>
              <button className="btn-ghost" onClick={stop}>Disconnect</button>
            </>
          )}
        </div>
      </div>

      {err && <div className="rounded-lg bg-reject/10 px-4 py-2 text-sm text-reject">{err}</div>}

      {!device ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <Card className="flex flex-col justify-between gap-5 p-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-forest"><Cpu size={18} className="text-fresh" /> Sensor Pod · Standby</div>
              <h2 className="mt-3 text-2xl font-extrabold text-ink">Stream live onion-spoilage gases</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                Connect the demo ESP32 pod to watch ethane, methane, temperature and humidity update in real time.
                The fusion engine uses these streams to catch early spoilage before it reaches the eye.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-ink">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-fresh" /> 1.2&nbsp;s live sampling across 4 channels</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-fresh" /> Early-spoilage risk scored from gas signatures</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-fresh" /> Switch to a <b>Spoilage</b> scenario to see the alert fire</li>
              </ul>
            </div>
            <button className="btn-primary self-start" onClick={connect} disabled={connecting}>{connecting ? <Spinner label="Connecting…" /> : <><Zap size={16} /> Connect Demo Pod</>}</button>
            <p className="text-xs text-muted">DEMO DATA — simulated readings, not a physical sensor.</p>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-darkgreen to-forest p-6 text-white">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">Pod Preview</span>
                <PulseDot color="#3FAE5A" label="OFFLINE" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <PreviewStat icon={BatteryMedium} label="Battery" value="—" />
                <PreviewStat icon={Wifi} label="Signal" value="—" />
                <PreviewStat icon={Thermometer} label="Temp" value="—" />
                <PreviewStat icon={Droplets} label="Humidity" value="—" />
              </div>
              <div className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-xs text-emerald-100">
                Connect to populate live readings, trends and the spoilage-risk panel.
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-r from-darkgreen to-forest px-5 py-3 text-white shadow-soft">
            <PulseDot color="#3FAE5A" label="CONNECTED" />
            <span className="flex items-center gap-1.5 text-sm"><Radio size={15} /> ESP32 Pod</span>
            <span className="flex items-center gap-1.5 text-sm"><BatteryMedium size={15} /> Battery {device.battery?.toFixed(0)}%</span>
            <span className="flex items-center gap-1.5 text-sm"><Wifi size={15} /> Signal {device.signal}</span>
            <span className="flex items-center gap-1.5 text-sm"><MapPin size={15} /> {device.location}</span>
            <Badge tone="fresh" className="ml-auto bg-white/15 text-white">DEMO STREAM</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile icon={Thermometer} label="Temperature" value={reading.temperature} unit="°C" status={gas?.parameters?.temperature?.status || 'NORMAL'} />
            <MetricTile icon={Droplets} label="Humidity" value={reading.humidity} unit="%" status={gas?.parameters?.humidity?.status || 'NORMAL'} />
            <MetricTile icon={Wind} label="CO₂" value={reading.co2 || 440} unit="ppm" status={gas?.parameters?.co2?.status || 'NORMAL'} />
            <MetricTile icon={Flame} label="CH₄ (Methane)" value={reading.ch4 ?? reading.methane} unit="ppm" status={gas?.parameters?.ch4?.status || 'NORMAL'} />
            <MetricTile icon={Wind} label="C₂H₄ (Ethylene)" value={reading.c2h4 ?? reading.ethane} unit="ppm" status={gas?.parameters?.c2h4?.status || 'NORMAL'} />
            <MetricTile icon={Activity} label="NH₃ (Ammonia)" value={reading.nh3 ?? 0.12} unit="ppm" status={gas?.parameters?.nh3?.status || 'NORMAL'} />
            <MetricTile icon={Droplets} label="Moisture" value={reading.moisture ?? 14.5} unit="%" status={gas?.parameters?.moisture?.status || 'NORMAL'} />
            <MetricTile icon={Zap} label="pH" value={reading.ph ?? 5.8} unit="pH" status={gas?.parameters?.ph?.status || 'NORMAL'} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <div className="mb-2 flex items-center gap-2 font-bold text-ink"><Thermometer size={16} className="text-fresh" /> Temperature Trend</div>
              <LiveLine data={series} />
            </Card>
            <Card>
              <div className="mb-2 flex items-center gap-2 font-bold text-ink"><Wind size={16} className="text-fresh" /> Ethylene (C₂H₄) Trend</div>
              <LiveLine data={ethSeries} />
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-ink"><Activity size={18} className="text-fresh" /> Early Spoilage Telemetry Risk</div>
              <Badge tone={riskTone[gas?.stage] || 'forest'}>
                {gas?.stage === 'HIGH' && <AlertTriangle size={13} />}{gas?.stage || '—'}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted">
              {gas?.stage === 'LOW' && 'All 8 sensor telemetry metrics within optimal range. Low biological spoilage probability.'}
              {gas?.stage === 'MEDIUM' && 'Elevated volatile gas accumulation detected. Recommend checking bulb firmness and ventilation.'}
              {gas?.stage === 'HIGH' && 'CRITICAL gas signature: rapid anaerobic respiration and breakdown detected in sample.'}
            </p>
            {gas?.stage && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-mint">
                <div className={`h-full rounded-full transition-all duration-700 ${riskTone[gas.stage] === 'forest' ? 'bg-forest' : riskTone[gas.stage] === 'amber' ? 'bg-amber' : 'bg-reject'}`}
                  style={{ width: `${gas.stage === 'LOW' ? 18 : gas.stage === 'MEDIUM' ? 58 : 92}%` }} />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function MetricTile({ icon: I, label, value, unit, status }: { icon: any; label: string; value: any; unit: string; status: 'NORMAL' | 'WARNING' | 'CRITICAL' }) {
  const statusColors = {
    NORMAL: 'bg-emerald-50 text-forest border-emerald-200',
    WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
    CRITICAL: 'bg-rose-50 text-reject border-rose-200',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <I size={14} className="text-fresh" />{label}
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColors[status] || statusColors.NORMAL}`}>
          {status}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-ink">{value ?? '—'}</span>
        <span className="text-xs font-semibold text-muted">{unit}</span>
      </div>
    </div>
  );
}

function PreviewStat({ icon: I, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-emerald-100"><I size={13} /> {label}</div>
      <div className="mt-0.5 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
