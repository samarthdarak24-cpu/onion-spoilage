import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  Search, Plus, Download, Calendar, Bell, Mail, Share2, CheckCircle2, Clock,
  AlertTriangle, Filter, FileBarChart, FileText, FileSpreadsheet,
  FileType2, Printer, RefreshCw, MoreVertical, ArrowUpRight, Cloud,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_DASHBOARD } from '../../lib/events';
import { AnimatedNumber, Reveal } from '../../lib/fx';

const REPORTS = [
  { id: 'r1', title: 'Monthly Quality Summary',  type: 'Quality',    period: 'Sep 2026', status: 'Ready',      updated: '2h ago',  size: '2.4 MB', tone: '#DDF5E8' },
  { id: 'r2', title: 'Quarterly Inspection Log',  type: 'Inspection', period: 'Q3 2026', status: 'Ready',      updated: '5m ago',  size: '3.1 MB', tone: '#E4EDF9' },
  { id: 'r3', title: 'Compliance Audit Report',   type: 'Compliance', period: 'Aug 2026', status: 'Ready',      updated: '1d ago',  size: '1.8 MB', tone: '#ECEAF8' },
  { id: 'r4', title: 'Farmer Registration List',  type: 'Users',      period: 'Sep 2026', status: 'Generating', updated: 'now',     size: '—',      tone: '#F9E9DD' },
  { id: 'r5', title: 'Center Performance KPIs',   type: 'KPI',        period: 'Sep 2026', status: 'Scheduled',  updated: 'daily',   size: '—',      tone: '#DDF5E8' },
  { id: 'r6', title: 'Grade Distribution Digest',  type: 'Quality',    period: 'Weekly',   status: 'Ready',      updated: '3h ago',  size: '0.9 MB', tone: '#ECEAF8' },
];

const GEN = [
  { m: 'Apr', n: 18 }, { m: 'May', n: 24 }, { m: 'Jun', n: 21 }, { m: 'Jul', n: 30 },
  { m: 'Aug', n: 27 }, { m: 'Sep', n: 34 }, { m: 'Oct', n: 29 },
];

const NOTIFS = [
  { icon: CheckCircle2, title: 'Q3 Inspection Log ready', desc: 'Generated and stored', time: '5m ago', unread: true,  tone: 'sb' },
  { icon: Share2,        title: 'Quality Digest sent',     desc: 'Delivered to compliance', time: '1h ago', unread: true,  tone: 'sb' },
  { icon: AlertTriangle, title: 'Farmer List export failed', desc: 'Timeout — retry available', time: '3h ago', unread: false, tone: 'reject' },
  { icon: Mail,          title: 'New comment on Summary',  desc: 'Officer One left a note', time: '1d ago', unread: false, tone: 'amber' },
  { icon: Cloud,         title: 'Storage at 78%',          desc: 'Consider archiving older reports', time: '2d ago', unread: false, tone: 'amber' },
];

const DOWNLOADS = [
  { name: 'Q3_Inspection_Log.pdf',  size: '2.4 MB', when: '5m ago',  tone: '#E4EDF9' },
  { name: 'Aug_Audit_Report.xlsx',    size: '1.1 MB', when: '1h ago',  tone: '#DDF5E8' },
  { name: 'Sep_KPIs.csv',             size: '320 KB', when: '2h ago',  tone: '#F9E9DD' },
  { name: 'Quality_Summary.pdf',       size: '2.0 MB', when: '1d ago',  tone: '#ECEAF8' },
];

const EXPORT_OPTS = [
  { label: 'Download PDF',   icon: FileType2 },
  { label: 'Download Excel',  icon: FileSpreadsheet },
  { label: 'Download CSV',   icon: FileText },
  { label: 'Copy share link', icon: Share2 },
];

