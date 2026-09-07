import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  ChevronRight, ShieldCheck, ClipboardList, Users, Building2, Store, Gauge,
  Activity, Zap, TrendingUp, TrendingDown, MoreVertical,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_DASHBOARD } from '../../lib/events';
import { AnimatedNumber, Reveal } from '../../lib/fx';

const FLOW_DATA = [
  { d: '18', sa: 1500, ex: 1100 }, { d: '19', sa: 2300, ex: 1700 },
  { d: '20', sa: 2000, ex: 2400 }, { d: '21', sa: 2289, ex: 2900 },
  { d: '22', sa: 1700, ex: 2100 }, { d: '23', sa: 2900, ex: 2300 },
  { d: '24', sa: 2400, ex: 1900 }, { d: '25', sa: 2800, ex: 2100 },
  { d: '26', sa: 3100, ex: 2300 }, { d: '27', sa: 2700, ex: 2600 },
];

const CENTERS = [
  { name: 'Nashik Central',  inspections: 142, avg: 87 },
  { name: 'Lasalgaon',        inspections: 98,  avg: 82 },
  { name: 'Pimpalgaon',       inspections: 76,  avg: 91 },
  { name: 'Sinnar',           inspections: 54,  avg: 79 },
];

const RECENT_TX = [
  { name: 'Lot #LN-2451', sub: 'Grade A · 500kg', amt: 95, grade: 'GRADE A' },
  { name: 'Lot #LN-2450', sub: 'URS · 320kg',     amt: 78, grade: 'URS' },
  { name: 'Lot #LN-2449', sub: 'Grade A · 800kg', amt: 92, grade: 'GRADE A' },
  { name: 'Lot #LN-2448', sub: 'Rejected · 120kg',amt: 34, grade: 'REJECTED' },
  { name: 'Lot #LN-2447', sub: 'Grade A · 650kg', amt: 88, grade: 'GRADE A' },
];

