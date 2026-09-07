import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ActionLink, Reveal } from './primitives';

export default function CTA() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden bg-[#072D1E] py-28 sm:py-32 lg:py-40">
      {/* background image */}
      <div className="absolute inset-0 -z-10">
        <motion.img
          src="/onions/hero-batch-red.jpg"
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-[0.18]"
          initial={{ scale: 1 }}
          animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#072D1E]/98 via-[#0B5D3B]/85 to-[#072D1E]/98" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(63,174,90,0.18),transparent_68%)]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(rgba(63,174,90,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px' }} aria-hidden />
        <div className="absolute inset-0 opacity-[0.06]" aria-hidden>
          <div className="h-full w-full" style={{ backgroundImage: 'linear-gradient(rgba(63,174,90,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(63,174,90,.9) 1px,transparent 1px)', backgroundSize: '70px 70px' }} />
          <motion.div className="absolute inset-x-0 h-[42%] bg-gradient-to-b from-transparent via-fresh/25 to-transparent" initial={{ y: '-45%' }} animate={reduce ? { y: 0 } : { y: ['-45%', '240%'] }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }} />
        </div>
        <div className="grain absolute inset-0" />
      </div>

      {/* glowing orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-fresh/10 blur-[80px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 right-1/4 h-72 w-72 rounded-full bg-forest/30 blur-[60px]" aria-hidden />

      <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="flex flex-col items-center text-center">
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-fresh/25 bg-fresh/10 px-4 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-fresh animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-fresh">AI-Powered Quality Intelligence</span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="mx-auto max-w-3xl text-[36px] font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[62px]">
              Make Onion Quality{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-fresh">Measurable.</span>
                <span className="absolute inset-x-0 -bottom-1 h-[3px] rounded-full bg-gradient-to-r from-fresh/0 via-fresh to-fresh/0" />
              </span>
            </h2>
          </Reveal>

          <Reveal delay={0.18}>
            <p className="mx-auto mt-7 max-w-lg text-[17px] leading-relaxed text-emerald-100/65 sm:text-lg">
              See the defect.{' '}
              <span className="text-emerald-100/80">Sense the hidden risk.</span>{' '}
              <span className="text-white font-semibold">Grade with evidence.</span>
            </p>
          </Reveal>

          <Reveal delay={0.28}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <ActionLink href="/login" variant="primary" arrow>Start Quality Inspection</ActionLink>
              <ActionLink href="/demo" variant="ghostDark">View Demo</ActionLink>
            </div>
          </Reveal>

          <Reveal delay={0.38}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
              {['AI + IoT Fusion', 'QR-Verifiable Reports', 'No Manual Bias'].map((badge) => (
                <div key={badge} className="flex items-center gap-2 text-emerald-100/45">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 13l4 4L19 7" stroke="#3FAE5A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[12.5px] font-medium tracking-wide">{badge}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