export default function AdminReports() {
  const [q, setQ] = React.useState('');
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [scheduled, setScheduled] = React.useState(true);

  const { data } = useLiveData<any>(
    async () => {
      const stats = await api.analyticsDashboard();
      return { stats };
    },
    { events: EV_DASHBOARD, pollMs: 30000 },
  );

  const filtered = REPORTS.filter((r) => (r.title + r.type).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* KPI strip */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Reports Generated', value: 1284, icon: FileBarChart, tint: 'card-pastel-mint' },
          { label: 'Scheduled',          value: 12,   icon: Calendar,     tint: 'card-pastel-blue' },
          { label: 'Shared Externally',  value: 86,   icon: Share2,       tint: 'card-pastel-peach' },
          { label: 'Avg. Gen. Time',     value: 1.2,  icon: Clock,        tint: 'card-pastel-lavender', suffix: 's', decimals: 1 },
        ].map((k, i) => (
          <Reveal key={k.label} delay={i * 60}>
            <div className={`${k.tint} flex items-center gap-3 p-4`}>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/70 text-ink">
                <k.icon size={18} />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/70">{k.label}</div>
                <div className="mt-0.5 text-[24px] font-extrabold leading-none text-ink">
                  <AnimatedNumber value={k.value} suffix={k.suffix || ''} decimals={k.decimals || 0} />
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Report Library */}
          <Reveal delay={120}>
            <div className="card p-4 md:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-extrabold text-ink">Report Library</h2>
                  <p className="text-[12px] text-muted">{filtered.length} of {REPORTS.length} reports</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports…" className="rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-[12px] outline-none focus:border-sb-500" />
                  </div>
                  <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg">
                    <Filter size={13} /> Filter
                  </button>
                  <button className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-dark-2">
                    <Plus size={13} /> New Report
                  </button>
                </div>
              </div>
              <div className="space-y-2.5">
                {filtered.map((r) => (
                  <div key={r.id} className="group relative flex items-center gap-3 rounded-xl2 border border-border bg-bg/50 px-3 py-3 transition hover:bg-white">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[12px] font-bold text-ink" style={{ background: r.tone }}>
                      <FileBarChart size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink">{r.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                        <span className="chip bg-white text-ink">{r.type}</span>
                        <span>{r.period}</span><span>·</span><span>{r.updated}</span>
                      </div>
                    </div>
                    <StatusTag status={r.status} />
                    <div className="relative">
                      <button onClick={() => setOpenMenu((v) => (v === r.id ? null : r.id))}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white text-muted transition hover:bg-bg hover:text-ink" aria-label="Export options">
                        <MoreVertical size={14} />
                      </button>
                      <AnimatePresence>
                        {openMenu === r.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.96, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -6 }} transition={{ duration: 0.16 }}
                            className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl2 border border-border bg-white p-1.5 shadow-card">
                            {EXPORT_OPTS.map((o) => (
                              <button key={o.label} onClick={() => setOpenMenu(null)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-ink transition hover:bg-bg">
                                <o.icon size={14} className="text-sb-600" /> {o.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="py-8 text-center text-[13px] text-muted">No reports match "{q}".</div>
                )}
              </div>
            </div>
          </Reveal>

          {/* Generation Activity */}
          <Reveal delay={180}>
            <div className="card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-extrabold text-ink">Generation Activity</h2>
                  <p className="text-[12px] text-muted">Reports produced per month</p>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:bg-bg">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={GEN} margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="rgba(20,20,25,0.06)" vertical={false} />
                    <XAxis dataKey="m" tick={{ fill: '#85838A', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#85838A', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(20,20,25,0.08)', fontSize: 12 }} cursor={{ fill: 'rgba(63,174,90,0.06)' }} />
                    <Bar dataKey="n" fill="#3FAE5A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="space-y-5">
          {/* Notifications */}
          <Reveal delay={140}>
            <div className="card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-sb-600" />
                  <h2 className="text-[15px] font-extrabold text-ink">Notifications</h2>
                </div>
                <button className="chip bg-bg text-ink hover:bg-sb-50">Mark all read</button>
              </div>
              <div className="space-y-2.5">
                {NOTIFS.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-bg/50 p-2.5">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] ${
                      n.tone === 'sb' ? 'bg-sb-500/15 text-sb-600'
                      : n.tone === 'reject' ? 'bg-reject/15 text-reject'
                      : 'bg-amber/20 text-amber-700'
                    }`}>
                      <n.icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[12.5px] font-semibold text-ink">{n.title}</span>
                        {n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sb-500" />}
                      </div>
                      <div className="truncate text-[11px] text-muted">{n.desc}</div>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Export & Schedule (dark) */}
          <Reveal delay={200}>
            <div className="card-dark relative overflow-hidden p-5">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sb-500/20 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-sb-300" />
                  <h2 className="text-[15px] font-extrabold text-white">Export & Schedule</h2>
                </div>
                <p className="mt-1 text-[12px] text-white/60">Deliver reports where your team works.</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'PDF', icon: FileType2 },
                    { label: 'Excel', icon: FileSpreadsheet },
                    { label: 'CSV', icon: FileText },
                  ].map((b) => (
                    <button key={b.label} className="flex flex-col items-center gap-1.5 rounded-xl bg-white/10 px-2 py-3 text-[12px] font-semibold text-white transition hover:bg-white/15">
                      <b.icon size={16} className="text-sb-300" />
                      {b.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <Calendar size={15} className="text-sb-300" />
                    <div>
                      <div className="text-[13px] font-semibold text-white">Weekly digest</div>
                      <div className="text-[11px] text-white/55">Mon 09:00 · compliance</div>
                    </div>
                  </div>
                  <button onClick={() => setScheduled((v) => !v)}
                    className={`relative h-6 w-11 rounded-full transition ${scheduled ? 'bg-sb-500' : 'bg-white/20'}`}
                    aria-label="Toggle schedule">
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${scheduled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sb-500 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-sb-600">
                  <Printer size={15} /> Generate all now
                </button>
              </div>
            </div>
          </Reveal>

          {/* Recent Downloads */}
          <Reveal delay={260}>
            <div className="card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-ink">Recent Downloads</h2>
                <button className="text-[12px] font-semibold text-muted hover:text-ink">View all</button>
              </div>
              <div className="space-y-2.5">
                {DOWNLOADS.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink" style={{ background: d.tone }}>
                      <FileText size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-ink">{d.name}</div>
                      <div className="text-[11px] text-muted">{d.size}</div>
                    </div>
                    <button className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white text-muted transition hover:bg-bg hover:text-ink" aria-label="Download">
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function StatusTag({ status }: { status: string }) {
  const map: any = {
    Ready:      'bg-sb-100 text-sb-700',
    Generating: 'bg-amber/20 text-amber-700',
    Scheduled:  'bg-soft-lavender text-[#5a4eb8]',
  };
  return (
    <span className={`chip hidden sm:inline-flex ${map[status] || 'bg-bg text-ink'}`}>
      {status === 'Generating' && <Clock size={11} className="animate-spin" />}
      {status}
    </span>
  );
}
