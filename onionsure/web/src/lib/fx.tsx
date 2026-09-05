import React, { useEffect, useState } from 'react';

/** Counts from 0 to `value` over `duration` ms, formatted with prefix/suffix. */
export function AnimatedNumber({
  value, duration = 1200, prefix = '', suffix = '', decimals = 0, className,
}: {
  value: number; duration?: number; prefix?: string; suffix?: string; decimals?: number; className?: string;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(eased * value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span className={className}>
      {prefix}{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

/** Reveal-on-mount wrapper with subtle upward translate + fade. */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        opacity: 0,
        animation: `fadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms forwards`,
      }}
    >
      {children}
    </div>
  );
}
