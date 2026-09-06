import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ActionLink, Reveal } from './primitives';

export default function CTA() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden bg-emerald-950 py-24 sm:py-28 lg:py-32">
      {/* ---------- background ---------- */}
      <div className="absolute inset-0 -z-10">
        <motion.img
          src="/onions/hero-batch-red.jpg"
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-[0.22]"
          initial={{ scale: 1 }}
          animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-darkgreen/92 to-emerald-950/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(63,174,90,0.16),transparent_62%)]" />

        {/* animated AI scanning grid */}
        <div className="absolute inset-0 opacity-[0.09]" aria-hidden>
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(63,174,90,.9) 1px,transparent 1px),linear-gradient(90deg,rgba(63,174,90,.9) 1px,transparent 1px)',
              backgroundSize: '70px 70px',
            }}
          />
          <motion.div
            className="absolute inset-x-0 h-[42%] bg-gradient-to-b from-transparent via-fresh/25 to-transparent"
            initial={{ y: '-45%' }}
            animate={reduce ? { y: 0 } : { y: ['-45%', '240%'] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div className="grain absolute inset-0" />
      </div>

      <div className="relative mx-auto max-w-[1240px] px-5 text-center sm:px-8">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-[32px] font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[56px]">
            Make Onion Quality Measurable.
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-emerald-100/70 sm:text-lg">
            See the defect.
            <br className="sm:hidden" />{' '}
            <span className="hidden sm:inline"> </span>
            Sense the hidden risk.
            <br className="sm:hidden" />{' '}
            <span className="hidden sm:inline"> </span>
            Grade with evidence.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <ActionLink href="/login" variant="primary" arrow>Start Quality Inspection</ActionLink>
            <ActionLink href="/demo" variant="ghostDark">View Demo</ActionLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
