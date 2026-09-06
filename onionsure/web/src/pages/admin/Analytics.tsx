import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend as RechartsLegend,
} from 'recharts';
import {
  ChevronDown, Download, Calendar, Filter, ArrowUpRight, ArrowDownRight, RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_DASHBOARD } from '../../lib/events';
import { AnimatedNumber, Reveal } from '../../lib/fx';

const CHANNEL = [
  { name: 'Grade A',  value: 38, color: '#3FAE5A' },
  { name: 'URS',       value: 26, color: '#F4B942' },
  { name: 'Rejected', value: 14, color: '#D9534F' },
  { name: 'Pending',  value: 22, color: '#8B5CF6' },
];

const TREND = [
  { d: '01', a: 110, b: 130 }, { d: '04', a: 150, b: 100 },
  { d: '07', a: 130, b: 170 }, { d: '10', a: 200, b: 140 },
  { d: '13', a: 170, b: 200 }, { d: '16', a: 220, b: 180 },
  { d: '19', a: 190, b: 230 }, { d: '22', a: 240, b: 200 },
  { d: '25', a: 210, b: 250 }, { d: '28', a: 270, b: 220 },
];

const FILTER_CHIPS = ['All', 'Grade A', 'URS', 'Rejected', 'Pending'];

export default function AdminAnalytics() {
  const [filter, setFilter] = React.useState('All');
  const { data, loading } = useLiveData<any>(
    async () => {
      const [stats, quality, defects] = await Promise.all([
        api.analyticsDashboard(), api.analyticsQuality(), api.analyticsDefects(),
      ]);
      return { stats, quality, defects };
    },
    { events: EV_DASHBOARD, pollMs: 15000 },
  );

  if (loading && !data) {
    return <div className="mx-auto max-w-[1400px] space-y-5">{[0,1,2].map(i => <div key={i} className="h-40 animate-pulse rounded-xl2 bg-bg" />)}</div>;
  }

  const stats = data?.stats;
  const quality = data?.quality;
  const defects = data?.defects || {};
  const gradeData = Object.entries(quality?.gradeDistribution || {}).map(([k, v]) => ({ name: k, value: v as number }));
  const defectData = Object.entries(defects).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v as number }));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* KPI row */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Lots',         value: stats?.totalLots || 0,        delta: +12.4 },
          { label: 'Total Inspections',  value: stats?.totalInspections || 0, delta: +5.7 },
          { label: 'Today Inspections',   value: stats?.todayInspections || 0, delta: +2.1 },
          { label: 'Pending',             value: stats?.pendingInspections || 0, delta: -0.4 },
        ].map((k, i) => (
          <Reveal key={k.label} delay={i * 60}>
            <Kpi {...k} />
          </Reveal>
        ))}
      </div>

      {/* Filter toolbar */}
      <Reveal delay={120}>
        <div className="card flex flex-wrap items-center gap-3 p-3.5">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted" />
            <span className="text-[12px] font-semibold text-muted">Filter by grade</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_CHIPS.map((c) => (
              <button key={c} onClick={() => setFilter(c)}
                className={`chip transition ${filter === c ? 'bg-ink text-white' : 'bg-bg text-ink hover:bg-sb-50'}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg">
              <Calendar size={13} /> Last 30 days <ChevronDown size={12} />
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg">
              <RefreshCw size={13} /> Refresh
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-dark-2">
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>
      </Reveal>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal delay={160} className="lg:col-span-2">
          <ChartCard title="Grade Distribution" subtitle="Quality breakdown across all lots">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeData.length ? gradeData : [{ name: 'A', value: 10 }, { name: 'B', value: 5 }]} margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="rgba(20,20,25,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#85838A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#85838A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(20,20,25,0.08)', fontSize: 12 }} />
                <Bar dataKey="value" fill="#3FAE5A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Reveal>

        <Reveal delay={200}>
          <ChartCard title="Status Mix" subtitle="Current inspection statuses">
            <div className="flex flex-1 items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={CHANNEL} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {CHANNEL.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(20,20,25,0.08)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
              {CHANNEL.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <i className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  <span className="text-muted">{c.name}</span>
                  <span className="ml-auto font-semibold text-ink">{c.value}%</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </Reveal>

        <Reveal delay={240} className="lg:col-span-3">
          <ChartCard title="Quality Trend" subtitle="Average score over time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="qaG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3FAE5A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3FAE5A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="qbG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F4B942" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F4B942" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(20,20,25,0.06)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: '#85838A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#85838A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(20,20,25,0.08)', fontSize: 12 }} />
                <RechartsLegend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="a" type="monotone" stroke="#3FAE5A" strokeWidth={2} fill="url(#qaG)" name="Grade A" />
                <Area dataKey="b" type="monotone" stroke="#F4B942" strokeWidth={2} fill="url(#qbG)" name="URS" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Reveal>

        <Reveal delay={280} className="lg:col-span-3">
          <ChartCard title="Defect Analysis" subtitle="Common quality issues detected">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={defectData.length ? defectData : [{ name: 'Sprout', value: 5 }, { name: 'Rot', value: 3 }, { name: 'Thick Neck', value: 8 }]} margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="rgba(20,20,25,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#85838A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#85838A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(20,20,25,0.08)', fontSize: 12 }} />
                <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Reveal>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta }: any) {
  const up = delta >= 0;
  return (
    <div className="card flex items-start justify-between p-4 md:p-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
        <div className="mt-1 text-[28px] font-extrabold leading-none text-ink">
          <AnimatedNumber value={value} />
        </div>
      </div>
      <span className={`chip ${up ? 'bg-sb-100 text-sb-700' : 'bg-reject/15 text-reject'}`}>
        {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />} {up ? '+' : ''}{delta}%
      </span>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card flex flex-col p-4 md:p-5 ${className || ''}`} style={{ minHeight: 280 }}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">{title}</h2>
          {subtitle && <p className="text-[12px] text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
