import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ShieldCheck, UserCog, Sprout, Tractor, Store, LogIn,
  ArrowRight, Eye, EyeOff, CheckCircle2, Sparkles,
  Leaf, Brain, Truck, ShoppingCart, MapPin, Package,
} from 'lucide-react';
import { useAuth, ROLE_HOME } from '../lib/auth';
import type { Role } from '../lib/types';

const ROLES: { role: Role; label: string; icon: any; hint: string }[] = [
  { role: 'admin',               label: 'Admin',   icon: ShieldCheck, hint: 'Full platform oversight' },
  { role: 'procurement_officer', label: 'Officer', icon: UserCog,    hint: 'Run inspections & grading' },
  { role: 'fpo',                 label: 'FPO',     icon: Sprout,     hint: 'Cooperative quality overview' },
  { role: 'farmer',              label: 'Farmer',  icon: Tractor,    hint: 'Track your lot quality' },
  { role: 'buyer',               label: 'Buyer',   icon: Store,      hint: 'Verify & source lots' },
];

const DEMO: Record<Role, string> = {
  procurement_officer: 'officer1', fpo: 'fpo1', farmer: 'farmer1', buyer: 'buyer1', admin: 'admin',
};

/* ---------------- FarmLink feature data ---------------- */
const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'Direct Marketplace',
    desc: 'Connect directly & get better prices',
  },
  {
    icon: Brain,
    title: 'AI-Powered Intelligence',
    desc: 'Smarter insights for better decisions',
  },
  {
    icon: Truck,
    title: 'Smart Logistics',
    desc: 'Real-time tracking & optimized deliveries',
  },
  {
    icon: ShieldCheck,
    title: 'Trust & Transparency',
    desc: 'Quality verified, secure payments & blockchain traceability',
  },
] as const;

const STATS = [
  { value: 10000, suffix: '+', label: 'Farmers & FPOs',     icon: Tractor },
  { value: 2000,  suffix: '+', label: 'Buyers',             icon: ShoppingCart },
  { value: 50000, suffix: '+', label: 'Transactions',       icon: Package },
  { value: 25,    suffix: '+', label: 'States Connected',   icon: MapPin },
] as const;

