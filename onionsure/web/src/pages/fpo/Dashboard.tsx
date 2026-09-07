import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout, Tractor, ClipboardList, Award, TrendingUp, PlusCircle,
  ChevronRight, BarChart2, Users, RefreshCw, Eye, Activity,
  MapPin, CheckCircle2, AlertTriangle, ArrowUpRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { api } from '../../lib/api';
import { GradeBadge, EmptyState } from '../../components/ui';
import { Donut } from '../../components/charts';
import { PageTransition, Stagger, StaggerItem, AnimatedNumber } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_DASHBOARD } from '../../lib/events';

const TREND_DATA = [
  { d: 'Aug 18', a: 120, b: 90 }, { d: 'Aug 19', a: 180, b: 110 },
  { d: 'Aug 20', a: 150, b: 130 }, { d: 'Aug 21', a: 210, b: 140 },
  { d: 'Aug 22', a: 175, b: 155 }, { d: 'Aug 23', a: 240, b: 160 },
  { d: 'Aug 24', a: 195, b: 170 }, { d: 'Aug 25', a: 260, b: 180 },
  { d: 'Aug 26', a: 230, b: 195 }, { d: 'Aug 27', a: 290, b: 210 },
];

const FPO_HEALTH = [
  { label: 'Farmer Retention',  value: 94 },
  { label: 'Avg Quality Score', value: 87 },
  { label: 'Order Fulfillment', value: 97 },
];

type Tab = 'overview' | 'farmers' | 'orders';

