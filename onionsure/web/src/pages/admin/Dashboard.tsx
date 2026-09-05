import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
} from 'recharts';
import {
  ArrowUpRight, TrendingUp, TrendingDown, MoreVertical, ChevronRight,
  ShieldCheck, Boxes, ClipboardList, Users, Building2, Store, Gauge,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_DASHBOARD } from '../../lib/events';
import { AnimatedNumber, Reveal } from '../../lib/fx';

const FLOW_DATA = [
  { d: '04', sa: 1500, ex: 1100 }, { d: '05', sa: 2300, ex: 1700 },
  { d: '06', sa: 2000, ex: 2400 }, { d: '07', sa: 2289, ex: 2900 },
  { d: '08', sa: 1700, ex: 2100 }, { d: '09', sa: 2900, ex: 2300 },
  { d: '10', sa: 2400, ex: 1900 },
];

const RECENT_TX = [
  { name: 'Lot #LN-2451',  sub: 'Grade A · 500kg',  amt: '95', color: '#DDF5E8' },
  { name: 'Lot #LN-2450',  sub: 'URS · 320kg',       amt: '78', color: '#F9E9DD' },
  { name: 'Lot #LN-2449',  sub: 'Grade A · 800kg',  amt: '92', color: '#E4EDF9' },
  { name: 'Lot #LN-2448',  sub: 'Rejected · 120kg',  amt: '34', color: '#ECEAF8' },
  { name: 'Lot #LN-2447',  sub: 'Grade A · 650kg',  amt: '88', color: '#DDF5E8' },
  { name: 'Lot #LN-2446',  sub: 'URS · 430kg',       amt: '71', color: '#F9E9DD' },
];

const CENTERS = [
  { name: 'Nashik Central',   inspections: 142, avg: 87 },
  { name: 'Lasalgaon',         inspections: 98,  avg: 82 },
  { name: 'Pimpalgaon',        inspections: 76,  avg: 91 },
  { name: 'Sinnar',            inspections: 54,  avg: 79 },
];

