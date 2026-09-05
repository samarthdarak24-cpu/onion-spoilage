import React from 'react';
import clsx from 'clsx';

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('card p-5', className)} {...p}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, subtitle, className, center }: { eyebrow?: string; title: string; subtitle?: string; className?: string; center?: boolean }) {
  return (
    <div className={clsx(className, center && 'text-center')}>
      {eyebrow && <div className="text-xs font-bold uppercase tracking-[0.2em] text-fresh">{eyebrow}</div>}
      <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-emerald-950">{title}</h2>
      {subtitle && <p className={clsx('mt-2 max-w-2xl text-sm text-emerald-700/80', center && 'mx-auto')}>{subtitle}</p>}
    </div>
  );
}

export function StatCard({ label, value, sub, accent = 'forest', icon: Icon }: { label: string; value: React.ReactNode; sub?: string; accent?: string; icon?: any }) {
  const accents: any = {
    forest: 'from-forest to-darkgreen',
    fresh: 'from-fresh to-forest',
    amber: 'from-amber to-orange-500',
    reject: 'from-reject to-rose-600',
  };
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={clsx('absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-10', accents[accent] || accents.forest)} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">{label}</span>
        {Icon && <span className="rounded-lg bg-emerald-50 p-2 text-forest"><Icon size={16} /></span>}
      </div>
      <div className="mt-3 text-3xl font-extrabold text-emerald-950">{value}</div>
      {sub && <div className="mt-1 text-xs text-emerald-600/80">{sub}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'forest', className }: { children: React.ReactNode; tone?: 'forest' | 'fresh' | 'amber' | 'reject' | 'gray'; className?: string }) {
  const tones: any = {
    forest: 'bg-forest/10 text-forest',
    fresh: 'bg-fresh/15 text-forest',
    amber: 'bg-amber/20 text-amber-700',
    reject: 'bg-reject/10 text-reject',
    gray: 'bg-emerald-100 text-emerald-700',
  };
  return <span className={clsx('chip', tones[tone], className)}>{children}</span>;
}

export function ProgressBar({ value, tone = 'forest', className }: { value: number; tone?: 'forest' | 'amber' | 'reject' | 'fresh'; className?: string }) {
  const colors: any = { forest: 'bg-forest', fresh: 'bg-fresh', amber: 'bg-amber', reject: 'bg-reject' };
  return (
    <div className={clsx('h-2.5 w-full overflow-hidden rounded-full bg-emerald-100', className)}>
      <div className={clsx('h-full rounded-full transition-all duration-1000', colors[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  if (grade === 'GRADE A') return <Badge tone="forest">● GRADE A</Badge>;
  if (grade === 'URS') return <Badge tone="amber">● URS</Badge>;
  return <Badge tone="reject">● REJECTED</Badge>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-emerald-700">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-forest" />
      {label}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-10 text-center">
      <div className="text-emerald-800 font-semibold">{title}</div>
      {hint && <div className="mt-1 text-sm text-emerald-600/80">{hint}</div>}
    </div>
  );
}
