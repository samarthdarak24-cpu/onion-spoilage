import React, { useEffect, useState } from 'react';
import { motion, animate, useMotionValue, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/* Page & list transitions                                             */
/* ------------------------------------------------------------------ */

/** Wrap a page so it eases in on navigation. */
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Container that reveals its `StaggerItem` children one after another. */
export function Stagger({ children, className, gap = 0.045, delay = 0 }: { children: React.ReactNode; className?: string; gap?: number; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { delayChildren: delay, staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Subtle lift on hover — used on every interactive card. */
export function HoverCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}

/** Re-mounts its child with a fade whenever `key` changes. */
export function SwapFade({ id, children, className }: { id: any; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={String(id)}
        className={className}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Numbers & values                                                    */
/* ------------------------------------------------------------------ */

/** Counts smoothly to `value` whenever it changes. */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const target = Number.isFinite(value) ? value : 0;
  const mv = useMotionValue(target);
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    const controls = animate(mv, target, { duration: 0.7, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [target]);

  useEffect(() => mv.on('change', (v) => setDisplay(v)), []);

  return (
    <span className={clsx('tabular-nums', className)}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Loading placeholders                                                */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-emerald-100/70', className)} />;
}

/** Drop-in skeleton shaped like the dashboard stat grid. */
export function SkeletonStats({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-14" />
          <Skeleton className="mt-2 h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={clsx('grid gap-3 md:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-4 w-40" />
          <Skeleton className="mt-4 h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Small dot that pulses when a background refresh is in flight. */
export function RefreshPulse({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18 }}
          className="inline-block h-1.5 w-1.5 rounded-full bg-fresh"
        />
      )}
    </AnimatePresence>
  );
}