export default function AdminDashboard() {
  const { data, loading } = useLiveData<any>(
    async () => {
      const [stats, quality] = await Promise.all([
        api.analyticsDashboard(), api.analyticsQuality(),
      ]);
      return { stats, quality };
    },
    { events: EV_DASHBOARD, pollMs: 15000 },
  );

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="card-dark h-40 animate-pulse rounded-xl2" />
        <div className="grid gap-3 md:grid-cols-3">{[0,1,2].map(i => <div key={i} className="h-36 animate-pulse rounded-xl2 bg-bg" />)}</div>
      </div>
    );
  }

  const stats = data?.stats;
  const quality = data?.quality;
  const gradeA = stats?.gradeALots || 0;
  const urs = stats?.ursLots || 0;
  const rejected = stats?.rejectedLots || 0;
  const total = stats?.totalLots || 0;
  const gradeAPct = total ? Math.round((gradeA / total) * 100) : 0;
  const ursPct = total ? Math.round((urs / total) * 100) : 0;
  const rejPct = total ? Math.round((rejected / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* Dark overview card */}
      <Reveal>
        <motion.div whileHover={{ y: -2 }} className="card-dark relative overflow-hidden p-5 md:p-6">
          <div className="absolute inset-y-0 right-0 w-1/2 opacity-50 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={FLOW_DATA} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminBalG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3FAE5A" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#3FAE5A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="sa" stroke="#3FAE5A" strokeWidth={2} fill="url(#adminBalG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold uppercase tracking-[0.2em] text-white/60">Platform Overview</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-sb-500/15 px-2 py-1 text-[11px] font-semibold text-sb-300">
                <ArrowUpRight size={11} /> Live
              </span>
            </div>
            <div className="mt-6 flex flex-wrap items-end gap-4 md:items-center md:gap-6">
              <div>
                <div className="text-[44px] font-extrabold leading-none tracking-tight text-white md:text-[56px]">
                  <AnimatedNumber value={total} />
                </div>
                <div className="mt-1 text-[12px] text-white/60">Total lots registered · {stats?.totalInspections || 0} inspections</div>
              </div>
              <div className="ml-auto flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-xl bg-sb-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-soft transition hover:bg-sb-600">
                  <ShieldCheck size={15} /> System Health
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-white/15">
                  <ClipboardList size={15} /> View Reports
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </Reveal>

      {/* 3 pastel cards */}
      <Reveal delay={80}>
        <div className="card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-ink">Quality Distribution</h2>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:bg-bg">
              All Time <ChevronRight size={12} className="rotate-90" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <RecordCard label="Grade A"  value={gradeA} delta={gradeAPct} variant="card-pastel-mint"  Icon={TrendingUp} />
            <RecordCard label="URS"       value={urs}    delta={ursPct}    variant="card-pastel-peach" Icon={TrendingDown} />
            <RecordCard label="Rejected"  value={rejected} delta={rejPct}  variant="card-pastel-blue"  Icon={TrendingUp} />
          </div>
        </div>
      </Reveal>

      {/* Two-column layout */}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* KPI strip */}
          <Reveal delay={120}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Total Farmers"  value={stats?.totalFarmers || 0}  icon={Users}      tint="card-pastel-mint" />
              <KpiCard label="Total FPOs"     value={stats?.totalFPOs || 0}     icon={Building2}  tint="card-pastel-blue" />
              <KpiCard label="Total Buyers"   value={stats?.totalBuyers || 0}   icon={Store}      tint="card-pastel-peach" />
              <KpiCard label="Avg Score"      value={stats?.averageQualityScore || 0} icon={Gauge} tint="card-pastel-lavender" />
            </div>
          </Reveal>

          {/* Money Flow chart */}
          <Reveal delay={160}>
            <div className="card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-extrabold text-ink">Inspection Flow</h2>
                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-3 text-[12px] text-muted md:flex">
                    <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-ink" /> Inspections</span>
                    <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber" /> Rejected</span>
                  </div>
                  <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:bg-bg">
                    Weekly <ChevronRight size={12} className="rotate-90" />
                  </button>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={FLOW_DATA} margin={{ top: 20, right: 16, bottom: 0, left: -16 }}>
                    <XAxis dataKey="d" tick={{ fill: '#85838A', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#85838A', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(20,20,25,0.08)', fontSize: 12 }} />
                    <Line type="monotone" dataKey="sa" stroke="#17161D" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ex" stroke="#F4B942" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>

          {/* Centers table */}
          <Reveal delay={200}>
            <div className="card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-extrabold text-ink">Procurement Centers</h2>
                <button className="text-[12px] font-semibold text-muted hover:text-ink">View all</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3 font-semibold">Center</th>
                      <th className="py-2 pr-3 font-semibold text-right">Inspections</th>
                      <th className="py-2 pr-3 font-semibold text-right">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CENTERS.map((c) => (
                      <tr key={c.name} className="border-b border-border/60 transition last:border-0 hover:bg-bg/60">
                        <td className="py-3 pr-3 font-semibold text-ink">{c.name}</td>
                        <td className="py-3 pr-3 text-right text-muted">{c.inspections}</td>
                        <td className="py-3 pr-3 text-right font-extrabold text-ink">{c.avg}</td>
                      </tr>
                    ))}
                    {quality?.qualityByCenter?.map((c: any) => (
                      <tr key={c.center} className="border-b border-border/60 transition last:border-0 hover:bg-bg/60">
                        <td className="py-3 pr-3 font-semibold text-ink">{c.center}</td>
                        <td className="py-3 pr-3 text-right text-muted">—</td>
                        <td className="py-3 pr-3 text-right font-extrabold text-ink">{c.avg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <Reveal delay={160}>
            <div className="card p-4 md:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-extrabold text-ink">Recent Inspections</h2>
                <button className="text-[12px] font-semibold text-muted hover:text-ink">View all</button>
              </div>
              <div className="mt-4 space-y-2.5">
                {RECENT_TX.map((t) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl text-[12px] font-bold text-ink" style={{ background: t.color }}>
                      {t.name.split('#')[1]?.slice(0, 2) || 'L'}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-ink">{t.name}</div>
                      <div className="text-[11px] text-muted">{t.sub}</div>
                    </div>
                    <div className="ml-auto text-[13px] font-extrabold text-ink">{t.amt}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="card-dark relative overflow-hidden p-5">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sb-500/20 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-sb-300" />
                  <h2 className="text-[15px] font-extrabold text-white">System Status</h2>
                </div>
                <p className="mt-1 text-[12px] text-white/60">All services operational</p>
                <div className="mt-4 space-y-2">
                  {[
                    { label: 'Vision AI (OnionCheck)', status: 'Online' },
                    { label: 'IoT Gas Sensors',        status: 'Active' },
                    { label: 'Fusion Engine',           status: 'Ready' },
                    { label: 'Certificate Service',     status: 'Active' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
                      <span className="text-[12px] text-white/80">{s.label}</span>
                      <span className="chip bg-sb-500/15 text-sb-300">{s.status}</span>
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

function RecordCard({ label, value, delta, variant, Icon }: { label: string; value: number; delta: number; variant: string; Icon: any }) {
  const data = FLOW_DATA.slice(0, 6);
  const up = delta >= 0;
  const gradId = label.replace(/\s/g, '') + 'Grad';
  return (
    <div className={`${variant} p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ink/70">{label}</span>
        <MoreVertical size={14} className="text-ink/40" />
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="text-[24px] font-extrabold leading-none text-ink">
          <AnimatedNumber value={value} />
        </div>
        <div className={`ml-auto inline-flex items-center gap-1 text-[11px] font-semibold ${up ? 'text-sb-600' : 'text-reject'}`}>
          <Icon size={11} /> {up ? '+' : ''}{delta}%
        </div>
      </div>
      <div className="mt-3 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={up ? '#3FAE5A' : '#D9534F'} stopOpacity={0.45} />
                <stop offset="100%" stopColor={up ? '#3FAE5A' : '#D9534F'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="sa" stroke={up ? '#3FAE5A' : '#D9534F'} strokeWidth={1.5} fill={`url(#${gradId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tint }: { label: string; value: number; icon: any; tint: string }) {
  return (
    <div className={`${tint} flex items-center gap-3 p-4`}>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/70 text-ink">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/70">{label}</div>
        <div className="mt-0.5 text-[24px] font-extrabold leading-none text-ink">
          <AnimatedNumber value={value} />
        </div>
      </div>
    </div>
  );
}
