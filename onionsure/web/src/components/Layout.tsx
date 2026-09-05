import React from 'react';
import { NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FilePlus2, Radio, ScanLine, GitMerge, Award, QrCode, History,
  BarChart3, Building2, Settings, Search, Bell, MapPin, LogOut, Menu,
  ChevronLeft, Users as UsersIcon, FileBarChart, ShieldCheck, UserCog, Sprout,
  Tractor, Store, ChevronDown, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth, ROLE_HOME } from '../lib/auth';
import { LiveIndicator } from './RealtimeStatus';
import { useLastDataUpdated } from '../lib/realtime';
import { RefreshPulse, PageTransition } from './motion';
import type { Role } from '../lib/types';

type NavItem = { to: string; label: string; icon: any };
type NavSection = { section: string; items: NavItem[] };

/* ------------------------------------------------------------------ */
/* Role-based navigation — every role sees ONLY its own, grouped menu. */
/* `/quality/*` routes are shared utilities (certificates, analytics,   */
/* settings, centers, sensors, QR verify); each role links into them    */
/* from its own section, but the surrounding menu is role-specific.     */
/* ------------------------------------------------------------------ */
const NAV: Record<Role, NavSection[]> = {
  procurement_officer: [
    {
      section: 'Operations',
      items: [
        { to: '/quality/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/quality/new-inspection', label: 'New Inspection', icon: FilePlus2 },
        { to: '/quality/live-sensor', label: 'Live Sensor', icon: Radio },
        { to: '/quality/ai-analysis', label: 'AI Analysis', icon: ScanLine },
        { to: '/quality/fusion', label: 'Fusion Intelligence', icon: GitMerge },
        { to: '/quality/history', label: 'Inspection History', icon: History },
      ],
    },
    {
      section: 'Quality & Trust',
      items: [
        { to: '/quality/certificates', label: 'Quality Certificates', icon: Award },
        { to: '/quality/qr-verify', label: 'QR Verification', icon: QrCode },
        { to: '/quality/analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
    {
      section: 'Management',
      items: [
        { to: '/quality/centers', label: 'Procurement Centers', icon: Building2 },
        { to: '/quality/settings', label: 'Settings', icon: Settings },
      ],
    },
  ],
  fpo: [
    {
      section: 'Overview',
      items: [{ to: '/fpo/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      section: 'Quality',
      items: [
        { to: '/fpo/inspection', label: 'Lot Inspection', icon: ScanLine },
        { to: '/quality/new-inspection', label: 'Register Lot', icon: FilePlus2 },
        { to: '/quality/certificates', label: 'Certificates', icon: Award },
        { to: '/quality/analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
    {
      section: 'Account',
      items: [{ to: '/quality/settings', label: 'Settings', icon: Settings }],
    },
  ],
  farmer: [
    {
      section: 'My Farm',
      items: [
        { to: '/farmer/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
        { to: '/farmer/inspection', label: 'Self Inspection', icon: ScanLine },
        { to: '/farmer/inspections', label: 'Inspection Results', icon: History },
        { to: '/farmer/certificates', label: 'Certificates', icon: Award },
      ],
    },
    {
      section: 'Account',
      items: [{ to: '/quality/settings', label: 'Settings', icon: Settings }],
    },
  ],
  buyer: [
    {
      section: 'Sourcing',
      items: [
        { to: '/buyer/dashboard', label: 'Verified Lots', icon: LayoutDashboard },
        { to: '/quality/certificates', label: 'Certificates', icon: Award },
        { to: '/quality/qr-verify', label: 'Scan / Verify', icon: QrCode },
      ],
    },
    {
      section: 'Account',
      items: [{ to: '/quality/settings', label: 'Settings', icon: Settings }],
    },
  ],
  admin: [
    {
      section: 'Platform',
      items: [
        { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/admin/users', label: 'User Management', icon: UsersIcon },
        { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
      ],
    },
    {
      section: 'Operations',
      items: [
        { to: '/quality/centers', label: 'Centers', icon: Building2 },
        { to: '/quality/live-sensor', label: 'Sensors', icon: Radio },
        { to: '/quality/analytics', label: 'Quality Analytics', icon: BarChart3 },
      ],
    },
    {
      section: 'Configuration',
      items: [{ to: '/quality/settings', label: 'Thresholds', icon: Settings }],
    },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  procurement_officer: 'Procurement Officer',
  fpo: 'FPO',
  farmer: 'Farmer',
  buyer: 'Buyer',
  admin: 'Administrator',
};

const ROLE_ICON: Record<Role, any> = {
  procurement_officer: UserCog,
  fpo: Sprout,
  farmer: Tractor,
  buyer: Store,
  admin: ShieldCheck,
};

const DEMO_ACCOUNTS: { role: Role; username: string; label: string }[] = [
  { role: 'procurement_officer', username: 'officer1', label: 'Officer' },
  { role: 'fpo', username: 'fpo1', label: 'FPO' },
  { role: 'farmer', username: 'farmer1', label: 'Farmer' },
  { role: 'buyer', username: 'buyer1', label: 'Buyer' },
  { role: 'admin', username: 'admin', label: 'Admin' },
];

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function LiveRefreshDot() {
  const { refreshing } = useLastDataUpdated();
  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" title={refreshing ? 'Syncing live data…' : 'Live data up to date'}>
      <RefreshPulse active={refreshing} />
    </span>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [switchOpen, setSwitchOpen] = React.useState(false);
  const [switching, setSwitching] = React.useState<Role | null>(null);
  if (!user) return null;

  const sections = NAV[user.role] || [];
  const RoleIcon = ROLE_ICON[user.role] || UserCog;

  const switchRole = async (acc: { role: Role; username: string }) => {
    setSwitching(acc.role);
    try {
      await login(acc.username, 'password123');
      navigate(ROLE_HOME[acc.role] || '/');
    } finally {
      setSwitching(null);
      setSwitchOpen(false);
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Role badge — the topmost element. Collapse toggle rides along. */}
      <div className={clsx('flex items-stretch gap-2 px-2 pt-4', collapsed ? 'pb-2' : 'pb-3')}>
        <div className={clsx(
          'flex flex-1 items-center gap-3 rounded-xl2 border border-sb-200/70 bg-gradient-to-br from-sb-50 to-mint/40 p-3 shadow-soft',
          collapsed && 'justify-center p-2'
        )}>
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sb-300 to-sb-500 text-[13px] font-bold text-white">
            {initials(user.name)}
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-white text-forest ring-1 ring-border">
              <RoleIcon size={11} />
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-ink">{user.name}</div>
              <div className="flex items-center gap-1 truncate text-[11px] font-semibold text-forest">
                <RoleIcon size={11} /> {ROLE_LABEL[user.role]}
              </div>
            </div>
          )}
        </div>
        <button
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden h-auto w-8 shrink-0 place-items-center rounded-lg bg-bg text-muted hover:text-ink lg:grid"
        >
          <ChevronLeft size={16} className={clsx('transition', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Grouped, role-scoped nav */}
      <nav className="flex-1 overflow-y-auto scroll-y px-2 pb-3">
        {sections.map((sec) => (
          <div key={sec.section} className="mb-4 last:mb-0">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted/70">
                {sec.section}
              </div>
            )}
            <div className="space-y-1">
              {sec.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to.endsWith('/dashboard')}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => clsx(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition',
                    collapsed && 'justify-center px-2',
                    isActive ? 'bg-ink text-white shadow-soft' : 'text-ink hover:bg-bg',
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <it.icon size={18} className={clsx('shrink-0', isActive ? 'text-white' : 'text-muted group-hover:text-ink')} />
                      {!collapsed && <span className="truncate">{it.label}</span>}
                      {isActive && !collapsed && (
                        <motion.span layoutId="nav-pill" className="absolute right-3 h-1.5 w-1.5 rounded-full bg-sb-500" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — fills the column, no awkward gap */}
      <div className="px-2 pb-4 space-y-2">
        {/* Live-sync status */}
        <div className="glass-premium flex items-center gap-2.5 rounded-xl2 px-3 py-2.5">
          <LiveIndicator />
          <LiveRefreshDot />
          {!collapsed && (
            <div className="min-w-0 text-[11px] leading-tight">
              <div className="font-semibold text-ink">Live sync</div>
              <div className="truncate text-muted">Real-time quality data</div>
            </div>
          )}
        </div>

        {/* Demo: switch role (verifies RBAC instantly) */}
        <div className="relative">
          <button
            onClick={() => setSwitchOpen((v) => !v)}
            disabled={!!switching}
            className={clsx(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-muted transition hover:bg-bg hover:text-ink',
              collapsed && 'justify-center px-2',
            )}
          >
            <RefreshCw size={18} className={clsx(switching && 'animate-spin')} />
            {!collapsed && <span>{switching ? 'Switching…' : 'Switch demo role'}</span>}
            {!collapsed && <ChevronDown size={14} className="ml-auto opacity-60" />}
          </button>
          {switchOpen && !collapsed && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-xl2 border border-border bg-surface shadow-card">
              {DEMO_ACCOUNTS.map((a) => {
                const Icon = ROLE_ICON[a.role];
                const active = a.role === user.role;
                return (
                  <button
                    key={a.username}
                    onClick={() => switchRole(a)}
                    className={clsx(
                      'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-semibold transition hover:bg-bg',
                      active ? 'text-forest' : 'text-ink',
                    )}
                  >
                    <Icon size={15} className={active ? 'text-forest' : 'text-muted'} />
                    <span>{a.label}</span>
                    {active && <span className="ml-auto text-[10px] uppercase tracking-wide text-forest">current</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className={clsx(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-muted transition hover:bg-bg hover:text-ink',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut size={18} />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar (white) */}
      <aside className={clsx(
        'hidden lg:flex flex-col sticky top-0 h-screen z-40 bg-surface border-r border-border transition-all duration-300',
        collapsed ? 'w-[80px]' : 'w-[264px]'
      )}>
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-40 w-[264px] bg-surface border-r border-border lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-3 pt-3 lg:px-5 lg:pt-4">
          <div className="glass-premium flex w-full items-center gap-3 rounded-xl2 px-4 py-2.5 shadow-soft lg:px-5 lg:py-3">
            <button onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white text-ink lg:hidden"
              aria-label="Open menu">
              <Menu size={16} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 truncate text-[18px] font-extrabold leading-tight text-ink md:text-[22px]">
                {ROLE_LABEL[user.role]}
                <span className="hidden rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-forest sm:inline-flex items-center gap-1">
                  <RoleIcon size={11} /> {user.role.replace('_', ' ')}
                </span>
              </h1>
              <p className="hidden truncate text-[12px] text-muted sm:block">
                OnionSure Quality Intelligence Platform
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-[12px] font-semibold text-ink">
              <MapPin size={14} className="text-sb-600" /> {user.centerId || 'All Centers'}
            </div>

            <div className="relative">
              <button className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white text-ink transition hover:bg-bg"
                aria-label="Search">
                <Search size={15} />
              </button>
            </div>

            <button className="relative grid h-9 w-9 place-items-center rounded-xl border border-border bg-white text-ink transition hover:bg-bg">
              <Bell size={15} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-reject" />
            </button>

            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sb-300 to-sb-500 text-[12px] font-extrabold text-white">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 md:p-5">
          <div className="mx-auto w-full max-w-[1560px]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, ready } = useAuth();
  const location = useLocation();
  // Declarative guard — no useEffect side-effects, no race conditions.
  if (!ready || loading) return <div className="grid h-screen place-items-center text-ink">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Role enforcement (spec §7 / §32): a route prefix owns a specific role.
  // `/quality/*` is a shared utility area (certificates, analytics, settings,
  // centers, sensors, QR verify) reachable by any authenticated user — the
  // backend scopes the returned data per role. Every other prefix is gated.
  const seg = '/' + (location.pathname.split('/')[1] || '');
  const REQUIRED_ROLE: Record<string, string> = {
    '/admin': 'admin',
    '/fpo': 'fpo',
    '/farmer': 'farmer',
    '/buyer': 'buyer',
  };
  const required = REQUIRED_ROLE[seg];
  if (required && user.role !== required) {
    // Authenticated but wrong role → return them to their own home.
    return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  }
  return <>{children}</>;
}
