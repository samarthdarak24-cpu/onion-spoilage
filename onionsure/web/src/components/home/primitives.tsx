import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

/* ------------------------------------------------------------------ *
 * Scroll reveal
 * ------------------------------------------------------------------ */

export function Reveal({
  children, delay = 0, y = 26, className, once = true, duration = 0.65,
}: {
  children: React.ReactNode; delay?: number; y?: number; className?: string; once?: boolean; duration?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-70px' }}
      transition={{ duration: reduce ? 0.2 : duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Counter that starts when scrolled into view
 * ------------------------------------------------------------------ */

export function CountUp({
  value, duration = 1500, decimals = 0, suffix = '', prefix = '', className,
}: {
  value: number; duration?: number; decimals?: number; suffix?: string; prefix?: string; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setDisplay(value); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Computer-vision bounding box
 * Rendered as an absolutely positioned overlay on an onion photo.
 * Percentage-based so it scales with the image and never distorts it.
 * ------------------------------------------------------------------ */

export type DetectTone = 'healthy' | 'damaged' | 'rotten' | 'sprouted' | 'undersized';

const TONES: Record<DetectTone, { border: string; glow: string; chip: string; text: string }> = {
  healthy:    { border: '#3FAE5A', glow: 'rgba(63,174,90,0.22)',  chip: '#3FAE5A', text: '#EAF7EE' },
  damaged:    { border: '#F4B942', glow: 'rgba(244,185,66,0.22)', chip: '#F4B942', text: '#2A210B' },
  rotten:     { border: '#D9534F', glow: 'rgba(217,83,79,0.22)',  chip: '#D9534F', text: '#FDEDED' },
  sprouted:   { border: '#8B5CF6', glow: 'rgba(139,92,246,0.22)', chip: '#8B5CF6', text: '#F3EEFF' },
  undersized: { border: '#0EA5E9', glow: 'rgba(14,165,233,0.22)', chip: '#0EA5E9', text: '#E8F7FE' },
};

export function DetectBox({
  label, conf, tone = 'healthy', style, delay = 0, compact = false,
}: {
  label: string; conf: number; tone?: DetectTone;
  style: React.CSSProperties; delay?: number; compact?: boolean;
}) {
  const t = TONES[tone];
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={style}
      initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="relative h-full w-full"
        style={{
          border: `1.5px solid ${t.border}`,
          boxShadow: `0 0 0 1px ${t.glow}, inset 0 0 22px ${t.glow}`,
          borderRadius: 3,
        }}
      >
        {/* corner ticks — reads as CV output rather than a plain rectangle */}
        {(['left-0 top-0', 'right-0 top-0', 'left-0 bottom-0', 'right-0 bottom-0'] as const).map((pos) => (
          <span
            key={pos}
            className={clsx('absolute h-2 w-2', pos)}
            style={{ borderColor: t.border, borderWidth: 2, borderStyle: 'solid', borderRightColor: pos.includes('right') ? 'transparent' : t.border }}
          />
        ))}
        <span
          className="absolute -top-[1px] left-0 whitespace-nowrap px-1.5 py-[1px] font-mono font-semibold uppercase leading-tight"
          style={{ background: t.chip, color: t.text, fontSize: compact ? 7 : 9, letterSpacing: '0.06em' }}
        >
          {label} {conf}%
        </span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Small technical section label
 * ------------------------------------------------------------------ */

export function Eyebrow({ children, className, tone = 'light' }: { children: React.ReactNode; className?: string; tone?: 'light' | 'dark' }) {
  return (
    <div className={clsx(
      'flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.22em]',
      tone === 'dark' ? 'text-sb-300' : 'text-fresh',
      className,
    )}>
      <span className={clsx('h-px w-6', tone === 'dark' ? 'bg-sb-400/60' : 'bg-fresh/50')} />
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow, title, sub, align = 'left', tone = 'light', className,
}: {
  eyebrow: string; title: React.ReactNode; sub?: string;
  align?: 'left' | 'center'; tone?: 'light' | 'dark'; className?: string;
}) {
  return (
    <div className={clsx(
      'max-w-3xl',
      align === 'center' && 'mx-auto text-center',
      className,
    )}>
      <Eyebrow tone={tone} className={align === 'center' ? 'justify-center' : undefined}>{eyebrow}</Eyebrow>
      <h2 className={clsx(
        'mt-3 text-[26px] font-extrabold leading-[1.12] tracking-tight sm:text-4xl lg:text-[42px]',
        tone === 'dark' ? 'text-white' : 'text-emerald-950',
      )}>
        {title}
      </h2>
      {sub && (
        <p className={clsx(
          'mt-4 text-[15px] leading-relaxed sm:text-base',
          tone === 'dark' ? 'text-emerald-100/70' : 'text-emerald-800/70',
          align === 'center' && 'mx-auto',
        )}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Illustrative-data disclaimer
 * ------------------------------------------------------------------ */

export function DemoNote({ children, tone = 'light' }: { children: React.ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <p className={clsx(
      'mt-3 flex items-start gap-1.5 text-[10.5px] font-medium leading-snug',
      tone === 'dark' ? 'text-emerald-200/45' : 'text-emerald-700/50',
    )}>
      <span aria-hidden className="mt-[1px]">*</span>
      <span>{children}</span>
    </p>
  );
}

/* ------------------------------------------------------------------ *
 * Button — renders as <Link> or <a>, never a dead button
 * ------------------------------------------------------------------ */

export function ActionLink({
  href, children, variant = 'primary', className, arrow = false,
}: {
  href: string; children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghostLight' | 'ghostDark';
  className?: string; arrow?: boolean;
}) {
  const base = 'group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300';
  const variants = {
    primary: 'bg-fresh text-emerald-950 shadow-[0_8px_24px_-8px_rgba(63,174,90,0.7)] hover:bg-[#4FBE6A] hover:shadow-[0_12px_30px_-8px_rgba(63,174,90,0.85)]',
    secondary: 'border border-white/25 bg-white/10 text-white backdrop-blur hover:border-white/45 hover:bg-white/[0.16]',
    ghostLight: 'border border-emerald-200 bg-white text-forest hover:border-fresh hover:bg-emerald-50',
    ghostDark: 'border border-white/20 text-white hover:border-white/50 hover:bg-white/10',
  };
  return (
    <a href={href} className={clsx(base, variants[variant], className)}>
      {children}
      {arrow && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </a>
  );
}
