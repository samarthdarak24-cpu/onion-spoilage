import React from 'react';
import { motion } from 'framer-motion';
import {
  Search, UserPlus, Shield, Eye, Edit3, Trash2, CheckCircle2, XCircle, Lock,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_DASHBOARD } from '../../lib/events';
import { AnimatedNumber, Reveal } from '../../lib/fx';

type Role = 'Admin' | 'Officer' | 'FPO' | 'Farmer' | 'Buyer';

const USERS_DATA: { id: string; name: string; email: string; role: Role; status: 'Active' | 'Invited' | 'Suspended'; color: string }[] = [
  { id: 'u1', name: 'Officer One',       email: 'officer1@onionsure.co',  role: 'Officer', status: 'Active',    color: '#DDF5E8' },
  { id: 'u2', name: 'FPO Manager',        email: 'fpo1@onionsure.co',      role: 'FPO',     status: 'Active',    color: '#F9E9DD' },
  { id: 'u3', name: 'Farmer Rajesh',     email: 'farmer1@onionsure.co',   role: 'Farmer',  status: 'Active',    color: '#ECEAF8' },
  { id: 'u4', name: 'Buyer Corp',        email: 'buyer1@onionsure.co',    role: 'Buyer',   status: 'Invited',   color: '#E4EDF9' },
  { id: 'u5', name: 'Officer Two',       email: 'officer2@onionsure.co', role: 'Officer', status: 'Active',    color: '#DDF5E8' },
  { id: 'u6', name: 'Admin Account',     email: 'admin@onionsure.co',     role: 'Admin',   status: 'Active',    color: '#F9E9DD' },
  { id: 'u7', name: 'Farmer Suresh',     email: 'farmer2@onionsure.co',   role: 'Farmer',  status: 'Suspended', color: '#ECEAF8' },
];

const ROLES: { name: Role; count: number; desc: string; tint: string }[] = [
  { name: 'Admin',   count: 1,  desc: 'Full access · system config',    tint: 'card-pastel-mint' },
  { name: 'Officer', count: 8,  desc: 'Inspections & quality grading', tint: 'card-pastel-blue' },
  { name: 'FPO',      count: 12, desc: 'Lot registration & oversight',  tint: 'card-pastel-peach' },
  { name: 'Farmer',  count: 240, desc: 'Self-inspection & certificates', tint: 'card-pastel-lavender' },
  { name: 'Buyer',   count: 6,  desc: 'Verified lots & certificates',  tint: 'card-pastel-mint' },
];

const PERMS = [
  { label: 'View dashboards',      a: true,  o: true,  f: true,  fa: true,  b: true },
  { label: 'Export reports',       a: true,  o: true,  f: true,  fa: false, b: false },
  { label: 'Create & inspect lots', a: true,  o: true,  f: true,  fa: true,  b: false },
  { label: 'Manage users',         a: true,  o: false, f: false, fa: false, b: false },
  { label: 'Manage centers',       a: true,  o: false, f: false, fa: false, b: false },
  { label: 'Configure thresholds',  a: true,  o: false, f: false, fa: false, b: false },
  { label: 'View audit log',        a: true,  o: true,  f: true,  fa: false, b: false },
];

