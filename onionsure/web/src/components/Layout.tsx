import React from 'react';
import { NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FilePlus2, Radio, ScanLine, GitMerge, Award, QrCode, History,
  BarChart3, Building2, Settings, Search, Bell, MapPin, LogOut, Menu, Camera,
  ChevronLeft, Users as UsersIcon, FileBarChart, ShieldCheck, UserCog, Sprout,
  Tractor, Store, FileText, ShieldAlert,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth, ROLE_HOME } from '../lib/auth';
import { PageTransition } from './motion';
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
        { to: '/quality/live-camera', label: 'Live Camera', icon: Camera },
        { to: '/quality/fusion', label: 'Fusion Intelligence', icon: GitMerge },
        { to: '/quality/history', label: 'Inspection History', icon: History },
      ],
    },
    {
      section: 'Quality & Trust',
      items: [
        { to: '/quality/audit', label: 'Audit & Disputes', icon: ShieldAlert },
        { to: '/quality/certificates', label: 'Quality Certificates', icon: Award },
        { to: '/quality/qr-verify', label: 'QR Verification', icon: QrCode },
        { to: '/quality/analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
    {
      section: 'Management',
      items: [
        { to: '/quality/centers', label: 'Procurement Centers', icon: Building2 },
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
  ],
  farmer: [
    {
      section: 'My Farm',
      items: [
        { to: '/farmer/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
        { to: '/farmer/inspection', label: 'Pre-Check', icon: ScanLine },
        { to: '/farmer/inspections', label: 'My Lots', icon: History },
        { to: '/farmer/report', label: 'Inspection Report', icon: FileText },
        { to: '/farmer/certificates', label: 'My Certificate', icon: Award },
        { to: '/farmer/dispute', label: 'Raise Dispute', icon: ShieldAlert },
      ],
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



function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}


export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  if (!user) return null;

  const sections = NAV[user.role] || [];
  const RoleIcon = ROLE_ICON[user.role] || UserCog;

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


      {/* Footer */}
      <div className="px-2 pb-4 space-y-2">
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
