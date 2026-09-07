import React from 'react';
import { NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FilePlus2, Radio, ScanLine, GitMerge, Award, QrCode, History,
  BarChart3, Building2, Bell, LogOut, Menu, Camera,
  ChevronLeft, Users as UsersIcon, FileBarChart, ShieldCheck, UserCog, Sprout,
  Tractor, Store, FileText, ShieldAlert, X, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth, ROLE_HOME } from '../lib/auth';
import { PageTransition } from './motion';
import type { Role } from '../lib/types';

type NavItem = { to: string; label: string; icon: any };
type NavSection = { section: string; items: NavItem[] };

const NAV: Record<Role, NavSection[]> = {
  procurement_officer: [
    {
      section: 'Operations',
      items: [
        { to: '/quality/dashboard',       label: 'Dashboard',          icon: LayoutDashboard },
        { to: '/quality/new-inspection',  label: 'New Inspection',     icon: FilePlus2 },
        { to: '/quality/live-sensor',     label: 'Live Sensor',        icon: Radio },
        { to: '/quality/ai-analysis',     label: 'AI Analysis',        icon: ScanLine },
        { to: '/quality/live-camera',     label: 'Live Camera',        icon: Camera },
        { to: '/quality/fusion',          label: 'Fusion Intelligence',icon: GitMerge },
        { to: '/quality/history',         label: 'Inspection History', icon: History },
      ],
    },
    {
      section: 'Quality & Trust',
      items: [
        { to: '/quality/audit',           label: 'Audit & Disputes',   icon: ShieldAlert },
        { to: '/quality/certificates',    label: 'Certificates',       icon: Award },
        { to: '/quality/qr-verify',       label: 'QR Verification',    icon: QrCode },
        { to: '/quality/analytics',       label: 'Analytics',          icon: BarChart3 },
      ],
    },
    {
      section: 'Management',
      items: [
        { to: '/quality/centers',         label: 'Procurement Centers',icon: Building2 },
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
        { to: '/fpo/inspection',          label: 'Lot Inspection',     icon: ScanLine },
        { to: '/quality/new-inspection',  label: 'Register Lot',       icon: FilePlus2 },
        { to: '/quality/certificates',    label: 'Certificates',       icon: Award },
        { to: '/quality/analytics',       label: 'Analytics',          icon: BarChart3 },
      ],
    },
  ],
  farmer: [
    {
      section: 'My Farm',
      items: [
        { to: '/farmer/dashboard',    label: 'My Dashboard',    icon: LayoutDashboard },
        { to: '/farmer/inspection',   label: 'Pre-Check',       icon: ScanLine },
        { to: '/farmer/inspections',  label: 'My Lots',         icon: History },
        { to: '/farmer/report',       label: 'Reports',         icon: FileText },
        { to: '/farmer/certificates', label: 'Certificates',    icon: Award },
        { to: '/farmer/dispute',      label: 'Raise Dispute',   icon: ShieldAlert },
      ],
    },
  ],
  buyer: [
    {
      section: 'Sourcing',
      items: [
        { to: '/buyer/dashboard',       label: 'Verified Lots', icon: LayoutDashboard },
        { to: '/quality/certificates',  label: 'Certificates',  icon: Award },
        { to: '/quality/qr-verify',     label: 'Scan & Verify', icon: QrCode },
      ],
    },
  ],
  admin: [
    {
      section: 'Platform',
      items: [
        { to: '/admin/dashboard',   label: 'Overview',       icon: LayoutDashboard },
        { to: '/admin/analytics',   label: 'Analytics',      icon: BarChart3 },
        { to: '/admin/users',       label: 'Users',          icon: UsersIcon },
        { to: '/admin/reports',     label: 'Reports',        icon: FileBarChart },
      ],
    },
    {
      section: 'Operations',
      items: [
        { to: '/quality/centers',     label: 'Centers',          icon: Building2 },
        { to: '/quality/live-sensor', label: 'Sensors',          icon: Radio },
        { to: '/quality/analytics',   label: 'Quality Analytics',icon: BarChart3 },
      ],
    },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  procurement_officer: 'Procurement',
  fpo: 'FPO',
  farmer: 'Farmer',
  buyer: 'Buyer',
  admin: 'Admin',
};

const ROLE_COLOR: Record<Role, string> = {
  procurement_officer: 'from-forest to-darkgreen',
  fpo:                 'from-[#2d5a27] to-[#1e3d1b]',
  farmer:              'from-forest to-[#0e6b44]',
  buyer:               'from-[#1a3a5c] to-[#0d2e50]',
  admin:               'from-[#2d1b69] to-[#1a0e42]',
};

const ROLE_BG: Record<Role, string> = {
  procurement_officer: 'bg-forest/10 text-forest',
  fpo:                 'bg-emerald-900/10 text-emerald-800',
  farmer:              'bg-forest/10 text-forest',
  buyer:               'bg-blue-900/10 text-blue-800',
  admin:               'bg-purple-900/10 text-purple-800',
};

const ROLE_ICON: Record<Role, any> = {
  procurement_officer: UserCog,
  fpo:   Sprout,
  farmer: Tractor,
  buyer:  Store,
  admin:  ShieldCheck,
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

  const sections  = NAV[user.role] || [];
  const RoleIcon  = ROLE_ICON[user.role] || UserCog;
  const roleGrad  = ROLE_COLOR[user.role];
  const roleBg    = ROLE_BG[user.role];

  const SidebarContent = (
    <div className="flex h-full flex-col" style={{ background: '#FAFAFA' }}>
      {/* Top: brand + collapse */}
      <div className={clsx(
        'flex items-center border-b border-[rgba(20,20,25,0.06)]',
        collapsed ? 'justify-center px-3 py-4' : 'gap-3 px-4 py-4',
      )}>
        {!collapsed && (
          <>
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${roleGrad} text-white shadow-[0_4px_12px_rgba(11,93,59,0.3)]`}>
              <RoleIcon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-forest">OnionSure</p>
              <p className="text-[10px] font-semibold text-muted truncate">Quality Intelligence</p>
            </div>
            <button
              aria-label="Collapse sidebar"
              onClick={() => setCollapsed(true)}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-[rgba(20,20,25,0.06)] hover:text-ink transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
          </>
        )}
        {collapsed && (
          <button
            aria-label="Expand sidebar"
            onClick={() => setCollapsed(false)}
            className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${roleGrad} text-white shadow-[0_4px_12px_rgba(11,93,59,0.3)]`}
          >
            <RoleIcon size={16} />
          </button>
        )}
      </div>

      {/* User pill */}
      {!collapsed ? (
        <div className={`mx-3 mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br ${roleGrad} p-3 text-white shadow-[0_4px_14px_rgba(11,93,59,0.22)]`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20 text-[13px] font-extrabold text-white border border-white/25 shadow-inner">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold leading-tight">{user.name}</p>
            <p className="text-[10px] text-white/65 font-medium mt-0.5">{ROLE_LABEL[user.role]}</p>
          </div>
          <div className={`chip text-[10px] bg-white/20 text-white border border-white/20 py-0.5 px-2`}>
            {ROLE_LABEL[user.role]}
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-3">
          <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${roleGrad} text-[12px] font-extrabold text-white shadow-[0_4px_12px_rgba(11,93,59,0.25)]`}>
            {initials(user.name)}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-y px-2 pt-3 pb-2">
        {sections.map((sec) => (
          <div key={sec.section} className="mb-4 last:mb-0">
            {!collapsed && (
              <p className="mb-1 px-3 text-[9.5px] font-bold uppercase tracking-[0.22em] text-muted/50">
                {sec.section}
              </p>
            )}
            {collapsed && <div className="mx-3 mb-2 h-px bg-[rgba(20,20,25,0.07)]" />}
            <div className="space-y-0.5">
              {sec.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to.endsWith('/dashboard')}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => clsx(
                    'group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-150',
                    collapsed && 'justify-center px-2.5',
                    isActive
                      ? `bg-gradient-to-r ${roleGrad} text-white shadow-[0_3px_12px_rgba(11,93,59,0.22)]`
                      : 'text-[#55545e] hover:bg-[rgba(20,20,25,0.055)] hover:text-ink',
                  )}
                  title={collapsed ? it.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <it.icon
                        size={16}
                        className={clsx('shrink-0 transition-colors', isActive ? 'text-white' : 'text-muted/80 group-hover:text-forest')}
                      />
                      {!collapsed && (
                        <>
                          <span className="truncate flex-1">{it.label}</span>
                          {isActive && <ChevronRight size={12} className="text-white/60 ml-auto shrink-0" />}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: sign out */}
      <div className="border-t border-[rgba(20,20,25,0.06)] px-2 py-2.5">
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className={clsx(
            'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-muted transition-all hover:bg-reject/8 hover:text-reject',
            collapsed && 'justify-center',
          )}
        >
          <LogOut size={15} className="shrink-0 transition-colors group-hover:text-reject" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: '#EEF1EC' }}>
      {/* Desktop sidebar */}
      <aside className={clsx(
        'hidden lg:flex flex-col sticky top-0 h-screen z-40 border-r border-[rgba(20,20,25,0.07)] shadow-[2px_0_12px_rgba(20,20,25,0.04)] transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[252px]',
      )}>
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="fixed inset-y-0 left-0 z-40 w-[252px] lg:hidden shadow-2xl border-r border-[rgba(20,20,25,0.07)]"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-xl bg-white text-ink shadow-soft"
              >
                <X size={15} />
              </button>
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 px-3 pt-3 pb-2 lg:px-5 lg:pt-4 lg:pb-2">
          <div className="glass-premium flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-[0_2px_16px_rgba(20,20,25,0.07)]">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[rgba(20,20,25,0.10)] bg-white text-ink transition hover:bg-bg lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>

            {/* Breadcrumb / page title area */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold text-ink leading-tight">{user.name}</p>
              <p className="hidden text-[11px] text-muted sm:block font-medium">OnionSure · {ROLE_LABEL[user.role]}</p>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button
                className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[rgba(20,20,25,0.10)] bg-white text-muted transition hover:bg-bg hover:text-ink"
                aria-label="Notifications"
              >
                <Bell size={15} />
                <span className="absolute right-[7px] top-[7px] h-2 w-2 rounded-full bg-reject border-2 border-white" />
              </button>

              <div className={clsx(
                'hidden sm:flex items-center gap-2 rounded-xl border border-[rgba(20,20,25,0.08)] bg-white px-3 py-1.5',
              )}>
                <div className={`grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br ${roleGrad} text-[10px] font-extrabold text-white`}>
                  {user.name.charAt(0)}
                </div>
                <span className="text-[12px] font-semibold text-ink">{ROLE_LABEL[user.role]}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 md:p-5 lg:p-6">
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
  if (!ready || loading) return (
    <div className="grid h-screen place-items-center bg-[#EEF1EC]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-forest/20 border-t-forest" />
        <p className="text-sm font-semibold text-muted">Loading…</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  const seg = '/' + (location.pathname.split('/')[1] || '');
  const REQUIRED: Record<string, string> = { '/admin':'admin', '/fpo':'fpo', '/farmer':'farmer', '/buyer':'buyer' };
  const required = REQUIRED[seg];
  if (required && user.role !== required) return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  return <>{children}</>;
}