export default function FpoDashboard() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const { data, loading } = useLiveData<any>(
    async () => {
      const [stats, certs, farmers] = await Promise.all([
        api.analyticsDashboard(), api.getCertificates(), api.getFarmers(),
      ]);
      return { stats, certs, farmers };
    },
    { events: EV_DASHBOARD, pollMs: 15000 },
  );

  if (loading && !data) return (
    <PageTransition className="space-y-4">
      <div className="skeleton h-40 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-4">{[0,1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      <div className="skeleton h-72 rounded-xl" />
    </PageTransition>
  );

  const { stats, certs, farmers } = data;
  const gradeData = [
    { name: 'Grade A',  value: stats.gradeALots,   color: '#0B5D3B' },
    { name: 'URS',      value: stats.ursLots,       color: '#F59E0B' },
    { name: 'Rejected', value: stats.rejectedLots,  color: '#EF4444' },
  ];
  const recent = certs.slice(0, 6);
  const revenue = `₹${((stats.totalLots || 0) * 3.2).toFixed(1)}L`;

  return (
    <PageTransition className="space-y-4">

      {/* ── HERO BANNER (photo bg) ── */}
      <div className="relative overflow-hidden rounded-xl text-white"
        style={{ minHeight: 170, boxShadow: '0 4px 20px rgba(27,67,50,0.25)' }}>
        {/* Background photo */}
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/onions/hero-batch-white.jpg')" }} />
        {/* Overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(11,70,42,0.92) 0%, rgba(11,70,42,0.75) 55%, rgba(11,70,42,0.45) 100%)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative px-6 py-5">
          {/* Top badges */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-fresh/40 bg-fresh/15 px-2.5 py-0.5 text-[10px] font-bold text-fresh backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-fresh animate-pulse" /> LIVE · FPO Portal
            </span>
            <span className="rounded-full border border-amber/30 bg-amber/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-200">Demo Data</span>
          </div>

          {/* Title row */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={13} className="text-white/60" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Nashik, Maharashtra</span>
              </div>
              <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight leading-tight">
                Good Morning, FPO 🌾
              </h1>
              <p className="mt-1 text-[13px] text-white/70 font-medium max-w-md">
                Aggregate member produce, track batches and move stock efficiently.{' '}
                <span className="text-fresh font-bold">{farmers?.length || 0} member farmers.</span>
              </p>
            </div>

            {/* Inline stats */}
            <div className="flex items-center gap-5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-5 py-3">
              {[
                { label: 'Revenue', value: revenue },
                { label: 'Inventory', value: `${stats.totalLots || 0} T` },
                { label: 'Active Orders', value: stats.pendingInspections || 0 },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-[18px] font-black text-white leading-none">{s.value}</p>
                  <p className="text-[10px] text-white/55 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: 'Aggregate Produce', icon: Sprout },
              { label: 'Add Farmer', icon: Users },
              { label: 'View Orders', icon: ClipboardList },
              { label: 'Analytics', icon: BarChart2 },
            ].map((a) => (
              <button key={a.label}
                onClick={() => nav('/fpo/inspection')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/20">
                <a.icon size={13} /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI TILES ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Member Farmers',  value: farmers?.length || 0,     delta: '+4.2%', icon: Users,       bg: 'bg-green-50',  icon_c: 'text-green-700',  dark: false },
          { label: 'Inventory (KG)',  value: (stats.totalLots || 0) * 48, delta: '+12%', icon: Sprout,    bg: 'bg-blue-50',   icon_c: 'text-blue-700',   dark: false },
          { label: 'Active Orders',   value: stats.pendingInspections || 9, delta: '+3 now', icon: ClipboardList, bg: 'bg-amber-50', icon_c: 'text-amber-700', dark: false },
          { label: 'Revenue (YTD)',   value: revenue,                   delta: '+24% YoY', icon: TrendingUp, bg: '', icon_c: '', dark: true },
        ].map((k, i) => (
          <motion.div key={k.label} whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`rounded-xl border p-4 ${k.dark ? 'bg-[#1C3829] border-white/10 text-white' : 'bg-white border-black/[0.07]'}`}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className={`grid h-9 w-9 place-items-center rounded-lg ${k.dark ? 'bg-white/10' : k.bg} ${k.icon_c}`}>
                <k.icon size={16} />
              </div>
              <span className={`text-[11px] font-bold ${k.dark ? 'text-fresh' : 'text-green-600'}`}>
                {k.delta}
              </span>
            </div>
            <p className={`text-[26px] font-black leading-none mb-1 ${k.dark ? 'text-white' : 'text-gray-900'}`}>
              {typeof k.value === 'number' ? <AnimatedNumber value={k.value} /> : k.value}
            </p>
            <p className={`text-[12px] font-medium ${k.dark ? 'text-white/50' : 'text-gray-500'}`}>{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── MAIN CONTENT: Revenue Trend + FPO Health ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Revenue trend chart */}
        <div className="bg-white rounded-xl border border-black/[0.07] p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">Revenue Trend</h2>
              <p className="text-[12px] text-gray-500">Monthly revenue, expenses &amp; profit</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5"><i className="h-2 w-5 rounded-full bg-[#1B4332] inline-block" /> Revenue</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-5 rounded-full bg-fresh inline-block" /> Profit</span>
            </div>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fpoA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B4332" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#1B4332" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fpoB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#40C074" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#40C074" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }} />
                <Area type="monotone" dataKey="a" stroke="#1B4332" strokeWidth={2.5} fill="url(#fpoA)" name="Revenue" />
                <Area type="monotone" dataKey="b" stroke="#40C074" strokeWidth={2} fill="url(#fpoB)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FPO Health */}
        <div className="bg-white rounded-xl border border-black/[0.07] p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 className="text-[15px] font-bold text-gray-900 mb-4">FPO Health</h2>
          <div className="space-y-4">
            {FPO_HEALTH.map((h) => (
              <div key={h.label}>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <span className="text-gray-600 font-medium">{h.label}</span>
                  <span className="font-bold text-gray-900">{h.value}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <motion.div className="h-full rounded-full bg-[#1B4332]"
                    initial={{ width: 0 }} animate={{ width: `${h.value}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              </div>
            ))}
          </div>

          {/* Grade donut */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-[13px] font-bold text-gray-900 mb-3">Grade Distribution</p>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 shrink-0">
                <Donut data={gradeData} height={96} />
              </div>
              <div className="space-y-1.5">
                {gradeData.map((g) => (
                  <div key={g.name} className="flex items-center gap-2 text-[12px]">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: g.color }} />
                    <span className="text-gray-500">{g.name}</span>
                    <span className="ml-auto font-bold text-gray-900">{g.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB SECTION ── */}
      <div className="bg-white rounded-xl border border-black/[0.07]"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 px-5">
          {([
            { key: 'overview', label: 'Inventory Overview', icon: Activity },
            { key: 'farmers',  label: 'Top Farmers',        icon: Users },
            { key: 'orders',   label: 'Recent Orders',      icon: ClipboardList },
          ] as { key: Tab; label: string; icon: any }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-[13px] font-semibold border-b-2 -mb-px transition-all ${
                tab === t.key ? 'border-[#1B4332] text-[#1B4332]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'overview' && (
            <div className="space-y-3">
              {[
                { crop: 'Onion', grade: 'Grade A', storage: 'Silo', available: 8298, reserved: 6280, value: '₹230K', usage: 43 },
                { crop: 'Tomato', grade: 'Grade A+', storage: 'Cold', available: 3408, reserved: 6280, value: '₹95K', usage: 55 },
                { crop: 'Garlic', grade: 'Grade A', storage: 'Ambient', available: 4808, reserved: 2480, value: '₹134K', usage: 33 },
              ].map((item) => (
                <div key={item.crop} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-bold text-gray-900">{item.crop}</span>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">{item.grade}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{item.storage}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[12px] text-gray-500">
                      <span>Available: <b className="text-green-700">{item.available.toLocaleString()} KG</b></span>
                      <span>Reserved: <b className="text-amber-700">{item.reserved.toLocaleString()} KG</b></span>
                      <span>Value: <b className="text-gray-900">{item.value}</b></span>
                    </div>
                  </div>
                  <div className="shrink-0 w-32 text-right">
                    <span className="text-[12px] text-gray-500 font-medium">Usage {item.usage}%</span>
                    <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div className="h-full rounded-full bg-[#1B4332]"
                        initial={{ width: 0 }} animate={{ width: `${item.usage}%` }}
                        transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                  <button className="shrink-0 grid h-8 w-8 place-items-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 transition">
                    <Eye size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'farmers' && (
            <div className="space-y-3">
              {farmers?.slice(0, 5).map((f: any, i: number) => (
                <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-green-100 text-green-800 text-[12px] font-bold shrink-0">
                    {(f.name || f.fullName || 'F').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-gray-900">{f.name || f.fullName || `Farmer ${i + 1}`}</p>
                    <p className="text-[11px] text-gray-500">{f.village || f.location || 'Nashik'}</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-800">
                    Grade A
                  </span>
                </div>
              )) || <p className="text-[13px] text-gray-500 text-center py-6">No farmers registered yet.</p>}
            </div>
          )}

          {tab === 'orders' && (
            <div className="space-y-3">
              {recent.map((c: any) => (
                <div key={c.id} onClick={() => nav(`/certificate/${c.id}`)}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-green-50 text-green-700 shrink-0">
                    <Award size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-gray-900 font-mono">{c.certificateNumber}</p>
                    <p className="text-[11px] text-gray-500">Lot {c.lotNumber || '—'}</p>
                  </div>
                  <GradeBadge grade={c.grade} />
                  <span className="text-[14px] font-black text-gray-900">{c.qualityScore}</span>
                </div>
              ))}
              {recent.length === 0 && <EmptyState title="No certificates yet" hint="Start a lot inspection." icon={Award} />}
            </div>
          )}
        </div>
      </div>

      {/* ── FPO PROFILE CARD (landscape photo) ── */}
      <div className="relative overflow-hidden rounded-xl h-32 sm:h-40"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/onions/hero-batch-red.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-end p-5">
          <p className="text-[15px] font-black text-white">Nashik FPO · Nashik, Maharashtra</p>
          <p className="text-[11px] text-white/60 mt-0.5">Est. 2021 · Reg. FPO-MH-2021-0482</p>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            {[
              { icon: CheckCircle2, label: 'Cold-chain: Active' },
              { icon: CheckCircle2, label: 'Transport: Ready' },
              { icon: CheckCircle2, label: 'FSSAI Certified' },
              { icon: CheckCircle2, label: 'Quality: Grade A' },
            ].map((b) => (
              <span key={b.label} className="flex items-center gap-1 text-[11px] text-white/75 font-medium">
                <b.icon size={11} className="text-fresh" /> {b.label}
              </span>
            ))}
          </div>
        </div>
        <button className="absolute bottom-4 right-5 rounded-lg border border-white/30 bg-white/10 backdrop-blur-sm px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20">
          FPO Profile Details →
        </button>
      </div>

    </PageTransition>
  );
}