/* ---------------- Animated counter (no deps) ---------------- */
function CountUp({ value, duration = 1600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return <span ref={ref}>{display.toLocaleString('en-IN')}</span>;
}

/* ---------------- FarmLink leaf logo ---------------- */
function FarmLeaf({ size = 26, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="fl-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3FAE5A" />
          <stop offset="100%" stopColor="#0B5D3B" />
        </linearGradient>
      </defs>
      <path
        d="M26 4C14 6 6 14 5 26c0 0 0 1 1 1 12-1 20-9 22-21 0 0 0-2-2-2z"
        fill="url(#fl-leaf)"
      />
      <path
        d="M7 27c4-7 10-12 16-16"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}

/* ============================================================
   FarmLink Login
   - Left 52%: premium promotional panel (new)
   - Right 48%: existing authentication (unchanged behavior)
   ============================================================ */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const pickRole = (r: Role) => {
    setRole(r);
    setUsername(DEMO[r]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const loggedInUser = await login(username, password);
      navigate(ROLE_HOME[loggedInUser.role] || ROLE_HOME[role] || '/');
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* ============== LEFT — FarmLink Premium Panel ============== */}
      <div className="relative hidden lg:flex w-[52%] flex-col overflow-hidden">
        {/* CSS/SVG agricultural motif — rolling fields + horizon (no external image dependency) */}
        <div className="absolute inset-0 bg-gradient-to-b from-sb-50 via-white to-sb-100/60" />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1200 900"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden
        >
          {/* Sky gradient */}
          <defs>
            <linearGradient id="fl-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F0F9F2" />
              <stop offset="100%" stopColor="#E2F3E6" />
            </linearGradient>
            <linearGradient id="fl-hill-1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9DD4AC" />
              <stop offset="100%" stopColor="#6FBC85" />
            </linearGradient>
            <linearGradient id="fl-hill-2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3FAE5A" />
              <stop offset="100%" stopColor="#226E37" />
            </linearGradient>
            <linearGradient id="fl-hill-3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2F8E47" />
              <stop offset="100%" stopColor="#174D27" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="1200" height="900" fill="url(#fl-sky)" />
          {/* Sun */}
          <circle cx="980" cy="180" r="60" fill="#FFFFFF" opacity="0.55" />
          <circle cx="980" cy="180" r="36" fill="#FFFFFF" opacity="0.75" />
          {/* Distant hills */}
          <path d="M0,560 C200,500 400,540 600,520 C800,500 1000,540 1200,510 L1200,900 L0,900 Z" fill="url(#fl-hill-1)" opacity="0.85" />
          {/* Mid hills */}
          <path d="M0,640 C180,560 420,620 640,590 C860,560 1020,610 1200,580 L1200,900 L0,900 Z" fill="url(#fl-hill-2)" opacity="0.9" />
          {/* Foreground field rows */}
          <path d="M0,760 C220,700 420,740 640,720 C860,700 1020,740 1200,710 L1200,900 L0,900 Z" fill="url(#fl-hill-3)" opacity="0.95" />
          {/* Field furrow lines */}
          {[780, 810, 840, 870].map((y, i) => (
            <path
              key={y}
              d={`M0,${y} C220,${y - 14} 420,${y + 8} 640,${y - 6} C860,${y - 18} 1020,${y + 4} 1200,${y - 10}`}
              stroke="#0B5D3B"
              strokeWidth="1.2"
              fill="none"
              opacity={0.35 - i * 0.06}
            />
          ))}
          {/* Scattered trees */}
          {[
            { x: 140, y: 660, s: 1 },
            { x: 320, y: 680, s: 0.8 },
            { x: 880, y: 670, s: 1.1 },
            { x: 1080, y: 690, s: 0.9 },
          ].map((t, i) => (
            <g key={i} transform={`translate(${t.x}, ${t.y}) scale(${t.s})`} opacity="0.85">
              <ellipse cx="0" cy="-12" rx="14" ry="18" fill="#174D27" />
              <rect x="-2" y="-2" width="4" height="14" fill="#06452C" />
            </g>
          ))}
        </svg>
        {/* Soft green/white gradient overlay (light, premium feel) */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-sb-50/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent" />

        {/* Soft moving light */}
        <motion.div
          aria-hidden
          className="absolute -top-32 -left-20 h-[520px] w-[520px] rounded-full bg-sb-200/50 blur-3xl"
          animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-mint/60 blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Subtle dot field */}
        <svg className="absolute top-6 right-8 opacity-50" width="120" height="60" viewBox="0 0 120 60" aria-hidden>
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 20 }).map((_, c) => (
              <circle key={`${r}-${c}`} cx={c * 6 + 3} cy={r * 12 + 6} r="1" fill="#0B5D3B" opacity={0.25} />
            )),
          )}
        </svg>

        {/* Soft curving boundary on the right side (panel feels organic, not hard-split) */}
        <svg
          className="absolute top-0 right-0 h-full w-24 pointer-events-none"
          viewBox="0 0 100 800"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0,0 C60,200 40,400 60,600 C40,720 30,800 30,800 L100,800 L100,0 Z"
            fill="#F7F7F5"
          />
        </svg>
        {/* Soft green glow bleeding into the right panel */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 h-[70%] w-40 bg-gradient-to-r from-sb-200/0 via-sb-100/40 to-sb-200/0 blur-2xl pointer-events-none" />

        {/* Content stack */}
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14 pr-24">
          {/* Logo (fade in from top) */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-soft">
              <FarmLeaf size={26} />
            </div>
            <div className="leading-none">
              <div className="text-xl font-extrabold tracking-tight text-emerald-950">
                Farm<span className="text-forest">Link</span>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/80">
                Connecting Farms to Markets
              </div>
            </div>
          </motion.div>

          {/* Hero text + features + ecosystem */}
          <div className="relative">
            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-[40px] xl:text-[44px] font-extrabold leading-[1.08] tracking-tight text-emerald-950"
            >
              Smart Agriculture.<br />
              Stronger Connections.<br />
              <span className="bg-gradient-to-r from-forest via-sb-600 to-fresh bg-clip-text text-transparent">
                Better Tomorrow.
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 max-w-[440px] text-[14px] xl:text-[15px] leading-relaxed text-emerald-900/70"
            >
              FarmLink is an AI-powered digital marketplace that connects Farmers, FPOs and Buyers in a transparent, trusted and efficient agri-ecosystem.
            </motion.p>

            {/* Ecosystem graphic (right of features on wide) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 hidden xl:block"
              style={{ width: 320, height: 320 }}
            >
              <EcosystemGraphic />
            </motion.div>

            {/* Feature cards (sequential) */}
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[560px]">
              {FEATURES.map((f, i) => (
                <FeatureCard key={f.title} feature={f} index={i} />
              ))}
            </div>
          </div>

          {/* Statistics bar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-card p-4 xl:p-5"
          >
            <div className="grid grid-cols-4 gap-3 xl:gap-4">
              {STATS.map((s, i) => (
                <React.Fragment key={s.label}>
                  <StatItem stat={s} />
                  {i < STATS.length - 1 && (
                    <div className="hidden sm:block w-px bg-emerald-900/10 self-stretch" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ============== RIGHT — Login panel (unchanged behavior) ============== */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10 lg:bg-gradient-to-br lg:from-white lg:via-sb-50/30 lg:to-white">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white border border-border shadow-soft">
              <FarmLeaf size={24} />
            </div>
            <div className="leading-none">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted">FarmLink</div>
              <div className="text-lg font-extrabold text-ink">Connecting Farms to Markets</div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-[28px] font-extrabold tracking-tight text-ink">Welcome to FarmLink</h2>
          <p className="mt-1.5 text-[14px] text-muted">Choose your role to access your dashboard.</p>

          {/* Role selector */}
          <div className="mt-6 grid grid-cols-5 gap-2">
            {ROLES.map((r) => {
              const active = role === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => pickRole(r.role)}
                  title={r.hint}
                  className={`group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all duration-300 ${
                    active
                      ? 'border-forest bg-sb-50 text-forest shadow-[0_0_0_3px_rgba(63,174,90,0.12),0_8px_24px_-8px_rgba(11,93,59,0.25)]'
                      : 'border-border bg-white text-muted hover:border-sb-300 hover:bg-sb-50/50'
                  }`}
                >
                  <r.icon size={18} className={active ? 'text-forest' : ''} />
                  <span className="text-[10px] font-semibold">{r.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-[13px] font-semibold text-ink">Username</label>
              <div className="relative mt-1.5">
                <input
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-ink">Password</label>
                <button type="button" className="text-[12px] font-semibold text-muted hover:text-forest transition">Forgot?</button>
              </div>
              <div className="relative mt-1.5">
                <input
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 pr-11 text-[14px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-sb-100"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-border text-forest focus:ring-sb-200"
                defaultChecked
              />
              <label htmlFor="remember" className="text-[12px] text-muted">Remember me</label>
            </div>

            {err && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-reject/20 bg-reject/5 px-4 py-2.5 text-[13px] font-medium text-reject"
              >
                {err}
              </motion.div>
            )}

            <button
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-forest to-sb-600 px-4 py-3.5 text-[14px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(11,93,59,0.45)] transition-all duration-300 hover:shadow-[0_12px_28px_-8px_rgba(11,93,59,0.55)] hover:-translate-y-[1px] disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={busy}
            >
              {busy ? (
                <>
                  <Spinner />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials — premium glass card */}
          <div className="mt-5 rounded-xl border border-sb-200/60 bg-sb-50/60 backdrop-blur-sm px-4 py-3">
            <div className="text-[12px] font-semibold text-forest">Demo Credentials</div>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-ink">
              <code className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] border border-border">{username}</code>
              <span className="text-muted">/</span>
              <code className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] border border-border">password123</code>
            </div>
          </div>

          {/* Footer link */}
          <div className="mt-6 text-center text-[13px] text-muted">
            Don't have an account?{' '}
            <button className="font-semibold text-forest hover:text-sb-700 transition">Request access</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

function FeatureCard({ feature, index }: { feature: typeof FEATURES[number]; index: number }) {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.45 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="group relative flex items-start gap-3 rounded-xl border border-white/70 bg-white/70 backdrop-blur-md p-3 shadow-soft transition-all duration-300 hover:bg-white/90 hover:border-sb-300 hover:shadow-[0_0_0_1px_rgba(63,174,90,0.18),0_12px_24px_-10px_rgba(11,93,59,0.25)]"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sb-50 border border-sb-100 text-forest transition-transform duration-300 group-hover:scale-110">
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-emerald-950">{feature.title}</div>
        <div className="mt-0.5 text-[11.5px] text-emerald-900/65 leading-snug">{feature.desc}</div>
      </div>
    </motion.div>
  );
}

function StatItem({ stat }: { stat: typeof STATS[number] }) {
  const Icon = stat.icon;
  // Convert value for display: 10000 -> 10K
  const compact = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}K`;
    return String(n);
  };
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest text-white shadow-[0_4px_14px_-4px_rgba(11,93,59,0.5)]">
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="text-[20px] xl:text-[22px] font-extrabold leading-none text-emerald-950">
          <CountUp value={stat.value} />
          <span className="text-forest">{stat.suffix}</span>
        </div>
        <div className="mt-1 text-[10.5px] font-medium uppercase tracking-wide text-emerald-900/60">
          {stat.label}
        </div>
      </div>
    </div>
  );
}

/* Animated ecosystem graphic — central FarmLink icon, satellite nodes, connecting lines */
function EcosystemGraphic() {
  // Central pulse rings
  return (
    <div className="relative h-full w-full">
      {/* Outer ring */}
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 200 200"
        aria-hidden
      >
        {/* concentric dashed circles */}
        {[90, 70, 50].map((r, i) => (
          <motion.circle
            key={r}
            cx="100" cy="100" r={r}
            fill="none"
            stroke="#3FAE5A"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity={0.35 - i * 0.07}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.35 - i * 0.07 }}
            transition={{ duration: 1.4, delay: 0.7 + i * 0.15 }}
          />
        ))}
        {/* connecting lines */}
        {[
          { x1: 100, y1: 100, x2: 30,  y2: 40  },
          { x1: 100, y1: 100, x2: 170, y2: 40  },
          { x1: 100, y1: 100, x2: 25,  y2: 130 },
          { x1: 100, y1: 100, x2: 175, y2: 130 },
          { x1: 100, y1: 100, x2: 100, y2: 175 },
        ].map((l, i) => (
          <motion.line
            key={i}
            {...l}
            stroke="#3FAE5A"
            strokeWidth="1.2"
            strokeDasharray="3 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 1.2, delay: 1.1 + i * 0.12 }}
          />
        ))}
      </motion.svg>

      {/* Central node (pulsing) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="absolute inset-0 rounded-full bg-sb-400/40"
          animate={{ scale: [1, 1.7, 1.7], opacity: [0.45, 0, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          style={{ width: 56, height: 56, left: -28, top: -28 }}
        />
        <div className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-forest to-sb-600 text-white shadow-[0_10px_24px_-8px_rgba(11,93,59,0.55)]">
          <FarmLeaf size={26} className="text-white [&_path]:fill-white [&_path]:stroke-none" />
        </div>
      </div>

      {/* Satellite nodes */}
      <Node x="15%"  y="20%"  delay={1.3} icon={<ShoppingCart size={16} />} />
      <Node x="85%"  y="20%"  delay={1.45} icon={<Truck size={16} />} />
      <Node x="12%"  y="65%"  delay={1.6} icon={<Sprout size={16} />} />
      <Node x="88%"  y="65%"  delay={1.75} icon={<ShieldCheck size={16} />} />
      <Node x="50%"  y="88%"  delay={1.9} icon={<Store size={16} />} />
    </div>
  );
}

function Node({ x, y, delay, icon }: { x: string; y: string; delay: number; icon: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="absolute grid h-9 w-9 place-items-center rounded-full bg-white border border-sb-200 text-forest shadow-[0_6px_18px_-8px_rgba(11,93,59,0.35)]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      {icon}
    </motion.div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}