export default function AdminUsers() {
  const [q, setQ] = React.useState('');
  const [role, setRole] = React.useState<'All' | Role>('All');

  const { data } = useLiveData<any>(
    async () => {
      const [farmers, fpos, centers] = await Promise.all([
        api.getFarmers(), api.getFpos(), api.getCenters(),
      ]);
      return { farmers, fpos, centers };
    },
    { events: EV_DASHBOARD, pollMs: 30000 },
  );

  const filtered = USERS_DATA.filter((u) =>
    (role === 'All' || u.role === role) &&
    (u.name + u.email + u.role).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* Stat strip */}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Reveal><Stat label="Total Users" value={USERS_DATA.length * 100} /></Reveal>
        <Reveal delay={60}><Stat label="Active Now" value={124} accent="emerald" /></Reveal>
        <Reveal delay={120}><Stat label="Pending Invites" value={3} accent="amber" /></Reveal>
        <Reveal delay={180}><Stat label="Suspended" value={1} accent="reject" /></Reveal>
        <Reveal delay={240}><Stat label="Total Farmers" value={data?.farmers?.length || 0} accent="lavender" /></Reveal>
      </div>

      {/* Role distribution */}
      <Reveal delay={200}>
        <div className="card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-ink">Role Distribution</h2>
              <p className="text-[12px] text-muted">Membership count by role</p>
            </div>
            <button className="chip bg-bg text-ink hover:bg-sb-50">Manage roles</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ROLES.map((r, i) => (
              <Reveal key={r.name} delay={i * 60}>
                <div className={`${r.tint} p-4`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-ink/70">{r.name}</span>
                    <Shield size={14} className="text-ink/40" />
                  </div>
                  <div className="mt-2 text-[24px] font-extrabold text-ink"><AnimatedNumber value={r.count} /></div>
                  <div className="mt-1 text-[11px] text-ink/60">{r.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Permission Matrix + Activity */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Reveal delay={260}>
            <div className="card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-extrabold text-ink">Permission Matrix</h2>
                  <p className="text-[12px] text-muted">Role-based access for sensitive actions</p>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg">
                  <Lock size={12} /> Lock
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3 font-semibold">Permission</th>
                      <th className="py-2 pr-3 text-center font-semibold">Admin</th>
                      <th className="py-2 pr-3 text-center font-semibold">Officer</th>
                      <th className="py-2 pr-3 text-center font-semibold">FPO</th>
                      <th className="py-2 pr-3 text-center font-semibold">Farmer</th>
                      <th className="py-2 pr-3 text-center font-semibold">Buyer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMS.map((p) => (
                      <tr key={p.label} className="border-b border-border/60 last:border-0">
                        <td className="py-3 pr-3 text-ink">{p.label}</td>
                        {[p.a, p.o, p.f, p.fa, p.b].map((v, i) => (
                          <td key={i} className="py-3 pr-3 text-center">
                            {v ? <CheckCircle2 size={16} className="mx-auto text-sb-600" /> : <XCircle size={16} className="mx-auto text-muted/40" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="space-y-5">
          <Reveal delay={280}>
            <ActivityFeed />
          </Reveal>
        </div>
      </div>

      {/* Users table */}
      <Reveal delay={360}>
        <div className="card p-4 md:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-extrabold text-ink">Team Members</h2>
              <p className="text-[12px] text-muted">{filtered.length} of {USERS_DATA.length} shown</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members…" className="rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-[12px] outline-none focus:border-sb-500" />
              </div>
              <select value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-xl border border-border bg-white px-3 py-2 text-[12px] font-semibold text-ink outline-none">
                {(['All', 'Admin', 'Officer', 'FPO', 'Farmer', 'Buyer'] as const).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-dark-2">
                <UserPlus size={13} /> Invite
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Member</th>
                  <th className="py-2 pr-3 font-semibold">Role</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Last Active</th>
                  <th className="py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border/60 transition last:border-0 hover:bg-bg/60">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full text-[12px] font-bold text-ink" style={{ background: u.color }}>
                          {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-ink">{u.name}</div>
                          <div className="text-[11px] text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3"><RoleBadge role={u.role} /></td>
                    <td className="py-3 pr-3"><StatusBadge status={u.status} /></td>
                    <td className="py-3 pr-3 text-muted">2 hours ago</td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <ActionButton icon={Eye} />
                        <ActionButton icon={Edit3} />
                        <ActionButton icon={Trash2} danger />
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted">No members match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function Stat({ label, value, accent = 'forest', suffix = '' }: any) {
  const palette: any = {
    forest:   'from-sb-50 to-white text-sb-700',
    emerald:  'from-sb-100 to-white text-sb-700',
    amber:    'from-amber/15 to-white text-amber-700',
    reject:   'from-reject/10 to-white text-reject',
    lavender: 'from-soft-lavender to-white text-[#5a4eb8]',
  };
  return (
    <div className="card flex items-start justify-between p-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
        <div className="mt-1 text-[26px] font-extrabold leading-none text-ink">
          <AnimatedNumber value={value} suffix={suffix} />
        </div>
      </div>
      <span className={`chip bg-gradient-to-br ${palette[accent]}`}>{label.split(' ')[0]}</span>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const map: any = {
    Admin:   'bg-sb-500/15 text-sb-700',
    Officer: 'bg-sb-500/10 text-sb-700',
    FPO:     'bg-bg text-ink',
    Farmer:  'bg-soft-lavender text-[#5a4eb8]',
    Buyer:   'bg-soft-blue text-[#3b5f8a]',
  };
  return <span className={`chip ${map[role]}`}>{role}</span>;
}

function StatusBadge({ status }: { status: 'Active' | 'Invited' | 'Suspended' }) {
  const map: any = {
    Active:    'bg-sb-100 text-sb-700',
    Invited:   'bg-amber/20 text-amber-700',
    Suspended: 'bg-reject/15 text-reject',
  };
  return <span className={`chip ${map[status]}`}>{status}</span>;
}

function ActionButton({ icon: Icon, danger = false }: { icon: any; danger?: boolean }) {
  return (
    <button className={`grid h-8 w-8 place-items-center rounded-lg border border-border bg-white transition ${danger ? 'text-reject hover:bg-reject/5' : 'text-muted hover:bg-bg hover:text-ink'}`}>
      <Icon size={13} />
    </button>
  );
}

function ActivityFeed() {
  const events = [
    { who: 'Officer One',  action: 'graded lot',  target: '#LN-2451 → Grade A',  when: '2 min ago', color: '#DDF5E8' },
    { who: 'FPO Manager',   action: 'registered',   target: 'Farmer Suresh',       when: '14 min ago', color: '#F9E9DD' },
    { who: 'Admin',          action: 'updated',      target: 'Quality thresholds',  when: '38 min ago', color: '#E4EDF9' },
    { who: 'Farmer Rajesh', action: 'ran',          target: 'Self-inspection',     when: '1 hr ago', color: '#ECEAF8' },
    { who: 'Buyer Corp',     action: 'verified',     target: 'Certificate #C-8920', when: '2 hr ago', color: '#DDF5E8' },
    { who: 'Officer Two',    action: 'rejected',     target: 'Lot #LN-2448',        when: '4 hr ago', color: '#F9E9DD' },
  ];
  return (
    <div className="card p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">Recent Activity</h2>
          <p className="text-[12px] text-muted">Last 24 hours</p>
        </div>
        <button className="chip bg-bg text-ink hover:bg-sb-50">View all</button>
      </div>
      <div className="space-y-3">
        {events.map((e, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-1 grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-ink" style={{ background: e.color }}>
              {e.who.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 text-[12px]">
              <div className="text-ink"><b>{e.who}</b> {e.action} <b className="text-ink">{e.target}</b></div>
              <div className="text-muted">{e.when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
