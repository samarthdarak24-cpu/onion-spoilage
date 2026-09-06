import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Play } from 'lucide-react';
import { ActionLink, CountUp, DetectBox } from './primitives';

const CAPABILITIES = ['AI Defect Detection', 'Grade A & URS', 'IoT Spoilage Monitoring', 'Digital Reports'];

/** Onion inspection tiles — every image is a real onion photograph. */
const TILES = [
  { src: '/onions/healthy-closeup.jpg', alt: 'Close-up of a healthy onion bulb under inspection', boxes: [{ label: 'Healthy', conf: 96, tone: 'healthy' as const, style: { left: '14%', top: '16%', width: '56%', height: '58%' } }] },
  { src: '/onions/damaged-batch.jpg', alt: 'Batch of damaged onions showing surface defects', boxes: [{ label: 'Damaged', conf: 91, tone: 'damaged' as const, style: { left: '10%', top: '20%', width: '62%', height: '54%' } }] },
  { src: '/onions/moldy-mixed.jpg', alt: 'Onions showing rot and mould contamination', boxes: [{ label: 'Rotten', conf: 94, tone: 'rotten' as const, style: { left: '22%', top: '24%', width: '54%', height: '50%' } }] },
  { src: '/onions/healthy-cluster.jpg', alt: 'Cluster of graded healthy onions', boxes: [{ label: 'Healthy', conf: 93, tone: 'healthy' as const, style: { left: '18%', top: '18%', width: '58%', height: '56%' } }] },
];

