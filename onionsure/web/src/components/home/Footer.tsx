import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../Brand';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'AI Inspection', to: '/ai-inspection' },
      { label: 'IoT Monitoring', to: '/iot' },
      { label: 'Quality Reports', to: '/reports' },
      { label: 'QR Verification', to: '/verify' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Farmers', to: '/farmers' },
      { label: 'FPOs', to: '/fpos' },
      { label: 'Procurement Centers', to: '/procurement-centers' },
      { label: 'Buyers', to: '/buyers' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'How It Works', to: '/how-it-works' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-emerald-950">
      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_2.5fr] lg:gap-8">
          {/* brand */}
          <div>
            <Logo tone="light" />
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-emerald-100/55">
              AI + IoT + Computer Vision for onion quality assessment, grading and transparent
              digital procurement.
            </p>
          </div>

          {/* columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-fresh">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="text-[13px] text-emerald-100/60 transition-colors hover:text-white"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-white/[0.08] pt-7">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[12px] text-emerald-100/40">© 2026 OnionSure</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100/30">
              Quality Intelligence
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
