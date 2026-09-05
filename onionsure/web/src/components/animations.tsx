import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/** Simple animated counter 0 -> value */
export function CountUp({ value, duration = 1200, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = ref.current;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (value - from) * eased);
      setDisplay(v);
      ref.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}{suffix}</>;
}

/** Onion SVG glyph */
export function OnionGlyph({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <radialGradient id="og" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#6FD08C" />
          <stop offset="100%" stopColor="#0B5D3B" />
        </radialGradient>
      </defs>
      <path d="M24 6c2 4 2 7 0 10-4 0-6 3-6 8s3 12 6 16c3-4 6-10 6-16s-2-8-6-8c-2-3-2-6 0-10z" fill="url(#og)" />
      <path d="M24 16c-3 2-5 6-5 11M24 16c3 2 5 6 5 11M24 22v16" stroke="#F7F5EA" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M24 5c-2 0-3 2-2 4M24 5c2 0 3 2 2 4" stroke="#3FAE5A" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

/** Status pulse dot */
export function PulseDot({ color = '#3FAE5A', label }: { color?: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-pulseRing" style={{ background: color }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      </span>
      {label}
    </span>
  );
}

/** Scanning animation for hero / capture */
export function ScannerAnimation({ className }: { className?: string }) {
  return (
    <div className={clsx('relative aspect-square w-full overflow-hidden rounded-3xl bg-gradient-to-br from-darkgreen to-forest', className)}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 40%, #ffffff33, transparent 60%)' }} />
      {/* onion batch */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div key={i} className="h-9 w-9 rounded-full bg-gradient-to-br from-fresh to-forest shadow-inner"
              animate={{ y: [0, -4, 0] }} transition={{ duration: 2 + i * 0.2, repeat: Infinity, ease: 'easeInOut' }} />
          ))}
        </div>
      </div>
      {/* scan line */}
      <div className="absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-white/0 via-white/60 to-white/0" />
      {/* scanning frame */}
      <div className="absolute inset-4 rounded-2xl border-2 border-dashed border-white/40" />
      <div className="absolute bottom-3 left-3 chip bg-white/15 text-white backdrop-blur">AI SCAN ACTIVE</div>
    </div>
  );
}

/** Floating metric card used in hero */
export function FloatingCard({ label, value, tone = 'forest', style }: { label: string; value: string; tone?: 'forest' | 'amber' | 'reject'; style?: React.CSSProperties }) {
  const tones: any = { forest: 'text-forest', amber: 'text-amber-600', reject: 'text-reject' };
  return (
    <motion.div
      className="glass absolute rounded-2xl px-4 py-3 shadow-soft"
      style={style}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/70">{label}</div>
      <div className={clsx('text-lg font-extrabold', tones[tone])}>{value}</div>
    </motion.div>
  );
}

/** Fusion flow arrows */
export function FusionFlow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity }} className="text-fresh">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 4v16M6 14l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </motion.div>
    </div>
  );
}
