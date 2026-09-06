import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CountUp, DemoNote, DetectBox, Reveal, SectionHeading } from './primitives';

const DETECTIONS = [
  { label: 'Healthy', conf: 96, tone: 'healthy' as const, style: { left: '6%', top: '12%', width: '26%', height: '34%' }, delay: 0.25 },
  { label: 'Damaged', conf: 91, tone: 'damaged' as const, style: { left: '38%', top: '20%', width: '24%', height: '30%' }, delay: 0.4 },
  { label: 'Rotten', conf: 94, tone: 'rotten' as const, style: { left: '68%', top: '10%', width: '25%', height: '32%' }, delay: 0.55 },
  { label: 'Sprouted', conf: 88, tone: 'sprouted' as const, style: { left: '14%', top: '56%', width: '24%', height: '32%' }, delay: 0.7 },
  { label: 'Undersized', conf: 85, tone: 'undersized' as const, style: { left: '52%', top: '60%', width: '22%', height: '28%' }, delay: 0.85 },
];

const SUMMARY = [
  { v: 128, l: 'Onions Detected' },
  { v: 105, l: 'Healthy' },
  { v: 9, l: 'Damaged' },
  { v: 5, l: 'Rotten' },
  { v: 4, l: 'Sprouted' },
  { v: 5, l: 'Undersized' },
];

const SENSORS = [
  { k: 'Ethane', v: 0.42, unit: 'ppm', decimals: 2 },
  { k: 'Methane', v: 0.18, unit: 'ppm', decimals: 2 },
  { k: 'Temperature', v: 24.8, unit: '°C', decimals: 1 },
  { k: 'Humidity', v: 62, unit: '%', decimals: 0 },
];

/* Illustrative demo gas signal — 0s … 90s */
const TREND = [
  { t: '0s', v: 0.12 },
  { t: '15s', v: 0.19 },
  { t: '30s', v: 0.27 },
  { t: '45s', v: 0.31 },
  { t: '60s', v: 0.38 },
  { t: '90s', v: 0.42 },
];

