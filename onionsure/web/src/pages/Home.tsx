import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ScanLine, Cpu, Radio, ShieldCheck, Leaf, Truck, QrCode, BarChart3, FlaskConical,
  Eye, Wind, GitMerge, CheckCircle2, AlertTriangle, ArrowRight, PlayCircle, Database, Sprout,
  Activity, Boxes, FileText, Layers, Cpu as CpuIcon, Network, ScanFace, Microscope, Wifi,
} from 'lucide-react';
import { Logo } from '../components/Brand';
import { CountUp, OnionGlyph, PulseDot, ScannerAnimation } from '../components/animations';
import { SectionTitle, Badge, Card, StatCard } from '../components/ui';
import { Donut, TrendLine, DefectBars } from '../components/charts';

const Reveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.6, delay }}>{children}</motion.div>
);

const NAV = [
  { href: '#how', label: 'How It Works' },
  { href: '#vision', label: 'AI Inspection' },
  { href: '#iot', label: 'IoT Monitoring' },
  { href: '#reports', label: 'Quality Reports' },
  { href: '#farmers', label: 'For Farmers' },
  { href: '#fpos', label: 'For FPOs' },
];

export default function Home() {
  const [score, setScore] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(eased * 92));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="bg-[#f4f6f2] text-emerald-950">
      {/* ============== HEADER ============== */}
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Logo />
          <nav className="hidden gap-7 text-sm font-medium text-emerald-800 md:flex">
            {NAV.map((n) => (<a key={n.href} href={n.href} className="hover:text-forest">{n.label}</a>))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex nav-link px-3 py-2">Sign In</Link>
            <Link to="/login" className="btn-primary text-sm">Start Inspection <ArrowRight size={14} /></Link>
          </div>
        </div>
      </header>

      {/* ============== HERO — full-bleed video + scanner overlay ============== */}
      <section className="relative isolate overflow-hidden text-white" style={{ minHeight: 720 }}>
        {/* Background video */}
        <video
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          src="/hero.mp4"
          autoPlay loop muted playsInline preload="auto"
          poster="/crops/onion.jpg"
        />
        {/* Dark + tint gradient overlay — light enough to see video */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-darkgreen/25 via-forest/15 to-black/35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        {/* Left-side text shield — keeps copy readable over light video frames */}
        <div className="absolute inset-y-0 left-0 -z-10 w-2/3 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 md:grid-cols-12 md:py-28">
          {/* left copy */}
          <div className="md:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              <Cpu size={13} className="text-fresh" /> AI + IoT + COMPUTER VISION
            </div>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
              style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}>
              Connecting Farms<br />to <span className="text-fresh">Better Markets.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/90 sm:text-lg drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]">
              An AI-powered onion quality platform connecting farmers, FPOs and procurement centers with
              smarter grading, early spoilage sensing and transparent digital reports.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                Start Quality Inspection <ArrowRight size={15} />
              </Link>
              <Link to="/demo" className="inline-flex items-center gap-2 rounded-xl bg-fresh px-5 py-3 text-sm font-extrabold text-forest transition hover:bg-emerald-300">
                <PlayCircle size={16} /> See How It Works
              </Link>
            </div>
            <div className="mt-6 text-sm font-semibold text-white/80">
              <span className="opacity-80">See How OnionSure Works.</span> <ArrowRight size={13} className="inline -mt-0.5 text-fresh" />
            </div>

            {/* feature strip with icons */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-white/85">
              {[
                { i: CheckCircle2, l: 'AI Defect Detection' },
                { i: Radio, l: 'IoT Early Spoilage' },
                { i: ShieldCheck, l: 'FPO Escrow Verified' },
                { i: Truck, l: 'Reliable Grading' },
              ].map((f) => (
                <div key={f.l} className="flex items-center gap-1.5">
                  <f.i size={15} className="text-fresh" /> {f.l}
                </div>
              ))}
            </div>
          </div>

          {/* right — scanner overlay panel (floating crop tiles + reticles) */}
          <div className="relative md:col-span-5">
            <div className="relative mx-auto h-[420px] w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.06] shadow-2xl backdrop-blur-md">
              {/* corner reticles */}
              <span className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-fresh" />
              <span className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-fresh" />
              <span className="absolute left-3 bottom-3 h-5 w-5 border-l-2 border-b-2 border-fresh" />
              <span className="absolute right-3 bottom-3 h-5 w-5 border-r-2 border-b-2 border-fresh" />
              {/* header */}
              <div className="flex items-center justify-between px-5 pt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                <div className="flex items-center gap-2"><ScanLine size={14} className="text-fresh" /> LIVE INSPECTION</div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-fresh animate-pulse" /> ON-2026-00421
                </div>
              </div>

              {/* crop tiles grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 px-5">
                {[
                  { src: '/crops/onion.jpg', l: 'ONION', s: 'Healthy · 94%' },
                  { src: '/crops/tomato.jpg', l: 'TOMATO', s: 'Surface · 87%' },
                  { src: '/crops/grape.jpg', l: 'GRAPE', s: 'Fresh · 91%' },
                  { src: '/crops/pomegranate.jpg', l: 'POMEGRANATE', s: 'Grade A · 96%' },
                ].map((c, i) => (
                  <motion.div key={c.l}
                    className="relative h-[78px] overflow-hidden rounded-xl border border-white/15 bg-black/30"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}>
                    <img src={c.src} alt={c.l} className="absolute inset-0 h-full w-full object-cover opacity-80" />
                    {/* moving scan line */}
                    <motion.div className="absolute inset-x-0 h-6 bg-gradient-to-b from-fresh/0 via-fresh/60 to-fresh/0"
                      initial={{ top: '-15%' }} animate={{ top: ['-15%', '115%'] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 + i * 0.2 }} />
                    {/* tile reticles */}
                    <span className="absolute left-1 top-1 h-2.5 w-2.5 border-l border-t border-fresh" />
                    <span className="absolute right-1 top-1 h-2.5 w-2.5 border-r border-t border-fresh" />
                    <span className="absolute left-1 bottom-1 h-2.5 w-2.5 border-l border-b border-fresh" />
                    <span className="absolute right-1 bottom-1 h-2.5 w-2.5 border-r border-b border-fresh" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-white/95">{c.l}</span>
                        <span className="text-fresh">{c.s}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* scanner footprint */}
              <motion.div className="mx-5 mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold text-white/85"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0, duration: 0.5 }}>
                <div className="flex items-center gap-2"><Eye size={13} className="text-fresh" /> VISION <span className="text-fresh">94</span></div>
                <div className="h-3 w-px bg-white/20" />
                <div className="flex items-center gap-2"><Wind size={13} className="text-fresh" /> GAS+ENV <span className="text-fresh">87/91</span></div>
                <div className="h-3 w-px bg-white/20" />
                <div className="flex items-center gap-1.5 text-fresh"><GitMerge size={13} /> FUSION</div>
              </motion.div>

              {/* score line */}
              <motion.div className="mx-5 mt-3 flex items-center justify-between rounded-xl border border-fresh/40 bg-fresh/10 px-3 py-2.5"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }}>
                <div className="text-[11px] font-bold uppercase tracking-wide text-white/70">Quality Score</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-white">{score}</span><span className="text-xs text-white/50">/100</span>
                </div>
                <div className="rounded-full bg-fresh px-2.5 py-1 text-[11px] font-extrabold text-forest">GRADE A</div>
              </motion.div>

              {/* video controls */}
              <div className="absolute bottom-3 right-4 flex items-center gap-2 text-[10px] text-white/70">
                <span>HD · 1080p</span>
                <span className="h-1.5 w-1.5 rounded-full bg-fresh animate-pulse" />
                <span>REC</span>
              </div>
            </div>
          </div>
        </div>

        {/* bottom strip — eyebrow + bold tag row */}
        <div className="relative mx-auto max-w-7xl border-t border-white/10 px-5 py-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
            One trusted layer from farm to doorstep
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm font-extrabold uppercase tracking-wider text-white">
            <span className="flex items-center gap-1.5"><BarChart3 size={14} className="text-fresh" /> Market Data</span>
            <span className="text-white/30">·</span>
            <span className="flex items-center gap-1.5"><FlaskConical size={14} className="text-fresh" /> Quality Labs</span>
            <span className="text-white/30">·</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-fresh" /> Escrow Payments</span>
            <span className="text-white/30">·</span>
            <span className="flex items-center gap-1.5"><QrCode size={14} className="text-fresh" /> QR Reports</span>
          </div>
        </div>
      </section>

      {/* ============== LIVE INSPECTION STATUS ============== */}
      <section className="border-b border-emerald-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-6 md:grid-cols-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-emerald-800">
            {[
              { t: 'IoT Pod Connected', c: '#0B5D3B' },
              { t: 'Camera Ready', c: '#0B5D3B' },
              { t: 'AI Model Ready', c: '#0B5D3B' },
              { t: 'Quality Engine Online', c: '#0B5D3B' },
            ].map((s) => (<div key={s.t} className="flex items-center gap-2"><PulseDot color={s.c} label={s.t} /></div>))}
          </div>
          <div className="flex items-center justify-center gap-6 rounded-2xl bg-cream px-4 py-3 text-sm">
            <div><div className="text-[10px] uppercase tracking-wide text-emerald-500">Current Lot</div><div className="font-extrabold text-forest">ON-2026-00421</div></div>
            <div><div className="text-[10px] uppercase tracking-wide text-emerald-500">Sample</div><div className="font-extrabold text-forest">1.8 kg</div></div>
            <div><div className="text-[10px] uppercase tracking-wide text-emerald-500">Inspection</div><div className="font-extrabold text-fresh">Ready</div></div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { l: 'Today', v: 48 }, { l: 'Grade A', v: 31 }, { l: 'URS', v: 11 }, { l: 'Rejected', v: 6 },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-emerald-50 py-2">
                <div className="text-lg font-extrabold text-forest"><CountUp value={s.v} /></div>
                <div className="text-[10px] text-emerald-600">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== THE PROBLEM ============== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="The Problem" title="Onion Grading Shouldn't Depend on Opinion." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { n: '01', t: 'Subjective Grading', d: 'Different inspectors can evaluate the same onion batch differently, creating inconsistency.' },
              { n: '02', t: "Visible Defects Aren't Everything", d: 'Camera-based inspection can identify external defects, but early-stage internal spoilage may not yet be visible.' },
              { n: '03', t: 'No Digital Evidence', d: 'Paper/manual inspection makes quality decisions harder to verify and disputes harder to resolve.' },
            ].map((c, i) => (
              <Reveal key={c.n} delay={i * 0.1}>
                <Card className="h-full">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-fresh/20 text-forest font-extrabold">{c.n}</div>
                  <h3 className="mt-4 text-lg font-extrabold text-forest">{c.t}</h3>
                  <p className="mt-2 text-sm text-emerald-700/80">{c.d}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============== ONE BATCH, TWO INTELLIGENCE LAYERS ============== */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="The Innovation" title="One Batch. Two Intelligence Layers." />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal>
              <Card className="h-full">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-forest to-darkgreen text-white"><Eye size={22} /></div>
                  <h3 className="text-xl font-extrabold text-forest">Computer Vision</h3>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Damaged', 'Rotten', 'Sprouted', 'Undersized', 'Healthy'].map((d) => (
                    <Badge key={d} tone={d === 'Healthy' ? 'forest' : 'amber'}>{d}</Badge>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
                  <div className="font-bold">Output</div> Vision Quality Score
                </div>
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="h-full">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fresh to-forest text-white"><Radio size={22} /></div>
                  <h3 className="text-xl font-extrabold text-forest">IoT Quality Pod</h3>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Ethane', 'Methane', 'Temperature', 'Humidity'].map((d) => (
                    <Badge key={d} tone="forest">{d}</Badge>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
                  <div className="font-bold">Output</div> Early Spoilage Risk
                </div>
              </Card>
            </Reveal>
          </div>

          {/* fusion center */}
          <Reveal delay={0.15}>
            <div className="mx-auto mt-8 max-w-md rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-card">
              <div className="text-sm font-bold uppercase tracking-wider text-fresh">Fusion Engine</div>
              <div className="mt-3 flex items-center justify-center gap-3 text-lg font-extrabold text-forest">
                <span>Vision</span><span className="text-fresh">+</span><span>Gas</span><span className="text-fresh">+</span><span>Environment</span>
              </div>
              <div className="my-2 text-fresh">↓</div>
              <div className="text-lg font-extrabold text-forest">AI Fusion</div>
              <div className="my-2 text-fresh">↓</div>
              <div className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-1.5 text-white font-extrabold">Final Quality Score</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============== WHY FUSION ============== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="Why Fusion?" title="What a Camera Can't See, the Sensor Can Sense." />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="rounded-3xl border border-emerald-100 bg-cream p-7">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">Traditional Vision</div>
                <div className="mt-4 space-y-2 text-sm font-semibold text-emerald-800">
                  <div>Onion ↓ Image ↓ Looks Healthy ↓ Grade</div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-3xl border border-fresh/30 bg-fresh/5 p-7">
                <div className="text-xs font-bold uppercase tracking-wider text-fresh">FarmLink Multimodal Analysis</div>
                <div className="mt-4 space-y-2 text-sm font-semibold text-forest">
                  <div>Image + Gas Signature + Temperature/Humidity ↓ Fusion AI ↓ Early Spoilage Risk</div>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 text-sm">
                  <CheckCircle2 size={18} className="text-forest" /> Looks Healthy Visually
                  <AlertTriangle size={18} className="text-amber-500" /> Elevated Gas Signature
                  <span className="ml-auto rounded-full bg-amber-400/90 px-2 py-1 text-xs font-extrabold text-black">Early Spoilage Alert</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section id="how" className="bg-cream">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="How It Works" title="From Sample to Standardized Grade" />
          <div className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            {[
              { n: '01', t: 'Register Lot', d: 'Farmer/FPO + lot details', i: FileText },
              { n: '02', t: 'Collect Sample', d: 'Representative 1–2 kg sample', i: Boxes },
              { n: '03', t: 'IoT Sensing', d: '60–90 sec gas/environment reading', i: Radio },
              { n: '04', t: 'Capture Images', d: 'Multiple onion angles', i: ScanLine },
              { n: '05', t: 'AI Fusion', d: 'Vision + Gas + Environment', i: GitMerge },
              { n: '06', t: 'Digital Grade', d: 'Grade A / URS / Rejected', i: BadgeCheckIcon },
            ].map((s, i) => {
              const Icon = s.i;
              return (
                <Reveal key={s.n} delay={i * 0.08}>
                  <div className="relative h-full rounded-3xl border border-emerald-100 bg-white p-5 shadow-card">
                    <div className="absolute -top-3 left-5 grid h-9 w-9 place-items-center rounded-full bg-fresh text-forest text-sm font-extrabold">{s.n}</div>
                    <Icon size={26} className="mt-3 text-forest" />
                    <h3 className="mt-3 text-base font-extrabold text-forest">{s.t}</h3>
                    <p className="mt-1 text-xs text-emerald-600/80">{s.d}</p>
                    {i < 5 && <div className="mt-3 text-fresh">↓</div>}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============== AI VISION DETECTION ============== */}
      <section id="vision" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle eyebrow="AI Vision" title="AI Sees Every Onion" />
          <div className="mt-12 grid gap-8 items-center md:grid-cols-2">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-black/30">
                <img src="/crops/onion.jpg" alt="Onion batch with detection" className="h-72 w-full object-cover" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <motion.div key={i} className="h-12 w-12 rounded-full border-2 border-fresh/80 bg-fresh/10"
                        animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2 + i * 0.2, repeat: Infinity }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                {[['Healthy', 'forest'], ['Rotten', 'reject'], ['Damaged', 'amber'], ['Sprouted', 'amber'], ['Undersized', 'fresh']].map(([l, c]) => (
                  <span key={l} className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                    <span className={`h-2.5 w-2.5 rounded-full bg-${c}`} /> {l}
                  </span>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <Card>
                <div className="text-xs font-bold uppercase tracking-wider text-fresh">Detection Summary</div>
                <div className="mt-2 text-3xl font-extrabold text-forest">128 onions detected</div>
                <div className="mt-4 space-y-2 text-sm">
                  {[['Healthy', 105, 'forest'], ['Damaged', 9, 'amber'], ['Rotten', 5, 'reject'], ['Sprouted', 4, 'amber'], ['Undersized', 5, 'fresh']].map(([l, v, c]) => (
                    <div key={l as string} className="flex items-center gap-3">
                      <span className="w-24 text-emerald-700">{l}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-emerald-100"><div className={`h-full rounded-full bg-${c}`} style={{ width: `${(v as number) / 1.28}%` }} /></div>
                      <span className="w-8 text-right font-bold text-forest">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-emerald-500">Vision Score</div>
                  <div className="text-3xl font-extrabold text-forest">94 / 100</div>
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============== IoT SECTION ============== */}
      <section id="iot" className="bg-cream">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle eyebrow="IoT Monitoring" title="Detect What May Not Be Visible Yet" />
          <div className="mt-12 grid gap-8 items-center md:grid-cols-2">
            <Reveal>
              <Card>
                <div className="text-xs font-bold uppercase tracking-wider text-fresh">Sensor Chamber</div>
                <div className="mt-3 flex items-center justify-center gap-3 text-4xl">🧅 🧅 🧅</div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {['Ethane', 'Methane', 'Temperature', 'Humidity'].map((s) => (
                    <span key={s} className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{s}</span>
                  ))}
                </div>
                <div className="mt-5 space-y-2 text-sm">
                  {[['ETHANE', '0.42 ppm'], ['METHANE', '0.18 ppm'], ['TEMP', '24.8°C'], ['HUMIDITY', '62%']].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2">
                      <span className="font-bold text-emerald-700">{l}</span><span className="font-extrabold text-forest">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 px-4 py-2 text-sm">
                  <span className="font-semibold text-emerald-700">Sensor Status</span>
                  <span className="flex items-center gap-1.5 text-fresh"><PulseDot color="#0B5D3B" label="Stable" /></span>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-xl bg-fresh/10 px-4 py-2 text-sm">
                  <span className="font-semibold text-forest">Early Spoilage Risk</span><span className="font-extrabold text-fresh">LOW</span>
                </div>
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="grid grid-cols-2 gap-4">
                {[['Ethane', 0.42], ['Methane', 0.18], ['Temperature', 24.8], ['Humidity', 62]].map(([l, v]) => (
                  <div key={l as string} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-card">
                    <div className="text-xs text-emerald-500">{l}</div>
                    <div className="text-2xl font-extrabold text-forest">{v}{l === 'Temperature' ? '°C' : l === 'Humidity' ? '%' : ' ppm'}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-emerald-600/80">Demo sensor data — values update live during a real 60–90 second sensing window.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============== FUSION RESULT ============== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="Fusion Result" title="From Multiple Signals to One Trusted Grade" />
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
            {[
              { l: 'VISION', v: 94, c: 'from-fresh to-forest' },
              { l: 'GAS', v: 76, c: 'from-amber to-orange-500' },
              { l: 'ENVIRONMENT', v: 91, c: 'from-emerald-400 to-forest' },
            ].map((m, i) => (
              <React.Fragment key={m.l}>
                <Reveal>
                  <div className="w-44 rounded-3xl border border-emerald-100 bg-cream p-5 text-center shadow-card">
                    <div className="text-xs font-bold uppercase tracking-wide text-emerald-500">{m.l}</div>
                    <div className="mt-2 text-4xl font-extrabold text-forest">{m.v}<span className="text-lg">/100</span></div>
                  </div>
                </Reveal>
                {i < 2 && <div className="text-3xl font-extrabold text-fresh">+</div>}
              </React.Fragment>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="mx-auto mt-8 max-w-md rounded-3xl border border-fresh/30 bg-fresh/5 p-6 text-center">
              <div className="text-sm font-bold uppercase tracking-wider text-fresh">AI Fusion Engine</div>
              <div className="my-2 text-fresh text-2xl">↓</div>
              <div className="text-5xl font-extrabold text-forest">87 / 100</div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-forest px-4 py-1.5 text-white font-extrabold">GRADE A</div>
            </div>
          </Reveal>
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-100 bg-white p-5 text-sm shadow-card">
            <div className="font-bold text-forest">Why Grade A?</div>
            <ul className="mt-2 space-y-1 text-emerald-700">
              <li>✓ High healthy percentage</li>
              <li>✓ Low visible damage</li>
              <li>✓ Acceptable size distribution</li>
              <li className="text-amber-600">⚠ Moderate gas-based spoilage risk</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ============== DIGITAL REPORT ============== */}
      <section id="reports" className="bg-cream">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="Digital Report" title="Every Inspection Ends With Evidence" />
          <Reveal>
            <div className="mx-auto mt-12 max-w-md rounded-3xl border border-emerald-200 bg-white p-7 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold text-forest">FARMLINK</div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-500">Digital Quality Report</div>
                </div>
                <QrCode size={48} className="text-forest" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-[10px] text-emerald-500">Lot ID</div><div className="font-bold text-forest">ON-2026-00421</div></div>
                <div><div className="text-[10px] text-emerald-500">Grade</div><div className="font-bold text-forest">A</div></div>
                <div><div className="text-[10px] text-emerald-500">Quality Score</div><div className="font-bold text-forest">87/100</div></div>
                <div><div className="text-[10px] text-emerald-500">Inspection Date</div><div className="font-bold text-forest">03 Sep 2026</div></div>
              </div>
              <div className="mt-4 space-y-2">
                {[['Grade A', 82, 'forest'], ['URS', 13, 'amber'], ['Rejected', 5, 'reject']].map(([l, v, c]) => (
                  <div key={l as string} className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-emerald-700">{l}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-emerald-100"><div className={`h-full rounded-full bg-${c}`} style={{ width: `${v}%` }} /></div>
                    <span className="w-10 text-right font-bold text-forest">{v}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-emerald-700">Vision <b className="text-forest">94</b> · Gas <b className="text-forest">76</b></span>
                <span className="text-emerald-500">Procurement Center Pune #03</span>
              </div>
              <div className="mt-5 flex gap-2">
                <Link to="/demo" className="btn-primary flex-1 justify-center text-sm">View Report</Link>
                <button className="btn-ghost text-sm">Download PDF</button>
                <button className="btn-ghost text-sm">Verify QR</button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============== QR VERIFICATION ============== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="QR Verification" title="Verify Any Lot in Seconds" />
          <Reveal>
            <div className="mx-auto mt-12 max-w-md rounded-3xl border border-fresh/30 bg-fresh/5 p-7 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-fresh/20 text-fresh"><CheckCircle2 size={30} /></div>
              <div className="mt-3 text-lg font-extrabold text-forest">QUALITY REPORT VERIFIED</div>
              <div className="mt-5 space-y-2 text-sm">
                {[['Lot', 'ON-2026-00421'], ['Grade', 'A'], ['Score', '87/100'], ['Inspection', '03 Sep 2026'], ['Status', 'Verified']].map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b border-emerald-100 pb-2">
                    <span className="text-emerald-500">{l}</span><span className="font-bold text-forest">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 text-fresh font-extrabold">Scan → Verify → Trust</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============== PROCUREMENT CENTER ============== */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="Procurement Centers" title="Built for Real Procurement Centers" />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <Reveal>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { l: "Today's Inspections", v: 48 },
                  { l: 'Grade A', v: 31 },
                  { l: 'URS', v: 11 },
                  { l: 'Rejected', v: 6 },
                  { l: 'Avg Score', v: 89.4 },
                ].map((s) => (
                  <StatCard key={s.l} label={s.l} value={<CountUp value={s.v} />} accent="forest" />
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <Card><div className="mb-2 text-xs font-bold uppercase tracking-wider text-fresh">Grade Distribution</div><Donut data={[{ name: 'Grade A', value: 82, color: '#0B5D3B' }, { name: 'URS', value: 13, color: '#F4B942' }, { name: 'Rejected', value: 5, color: '#D9534F' }]} /></Card>
            </Reveal>
            <Reveal delay={0.15}>
              <Card><div className="mb-2 text-xs font-bold uppercase tracking-wider text-fresh">Defect Distribution</div><DefectBars data={[{ name: 'Healthy', value: 105 }, { name: 'Damaged', value: 9 }, { name: 'Rotten', value: 5 }, { name: 'Sprouted', value: 4 }, { name: 'Undersized', value: 5 }]} /></Card>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card><div className="mb-2 text-xs font-bold uppercase tracking-wider text-fresh">Daily Inspections</div><TrendLine data={[{ t: 'Mon', v: 42 }, { t: 'Tue', v: 51 }, { t: 'Wed', v: 38 }, { t: 'Thu', v: 60 }, { t: 'Fri', v: 48 }]} xKey="t" yKey="v" /></Card>
              <Card><div className="mb-2 text-xs font-bold uppercase tracking-wider text-fresh">Quality Trend</div><TrendLine data={[{ t: 'Jan', v: 84 }, { t: 'Feb', v: 86 }, { t: 'Mar', v: 85 }, { t: 'Apr', v: 88 }, { t: 'May', v: 89 }]} xKey="t" yKey="v" color="#F4B942" /></Card>
            </div>
          </Reveal>
          <div className="mt-6 text-center text-sm font-semibold text-emerald-700">AI + IoT + Digital Reporting</div>
        </div>
      </section>

      {/* ============== FARMER / FPO ============== */}
      <section id="farmers" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="For Farmers & FPOs" title="From Subjective Inspection to Evidence-Based Grading" />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal>
              <Card className="h-full">
                <div className="flex items-center gap-3"><Sprout size={24} className="text-forest" /><h3 className="text-lg font-extrabold text-forest">Farmers</h3></div>
                <ul className="mt-4 space-y-2 text-sm text-emerald-700">
                  {['Register onion lots', 'Submit samples', 'View AI quality results', 'Download digital reports', 'Track quality history'].map((t) => (<li key={t} className="flex items-center gap-2"><CheckCircle2 size={15} className="text-fresh" /> {t}</li>))}
                </ul>
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="h-full">
                <div className="flex items-center gap-3"><Layers size={24} className="text-forest" /><h3 className="text-lg font-extrabold text-forest">FPOs</h3></div>
                <ul className="mt-4 space-y-2 text-sm text-emerald-700">
                  {['Manage farmer lots', 'Conduct batch inspections', 'Monitor quality trends', 'Compare procurement centers', 'Generate verified reports'].map((t) => (<li key={t} className="flex items-center gap-2"><CheckCircle2 size={15} className="text-fresh" /> {t}</li>))}
                </ul>
              </Card>
            </Reveal>
          </div>
          <div className="mt-8 text-center">
            <Link to="/login" className="btn-primary text-sm">Start a Quality Inspection <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>

      {/* ============== QUALITY ANALYTICS ============== */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="Quality Analytics" title="Turn Every Inspection Into Data" />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <Reveal>
              <Card>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-fresh">Quality Trend</div>
                <TrendLine data={[{ t: 'Jan', v: 84 }, { t: 'Feb', v: 86 }, { t: 'Mar', v: 85 }, { t: 'Apr', v: 88 }, { t: 'May', v: 89 }]} xKey="t" yKey="v" />
                <div className="mt-2 flex justify-between text-xs text-emerald-600"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span></div>
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-fresh">Defect Distribution</div>
                <DefectBars data={[{ name: 'Healthy', value: 105 }, { name: 'Damaged', value: 9 }, { name: 'Rotten', value: 5 }, { name: 'Sprouted', value: 4 }, { name: 'Undersized', value: 5 }]} />
              </Card>
            </Reveal>
            <Reveal delay={0.15}>
              <Card>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-fresh">Procurement Center Comparison</div>
                <div className="space-y-3">
                  {[['Pune', 91], ['Nashik', 89], ['Solapur', 87]].map(([c, v]) => (
                    <div key={c as string}>
                      <div className="flex justify-between text-sm"><span className="font-semibold text-forest">{c}</span><span className="font-bold text-forest">{v}</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-forest" style={{ width: `${v}%` }} /></div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-emerald-600/80">Consistent scoring across centers reduces inter-center disputes.</p>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============== TECHNOLOGY STACK ============== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center eyebrow="Technology" title="Powered by a Multimodal AI Stack" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: 'AI / ML', i: CpuIcon, items: ['YOLO', 'CNN', 'Random Forest', 'Python'] },
              { t: 'Computer Vision', i: Eye, items: ['OpenCV', 'Image Processing', 'Object Detection'] },
              { t: 'IoT', i: Wifi, items: ['ESP32', 'BLE/Wi-Fi', 'Gas Sensors', 'Temp/Humidity'] },
              { t: 'Platform', i: Database, items: ['React', 'Node.js', 'PostgreSQL'] },
            ].map((g, i) => (
              <Reveal key={g.t} delay={i * 0.08}>
                <Card className="h-full">
                  <div className="flex items-center gap-2 text-fresh"><g.i size={20} /><span className="font-extrabold text-forest">{g.t}</span></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {g.items.map((it) => (<span key={it} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{it}</span>))}
                  </div>
                </Card>
              </Reveal>
            ))}
            <Reveal delay={0.3}>
              <Card className="h-full">
                <div className="flex items-center gap-2 text-fresh"><ShieldCheck size={20} /><span className="font-extrabold text-forest">Verification</span></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['QR', 'Digital Reports', 'Blockchain/hash layer'].map((it) => (<span key={it} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{it}</span>))}
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============== BENEFITS ============== */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle center title="From Subjective Inspection to Evidence-Based Grading" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { i: Target, t: 'Standardized', d: 'Consistent quality assessment across lots and inspection centers.' },
              { i: Eye, t: 'More Reliable', d: 'Combines visible defects with environmental/gas signals.' },
              { i: Zap, t: 'Faster', d: 'Automates detection, scoring and report generation.' },
              { i: FileText, t: 'Transparent', d: 'Every inspection produces a digital, timestamped report.' },
              { i: Microscope, t: 'Explainable', d: 'Shows exactly why a lot received its grade.' },
              { i: Network, t: 'Accessible', d: 'Designed for mobile-first procurement workflows.' },
            ].map((b, i) => {
              const Icon = b.i;
              return (
                <Reveal key={b.t} delay={i * 0.06}>
                  <Card className="h-full">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-fresh/20 text-forest"><Icon size={22} /></div>
                    <h3 className="mt-4 font-extrabold text-forest">{b.t}</h3>
                    <p className="mt-2 text-sm text-emerald-700/80">{b.d}</p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-darkgreen via-forest to-emerald-800 text-white">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-fresh/15 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center">
          <h2 className="text-4xl font-extrabold sm:text-5xl" style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}>Make Onion Quality Measurable.</h2>
          <p className="mt-4 text-white/80">See the defect. Sense the hidden risk. Grade with evidence.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login" className="btn-primary bg-fresh text-forest hover:bg-emerald-300 text-sm">Start Quality Inspection <ArrowRight size={14} /></Link>
            <Link to="/demo" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition"><PlayCircle size={16} /> View Demo</Link>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="border-t border-emerald-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-emerald-600">AI + IoT + Computer Vision onion quality assessment, grading & transparent digital procurement.</p>
          </div>
          {[
            { t: 'Product', l: ['Quality Inspection', 'AI Vision', 'IoT Monitoring', 'Quality Reports', 'QR Verification'] },
            { t: 'Users', l: ['Farmers', 'FPOs', 'Procurement Centers', 'Buyers'] },
            { t: 'Technology', l: ['AI/ML', 'Computer Vision', 'IoT', 'PostgreSQL'] },
          ].map((c) => (
            <div key={c.t}>
              <div className="text-sm font-extrabold text-forest">{c.t}</div>
              <ul className="mt-3 space-y-2 text-sm text-emerald-600">
                {c.l.map((i) => (<li key={i} className="hover:text-forest cursor-pointer">{i}</li>))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-emerald-100">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-xs text-emerald-500">
            <div>© {new Date().getFullYear()} FarmLink — Onion Quality Intelligence · SIH 2026</div>
            <div>AI + IoT + Computer Vision</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// alias to avoid name clash with lucide BadgeCheck export
const BadgeCheckIcon = CheckCircle2;
const Target = CheckCircle2;
const Zap = FlaskConical;
// Microscope is already imported from lucide-react, no alias needed

