import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo } from '../Brand';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/ai-inspection', label: 'AI Inspection' },
  { href: '/reports', label: 'Quality Reports' },
  { href: '/farmers', label: 'For Farmers' },
  { href: '/fpos', label: 'For FPOs' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { pathname } = useLocation();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-all duration-500 overflow-hidden',
          scrolled
            ? 'border-b border-white/20 bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/95 backdrop-blur-2xl backdrop-saturate-200 shadow-[0_12px_40px_rgba(0,0,0,0.6)]'
            : 'border-b border-white/15 bg-gradient-to-r from-emerald-950/80 via-emerald-900/70 to-emerald-950/80 backdrop-blur-xl',
        ].join(' ')}
      >
        {/* Pearly animated glowing aura sweeping continuously across top header */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/4 h-36 w-1/2 rounded-full bg-gradient-to-r from-fresh/35 via-emerald-200/30 to-fresh/35 blur-[50px] opacity-90"
          animate={{ x: [-160, 160, -160] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Shimmer line on bottom border */}
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-fresh/50 to-transparent" />

        <nav className="w-full flex h-[74px] items-center justify-between px-6 sm:px-10 lg:px-14 xl:px-16 relative z-10" aria-label="Primary">
          {/* LEFT: OnionSure Brand Logo */}
          <Link to="/" className="shrink-0 transition-transform duration-300 hover:scale-105" aria-label="OnionSure home">
            <Logo tone="light" />
          </Link>

          {/* MIDDLE: Navigation links from Home to For FPOs */}
          <ul className="hidden items-center gap-1 xl:gap-2 lg:flex">
            {NAV_LINKS.map((l) => {
              const active = isActive(l.href);
              return (
                <li key={l.href}>
                  <Link
                    to={l.href}
                    className={[
                      'group relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-300',
                      active
                        ? 'bg-gradient-to-r from-fresh/35 to-emerald-400/20 text-white shadow-[0_0_20px_rgba(63,174,90,0.45)] border border-fresh/50'
                        : 'text-white/80 hover:text-white hover:bg-white/15 hover:border-white/25 hover:shadow-[0_0_14px_rgba(255,255,255,0.2)] border border-transparent',
                    ].join(' ')}
                  >
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-fresh animate-pulse" />
                    )}
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* RIGHT: Sign In and Start Inspection buttons */}
          <div className="hidden items-center gap-3.5 lg:flex">
            <Link
              to="/login"
              className="rounded-xl border border-white/25 bg-white/12 px-4.5 py-2 text-[13px] font-bold text-white backdrop-blur-md shadow-soft transition-all duration-300 hover:bg-white/25 hover:border-white/50 hover:shadow-[0_0_18px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-fresh via-[#4FBE6A] to-emerald-300 px-5 py-2 text-[13px] font-black text-emerald-950 shadow-[0_4px_22px_rgba(63,174,90,0.55)] transition-all duration-300 hover:shadow-[0_6px_30px_rgba(63,174,90,0.85)] hover:scale-105 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Inspection
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu size={19} />
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

            <motion.div
              className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col border-l border-white/10 bg-emerald-950 shadow-2xl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <Logo tone="light" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 text-white/80"
                  aria-label="Close menu"
                >
                  <X size={17} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Mobile">
                <ul className="space-y-1">
                  {NAV_LINKS.map((l, i) => (
                    <motion.li
                      key={l.href}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 + i * 0.05, duration: 0.32 }}
                    >
                      <Link
                        to={l.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-xl px-3 py-3 text-[15px] font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {l.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              <div className="space-y-2.5 border-t border-white/10 px-5 py-5">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl border border-white/20 py-3 text-center text-sm font-semibold text-white"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl bg-fresh py-3 text-center text-sm font-bold text-emerald-950"
                >
                  Start Inspection →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