function SensorTrend() {
  const reduce = useReducedMotion();
  const W = 320, H = 130, PAD = 14;
  const max = 0.5;
  const pts = TREND.map((d, i) => {
    const x = PAD + (i / (TREND.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (d.v / max) * (H - PAD * 2);
    return { x, y, ...d };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD} L${pts[0].x.toFixed(1)},${H - PAD} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[130px] w-full" role="img" aria-label="Illustrative demo gas sensor trend, 0 to 90 seconds">
        <defs>
          <linearGradient id="gasFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F4B942" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#F4B942" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid */}
        {[0, 1, 2, 3].map((g) => {
          const y = PAD + (g / 3) * (H - PAD * 2);
          return <line key={g} x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
        })}

        <motion.path
          d={area}
          fill="url(#gasFill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.9 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="#F4B942"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        />

        {pts.map((p, i) => (
          <motion.circle
            key={p.t}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#0B5D3B"
            stroke="#F4B942"
            strokeWidth="2"
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 1.1 + i * 0.16 }}
          />
        ))}

        {pts.map((p) => (
          <text key={`t-${p.t}`} x={p.x} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize="9" fontFamily="monospace">
            {p.t}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function Innovation() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-emerald-950 py-20 sm:py-24 lg:py-28" id="vision">
      {/* ambient depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(63,174,90,0.14),transparent_55%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_80%,rgba(244,185,66,0.08),transparent_50%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)', backgroundSize: '72px 72px' }} aria-hidden />

      <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="The Innovation"
            tone="dark"
            title={<>One Batch.<br />Two Intelligence Layers.</>}
            sub="Computer vision evaluates what can be seen. IoT sensing adds signals that may reveal what cannot."
          />
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-7">
          {/* ============ LEFT — COMPUTER VISION ============ */}
          <Reveal delay={0.05}>
            <div className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-fresh">Computer Vision</div>
                  <h3 className="mt-2 text-xl font-extrabold text-white sm:text-2xl">AI Sees Every Onion.</h3>
                </div>
                <span className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/50">
                  YOLO / CV
                </span>
              </div>

              {/* detection plate */}
              <div className="relative mt-5 overflow-hidden rounded-2xl bg-emerald-900/40">
                <img
                  src="/onions/spotted-batch.jpg"
                  alt="Onion batch being analysed by the computer vision model"
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/11] w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute inset-x-0 h-1/2 animate-scan bg-gradient-to-b from-transparent via-fresh/20 to-transparent" />
                </div>
                {DETECTIONS.map((d, i) => (
                  <DetectBox key={d.label} label={d.label} conf={d.conf} tone={d.tone} style={d.style} delay={d.delay} />
                ))}
              </div>

              {/* detection summary */}
              <div className="mt-5">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/40">Detection Summary</div>
                <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-4 sm:grid-cols-6">
                  {SUMMARY.map((s, i) => (
                    <div key={s.l}>
                      <div className="font-mono text-xl font-extrabold leading-none text-white">
                        <CountUp value={s.v} duration={900 + i * 120} />
                      </div>
                      <div className="mt-1 text-[9.5px] font-medium uppercase tracking-wide text-white/45">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-xl border border-fresh/25 bg-fresh/[0.08] px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-fresh">Vision Score</span>
                <span className="font-mono text-2xl font-extrabold text-white">
                  <CountUp value={94} duration={1500} /> <span className="text-white/40">/ 100</span>
                </span>
              </div>
            </div>
          </Reveal>

          {/* ============ RIGHT — IoT QUALITY POD ============ */}
          <Reveal delay={0.15}>
            <div className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-amber">IoT Quality Pod</div>
                  <h3 className="mt-2 text-xl font-extrabold text-white sm:text-2xl">Detect What May Not Be Visible Yet.</h3>
                </div>
                <span className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/50">
                  GAS / ENV
                </span>
              </div>

              {/* sensor chamber */}
              <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-emerald-900/60 to-emerald-950">
                <div className="relative aspect-[16/11] w-full">
                  <img
                    src="/onions/healthy-cluster.jpg"
                    alt="Onion sample inside the IoT quality sensing chamber"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover opacity-55"
                  />
                  <div className="absolute inset-0 bg-emerald-950/45" />

                  {/* glowing sensor rings */}
                  <div className="absolute inset-0 grid place-items-center" aria-hidden>
                    {[0, 1].map((r) => (
                      <motion.span
                        key={r}
                        className="absolute rounded-full border border-amber/25"
                        style={{ width: `${48 + r * 30}%`, aspectRatio: '1' }}
                        animate={reduce ? undefined : { opacity: [0.15, 0.5, 0.15], scale: [0.96, 1.04, 0.96] }}
                        transition={{ duration: 4, delay: r * 0.9, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>

                  {/* sensor nodes + glowing connection lines to the pod core */}
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    {[
                      { x1: 16, y1: 22, x2: 50, y2: 50 },
                      { x1: 82, y1: 26, x2: 50, y2: 50 },
                      { x1: 26, y1: 80, x2: 50, y2: 50 },
                    ].map((l, i) => (
                      <motion.line
                        key={i}
                        x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                        stroke="rgba(244,185,66,0.55)"
                        strokeWidth="0.4"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 1 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 1.1, delay: 0.45 + i * 0.22, ease: 'easeInOut' }}
                      />
                    ))}
                  </svg>
                  {[
                    { style: { left: '16%', top: '22%' } },
                    { style: { right: '18%', top: '26%' } },
                    { style: { left: '26%', bottom: '20%' } },
                  ].map((n, i) => (
                    <motion.span
                      key={`node-${i}`}
                      className="absolute h-2 w-2 rounded-full bg-amber shadow-[0_0_12px_2px_rgba(244,185,66,0.7)]"
                      style={n.style}
                      animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
                      transition={{ duration: 1.9, delay: i * 0.4, repeat: Infinity }}
                      aria-hidden
                    />
                  ))}

                  <div className="absolute bottom-2.5 left-2.5 rounded-md bg-emerald-950/70 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-amber backdrop-blur">
                    Chamber · sealed
                  </div>
                </div>
              </div>

              {/* sensor readouts */}
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {SENSORS.map((s, i) => (
                  <div key={s.k} className="rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-2.5">
                    <div className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-white/45">{s.k}</div>
                    <div className="mt-1 font-mono text-base font-extrabold leading-none text-white">
                      <CountUp value={s.v} decimals={s.decimals} duration={1100 + i * 150} />
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] text-white/35">{s.unit}</div>
                  </div>
                ))}
              </div>

              {/* trend */}
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-3 pb-2 pt-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/45">Live Sensor Trend</span>
                  <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-amber">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                    Demo Data
                  </span>
                </div>
                <SensorTrend />
              </div>
              <DemoNote tone="dark">
                Demo sensor data shown for illustration. Values are not measurements from a specific lot.
              </DemoNote>

              {/* status */}
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">Sensor Status</div>
                  <div className="mt-1 text-sm font-extrabold text-fresh">STABLE</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">Early Spoilage Risk</div>
                  <motion.div
                    className="mt-1 text-sm font-extrabold text-amber"
                    animate={reduce ? undefined : { opacity: [1, 0.55, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                  >
                    LOW
                  </motion.div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