export default function AdminDashboard() {
  const { data, loading } = useLiveData<any>(
    async () => {
      const [stats, quality] = await Promise.all([api.analyticsDashboard(), api.analyticsQuality()]);
      return { stats, quality };
    },
    { events: EV_DASHBOARD, pollMs: 15000 },
  );

  if (loading && !data) return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="skeleton h-44 rounded-xl" />
      <div className="grid gap-3 md:grid-cols-3">{[0,1,2].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>
    </div>
  );

  const stats   = data?.stats;
  const total   = stats?.totalLots || 0;
  const gradeA  = stats?.gradeALots || 0;
  const urs     = stats?.ursLots || 0;
  const rejected= stats?.rejectedLots || 0;
  const gradeAPct = total ? Math.round((gradeA / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">

      {/* ── HERO BANNER ── */}
      <Reveal>
        <div className="relative overflow-hidden rounded-xl text-white"
          style={{ minHeight: 175, boxShadow: '0 4px 20px rgba(27,67,50,0.25)' }}>
          <div className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/onions/spotted-batch.jpg')" }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(11,60,38,0.95) 0%, rgba(11,60,38,0.82) 55%, rgba(11,60,38,0.50) 100%)' }} />
          {/* Background sparkline */}
          <div className="absolute inset-y-0 right-0 w-[40%] opacity-20 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={FLOW_DATA} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#40C074" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#40C074" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="sa" stroke="#40C074" strokeWidth={2} fill="url(#adminG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="relative px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-fresh/40 bg-fresh/15 px-2.5 py-0.5 text-[10px] font-bold text-fresh backdrop-blur-sm">
                <Zap size={9} /> Platform Overview
              </span>
              <span className="badge-green text-[10px]">Live</span>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[48px] sm:text-[56px] font-black leading-none tracking-tight text-white">
                  <AnimatedNumber value={total} />
                </p>
                <p className="text-[13px] text-white/55 mt-1 font-medium">
                  Total lots registered · <span className="text-white/75 font-semibold">{stats?.totalInspections || 0}</span> inspections
                </p>
              </div>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-lg bg-fresh/20 border border-fresh/30 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-fresh/30">
                  <ShieldCheck size={14} /> System Health
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-white/20">
                  <ClipboardList size={14} /> Reports
                </button>
              </div>
            </div>

            {/* Mini stats */}
            <div className="mt-5 pt-4 border-t border-white/[0.12] grid grid-cols-2 sm:grid-cols-4 gap-5">
              {[
                { label: 'Farmers', value: stats?.totalFarmers || 0, icon: Users },
                { label: 'FPOs', value: stats?.totalFPOs || 0, icon: Building2 },
                { label: 'Buyers', value: stats?.totalBuyers || 0, icon: Store },
                { label: 'Avg Score', value: stats?.averageQualityScore || 0, icon: Gauge },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white/70"><s.icon size={14} /></div>
                  <div>
                    <p className="text-[18px] font-extrabold text-white leading-none"><AnimatedNumber value={s.value} /></p>
                    <p className="text-[10px] text-white/45 mt-0.5 font-medium">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── QUALITY DISTRIBUTION CARDS ── */}
      <Reveal delay={60}>
        <div className="bg-white rounded-xl border border-black/[0.07] p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">Quality Distribution</h2>
              <p className="text-[12px] text-gray-500">Grade breakdown across all lots</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Grade A',  value: gradeA,   pct: gradeAPct,                                   Icon: TrendingUp,   bg: 'bg-green-50',  tc: 'text-green-700', bar: 'bg-green-600' },
              { label: 'URS',      value: urs,       pct: total ? Math.round((urs/total)*100) : 0,     Icon: Activity,     bg: 'bg-amber-50',  tc: 'text-amber-700', bar: 'bg-amber-500' },
              { label: 'Rejected', value: rejected,  pct: total ? Math.round((rejected/total)*100) : 0,Icon: TrendingDown, bg: 'bg-red-50',    tc: 'text-red-700',   bar: 'bg-red-500' },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl ${k.bg} border border-black/[0.05] p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-semibold text-gray-600">{k.label}</span>
                  <MoreVertical size={14} className="text-gray-400" />
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <p className="text-[28px] font-black text-gray-900 leading-none"><AnimatedNumber value={k.value} /></p>
                  <span className={`text-[11px] font-bold mb-0.5 ${k.tc}`}>{k.pct}%</span>
                </div>
                <div className="h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={FLOW_DATA.slice(0, 6)}>
                      <Area type="monotone" dataKey="sa" stroke={k.bar.replace('bg-', '')} strokeWidth={1.5}
                        fill="transparent" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── TWO-COLUMN ── */}
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Inspection flow chart */}
          <Reveal delay={100}>
            <div className="bg-white rounded-xl border border-black/[0.07] p-5"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900">Inspection Flow (10 days)</h2>
                  <p className="text-[12px] text-gray-500">Incoming vs outgoing inspections (KG)</p>
                </div>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={FLOW_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={2}>
                    <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="d" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }} />
                    <Bar dataKey="sa" fill="#1B4332" radius={[3,3,0,0]} name="Incoming" />
                    <Bar dataKey="ex" fill="#86EFAC" radius={[3,3,0,0]} name="Outgoing" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center gap-5 text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5"><i className="h-2 w-5 rounded-full bg-[#1B4332] inline-block" /> Incoming</span>
                <span className="flex items-center gap-1.5"><i className="h-2 w-5 rounded-full bg-green-300 inline-block" /> Outgoing</span>
              </div>
            </div>
          </Reveal>

          {/* Centers table */}
          <Reveal delay={140}>
            <div className="bg-white rounded-xl border border-black/[0.07]"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900">Procurement Centers</h2>
                  <p className="text-[12px] text-gray-500">Performance by location</p>
                </div>
                <button className="text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition">View all</button>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50/70">
                    <th className="py-2.5 px-5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Center</th>
                    <th className="py-2.5 px-5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Inspections</th>
                    <th className="py-2.5 px-5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {CENTERS.map((c, i) => (
                    <tr key={c.name} className={`border-t border-gray-100/80 hover:bg-gray-50 transition ${i === CENTERS.length-1 ? 'rounded-b-xl' : ''}`}>
                      <td className="py-3 px-5 font-semibold text-gray-900">{c.name}</td>
                      <td className="py-3 px-5 text-gray-500 text-right">{c.inspections}</td>
                      <td className="py-3 px-5 text-right">
                        <span className={`font-extrabold ${c.avg >= 85 ? 'text-green-700' : c.avg >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{c.avg}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <Reveal delay={120}>
            <div className="bg-white rounded-xl border border-black/[0.07] p-5"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold text-gray-900">Recent Inspections</h2>
                <button className="text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition">View all</button>
              </div>
              <div className="space-y-2">
                {RECENT_TX.map(t => (
                  <div key={t.name}
                    className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-50 transition cursor-pointer group">
                    <div className={`grid h-9 w-9 place-items-center rounded-lg text-[11px] font-bold shrink-0 ${
                      t.grade === 'GRADE A' ? 'bg-green-100 text-green-800' : t.grade === 'URS' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
                    }`}>
                      {t.name.split('#')[1]?.slice(0, 2) || 'L'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 group-hover:text-[#1B4332] transition truncate">{t.name}</p>
                      <p className="text-[11px] text-gray-500">{t.sub}</p>
                    </div>
                    <span className={`text-[14px] font-extrabold ${t.grade === 'GRADE A' ? 'text-green-700' : t.grade === 'URS' ? 'text-amber-700' : 'text-red-600'}`}>
                      {t.amt}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1C3829 0%, #243D2E 100%)', boxShadow: '0 4px 16px rgba(27,67,50,0.25)' }}>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={15} className="text-fresh" />
                  <h2 className="text-[15px] font-bold text-white">System Status</h2>
                </div>
                <p className="text-[12px] text-white/50 mb-4">All services operational</p>
                <div className="space-y-2">
                  {[
                    { label: 'Vision AI',           status: 'Online' },
                    { label: 'IoT Gas Sensors',     status: 'Active' },
                    { label: 'Fusion Engine',       status: 'Ready' },
                    { label: 'Certificate Service', status: 'Active' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between rounded-lg bg-white/[0.07] px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-fresh animate-pulse" />
                        <span className="text-[12px] text-white/75">{s.label}</span>
                      </div>
                      <span className="text-[11px] font-bold text-fresh bg-fresh/15 px-2 py-0.5 rounded-full">{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