function InspectionCard() {
  const reduce = useReducedMotion();
  return (
    <div className="relative">
      {/* soft ambient glow behind the glass */}
      <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-fresh/20 blur-3xl" aria-hidden />

      <motion.div
        className="relative overflow-hidden rounded-[22px] border border-white/20 bg-white/[0.09] p-3 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150 sm:p-3.5"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* floating idle motion */}
        <motion.div animate={reduce ? undefined : { y: [0, -6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
          {/* ---- card header ---- */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/55">Live AI Inspection</div>
              <div className="mt-0.5 font-mono text-[10px] text-white/40">ON-2026-00421</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-fresh/40 bg-fresh/15 px-2 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-fresh" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-fresh" />
              </span>
              <span className="text-[8.5px] font-bold tracking-widest text-fresh">LIVE</span>
            </span>
          </div>

          {/* ---- image collage + CV boxes ---- */}
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {TILES.map((tile, i) => (
              <div key={tile.src} className="relative aspect-[4/3] overflow-hidden rounded-md bg-emerald-950/60">
                <img
                  src={tile.src}
                  alt={tile.alt}
                  loading={i < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                {/* scanline sweep */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div
                    className="absolute inset-x-0 h-1/2 animate-scan bg-gradient-to-b from-transparent via-fresh/25 to-transparent"
                    style={{ animationDelay: `${i * 0.6}s` }}
                  />
                </div>
                {tile.boxes.map((b, j) => (
                  <DetectBox key={j} label={b.label} conf={b.conf} tone={b.tone} style={b.style} delay={0.6 + i * 0.18} compact />
                ))}
              </div>
            ))}
          </div>

          {/* ---- signal row ---- */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[
              { k: 'VISION', v: 94 },
              { k: 'GAS + ENV', v: 87 },
              { k: 'FUSION', v: 91 },
            ].map((s, i) => (
              <div key={s.k} className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-1.5 text-center">
                <div className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-white/50">{s.k}</div>
                <div className="mt-0.5 font-mono text-[14px] font-bold leading-none text-white">
                  <CountUp value={s.v} duration={1200 + i * 200} />
                </div>
              </div>
            ))}
          </div>

          {/* ---- result ---- */}
          <div className="mt-2.5 flex items-end justify-between rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.03] px-3 py-2.5">
            <div>
              <div className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/50">Quality Score</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-mono text-[22px] font-extrabold leading-none text-white">
                  <CountUp value={91} duration={1800} />
                </span>
                <span className="font-mono text-[10px] text-white/45">/ 100</span>
              </div>
            </div>
            <motion.span
              className="rounded-md bg-fresh px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-emerald-950"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 1.9, ease: [0.22, 1, 0.36, 1] }}
            >
              GRADE A
            </motion.span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // Mouse parallax — subtle, never distracting.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 22, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 90, damping: 22, mass: 0.6 });
  const rotateY = useTransform(sx, [-1, 1], [4.5, -4.5]);
  const rotateX = useTransform(sy, [-1, 1], [-3.5, 3.5]);
  const shiftX = useTransform(sx, [-1, 1], [10, -10]);
  const shiftY = useTransform(sy, [-1, 1], [8, -8]);

  useEffect(() => {
    if (reduce) return;
    const el = sectionRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      px.set(((e.clientX - r.left) / r.width - 0.5) * 2);
      py.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    };
    const onLeave = () => { px.set(0); py.set(0); };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, [px, py, reduce]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-darkgreen pt-[68px]"
    >
      {/* ---------- cinematic background ---------- */}
      <div className="absolute inset-0 -z-10">
        {/* hero video — silent, looped, slightly darkened so white type stays legible */}
        <video
          src="/hero.mp4"
          autoPlay muted loop playsInline preload="auto"
          poster="/crops/onion.jpg"
          className="h-full w-full object-cover"
        />
        {/* subtle dark green gradient, left → right, so the hero text stays
            readable while the video reads clearly on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/62 via-emerald-950/22 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/45 via-transparent to-transparent" />
        {/* film grain only — no grid/checkerboard overlay */}
        <div className="grain absolute inset-0" />
      </div>

      <div className="w-full grid items-start gap-8 px-6 py-12 sm:px-10 lg:px-14 xl:px-20 lg:grid-cols-[1fr_auto] lg:gap-12 lg:py-14">
        {/* ---------- left: hero content ---------- */}
        <div className="flex flex-col items-start text-left max-w-2xl">
          <motion.div
            className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 backdrop-blur"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-fresh" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">AI + IoT + Computer Vision</span>
          </motion.div>

          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-[62px]">
            {['Smarter Onion Grading.', 'Fairer Quality Decisions.'].map((line, i) => (
              <motion.span
                key={line}
                className="block"
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.12 + i * 0.14, ease: [0.22, 1, 0.36, 1] }}
              >
                {i === 1 ? <span className="text-fresh">{line}</span> : line}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.4)] sm:text-[17px]"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
          >
            AI-powered onion quality inspection that detects defects, estimates Grade A and URS
            percentages, combines computer vision with IoT insights, and generates transparent
            digital quality reports.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center justify-start gap-3"
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.52 }}
          >
            <ActionLink href="/login" variant="primary" arrow>Start Quality Inspection</ActionLink>
            <Link
              to="/how-it-works"
              className="group inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:border-white/45 hover:bg-white/[0.12]"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 transition-colors duration-300 group-hover:bg-white/25">
                <Play size={11} className="ml-0.5" fill="currentColor" />
              </span>
              See How It Works
            </Link>
          </motion.div>

          <motion.ul
            className="mt-9 flex flex-wrap justify-start gap-2.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.68 }}
          >
            {CAPABILITIES.map((c) => (
              <li
                key={c}
                className="rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-medium text-emerald-100/70 backdrop-blur"
              >
                {c}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* ---------- right: compact live inspection panel flush right ---------- */}
        <motion.div
          className="relative w-full max-w-[380px] sm:max-w-[410px] lg:max-w-[430px] ml-auto mr-0"
          style={reduce ? undefined : { rotateX, rotateY, x: shiftX, y: shiftY, transformPerspective: 1100 }}
        >
          <InspectionCard />
        </motion.div>
      </div>

      {/* bottom hero row */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden lg:block">
        <div className="w-full flex items-end justify-between px-6 sm:px-10 lg:px-14 xl:px-20 pb-6">
          <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.22em] text-white/60">
            <motion.span animate={reduce ? undefined : { y: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>↓</motion.span>
            Scroll
          </div>
          <div className="flex items-center gap-5">
            {['AI Powered', 'IoT Enabled', 'Transparent Reports'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-fresh" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* bottom fade into the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-950 to-transparent" />
    </section>
  );
}
