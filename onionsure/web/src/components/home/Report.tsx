import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Check, ShieldCheck } from 'lucide-react';
import { ActionLink, Reveal, SectionHeading } from './primitives';

const BENEFITS = [
  { t: 'Traceable', d: 'Every lot links back to farmer, center and timestamp.' },
  { t: 'Explainable', d: 'See the vision, gas and environment inputs behind the grade.' },
  { t: 'Verifiable', d: 'Anyone can scan the QR code and confirm the record.' },
];

const DIST = [
  { label: 'Grade A', pct: 82, color: '#3FAE5A' },
  { label: 'URS', pct: 13, color: '#F4B942' },
  { label: 'Rejected', pct: 5, color: '#D9534F' },
];

const SIGNALS = [
  { k: 'Vision', v: 94 },
  { k: 'Gas', v: 76 },
  { k: 'Environment', v: 91 },
];

function ReportMockup() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative mx-auto w-full max-w-[440px]"
      initial={{ opacity: 0, y: reduce ? 0 : 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* stacked paper effect */}
      <div className="absolute inset-x-4 -bottom-2 top-3 rounded-2xl bg-emerald-900/[0.06]" aria-hidden />
      <div className="absolute inset-x-2 -bottom-1 top-1.5 rounded-2xl bg-emerald-900/[0.05]" aria-hidden />

      <article className="relative overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-[0_30px_70px_-24px_rgba(6,69,44,0.35)]">
        {/* letterhead */}
        <header className="flex items-center justify-between border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 to-darkgreen px-6 py-4">
          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-white">
              Onion<span className="text-fresh">Sure</span>
            </div>
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-emerald-200/60">Quality Intelligence</div>
          </div>
          <div className="text-right">
            <div className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-emerald-200/50">Document</div>
            <div className="text-[11px] font-bold text-white">Digital Quality Report</div>
          </div>
        </header>

        {/* lot + score */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <div className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-emerald-800/45">Lot ID</div>
            <div className="mt-0.5 font-mono text-[13px] font-bold text-emerald-950">ON-2026-00421</div>
          </div>
          <div className="text-right">
            <div className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-emerald-800/45">Quality Score</div>
            <div className="mt-0.5 font-mono text-[22px] font-extrabold leading-none text-emerald-950">
              87<span className="text-[12px] font-medium text-emerald-900/30"> / 100</span>
            </div>
          </div>
        </div>

        <div className="px-6 pt-3">
          <span className="inline-block rounded-lg bg-fresh px-3.5 py-1.5 text-[11px] font-extrabold tracking-wide text-emerald-950">
            GRADE A
          </span>
        </div>

        {/* grade distribution */}
        <div className="px-6 pt-5">
          <div className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-emerald-800/45">Grade Distribution</div>
          <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-emerald-900/[0.07]">
            {DIST.map((d, i) => (
              <motion.div
                key={d.label}
                className="h-full"
                style={{ background: d.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${d.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.35 + i * 0.15 }}
              />
            ))}
          </div>
          <div className="mt-2.5 flex justify-between">
            {DIST.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />
                <span className="text-[10px] font-semibold text-emerald-900/70">{d.label}</span>
                <span className="font-mono text-[10px] font-bold text-emerald-950">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* signal breakdown */}
        <div className="mt-5 grid grid-cols-3 gap-2 px-6">
          {SIGNALS.map((s) => (
            <div key={s.k} className="rounded-lg bg-emerald-50/80 px-2 py-2.5 text-center">
              <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-800/50">{s.k}</div>
              <div className="mt-0.5 font-mono text-[15px] font-extrabold text-emerald-950">{s.v}</div>
            </div>
          ))}
        </div>

        {/* meta */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 border-t border-emerald-900/[0.08] px-6 py-4">
          <div>
            <div className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-emerald-800/45">Inspection Date</div>
            <div className="mt-0.5 text-[12px] font-semibold text-emerald-950">03 Sep 2026</div>
          </div>
          <div>
            <div className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-emerald-800/45">Procurement Center</div>
            <div className="mt-0.5 text-[12px] font-semibold text-emerald-950">Pune #03</div>
          </div>
        </div>

        {/* QR + verification */}
        <div className="flex items-center justify-between gap-4 border-t border-emerald-900/[0.08] bg-emerald-50/40 px-6 py-4">
          <div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-forest" strokeWidth={2.4} />
              <span className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-forest">Verified Inspection</span>
            </div>
            <div className="mt-1.5 font-mono text-[9px] text-emerald-800/45">SHA-256 · 9f4c…a82e</div>
          </div>

          <div className="relative shrink-0 rounded-lg bg-white p-1.5 shadow-soft">
            <QRCodeSVG
              value="https://onionsure.in/verify/ON-2026-00421"
              size={58}
              bgColor="#ffffff"
              fgColor="#06452C"
              level="M"
            />
            {/* QR scan sweep */}
            <div className="pointer-events-none absolute inset-1.5 overflow-hidden rounded" aria-hidden>
              <motion.div
                className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-fresh/45 to-transparent"
                initial={{ y: '-100%' }}
                whileInView={reduce ? { y: 0 } : { y: ['-100%', '300%'] }}
                viewport={{ once: true }}
                transition={{ duration: 2.1, repeat: Infinity, repeatDelay: 1.1, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </div>
      </article>
    </motion.div>
  );
}

export default function Report() {
  return (
    <section className="bg-[#F4F4F1] py-20 sm:py-24 lg:py-28" id="reports">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <SectionHeading eyebrow="Digital Quality Report" title="Every Inspection Ends With Evidence." />
        </Reveal>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* mobile: report first, then copy */}
          <div className="order-1 lg:order-1">
            <ReportMockup />
          </div>

          <div className="order-2 lg:order-2">
            <Reveal delay={0.1}>
              <p className="text-[17px] leading-relaxed text-emerald-900/75 sm:text-lg">
                Every inspection creates a timestamped digital record that can be reviewed,
                shared and verified.
              </p>
            </Reveal>

            <ul className="mt-8 space-y-3.5">
              {BENEFITS.map((b, i) => (
                <Reveal key={b.t} delay={0.16 + i * 0.08}>
                  <li className="flex gap-3.5 rounded-xl border border-emerald-900/[0.07] bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-fresh/30 hover:shadow-soft">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fresh/15">
                      <Check size={13} className="text-forest" strokeWidth={3} />
                    </span>
                    <div>
                      <div className="text-[14px] font-extrabold text-emerald-950">{b.t}</div>
                      <div className="mt-0.5 text-[13px] leading-relaxed text-emerald-800/60">{b.d}</div>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={0.4}>
              <div className="mt-9 flex flex-wrap gap-3">
                <ActionLink href="/demo" variant="primary" arrow>View Sample Report</ActionLink>
                <ActionLink href="/verify" variant="ghostLight">Verify a Lot</ActionLink>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
