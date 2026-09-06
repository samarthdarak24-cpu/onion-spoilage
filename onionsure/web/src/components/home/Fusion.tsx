import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Cpu, Wind, Thermometer } from 'lucide-react';
import { CountUp, Reveal, SectionHeading } from './primitives';

const INPUTS = [
  { label: 'Computer Vision', score: 94, Icon: Cpu, tint: 'from-fresh/15 to-fresh/[0.03]', border: 'border-fresh/30', text: 'text-forest' },
  { label: 'Gas Signal', score: 76, Icon: Wind, tint: 'from-amber/15 to-amber/[0.03]', border: 'border-amber/30', text: 'text-amber-700' },
  { label: 'Environment', score: 91, Icon: Thermometer, tint: 'from-sky-400/15 to-sky-400/[0.03]', border: 'border-sky-300/40', text: 'text-sky-700' },
];

/** Vertical connector that draws itself downward when scrolled into view. */
function Connector({ delay = 0, label }: { delay?: number; label?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-9 w-px overflow-visible bg-emerald-900/12 sm:h-11">
        <motion.div
          className="absolute inset-x-0 top-0 bg-gradient-to-b from-fresh/0 via-fresh to-fresh/0"
          initial={{ height: reduce ? '100%' : '0%' }}
          whileInView={{ height: '100%' }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, delay }}
        />
        <motion.div
          className="absolute -left-[3px] h-1.5 w-1.5 rounded-full bg-fresh"
          initial={{ top: 0, opacity: 0 }}
          whileInView={{ top: '100%', opacity: [0, 1, 0] }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.9, delay, ease: 'easeInOut' }}
        />
      </div>
      {label && <span className="mb-1 font-mono text-[9px] uppercase tracking-widest text-emerald-700/45">{label}</span>}
    </div>
  );
}

export default function Fusion() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[#FAF8F2] py-20 sm:py-24 lg:py-28" id="fusion">
      <div className="pointer-events-none absolute inset-0 opacity-[0.045]" style={{ backgroundImage: 'linear-gradient(#06452C 1px,transparent 1px),linear-gradient(90deg,#06452C 1px,transparent 1px)', backgroundSize: '64px 64px' }} aria-hidden />

      <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="AI Fusion"
            align="center"
            title={<>From Multiple Signals<br />to One Trusted Grade.</>}
          />
        </Reveal>

        {/* ---------- pipeline ---------- */}
        <div className="mt-14 flex flex-col items-center">
          {/* three inputs */}
          <div className="grid w-full gap-4 sm:grid-cols-3 lg:gap-6">
            {INPUTS.map((inp, i) => (
              <motion.div
                key={inp.label}
                initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={`rounded-2xl border bg-gradient-to-br p-5 text-center shadow-soft ${inp.border} ${inp.tint}`}>
                  <div className="flex items-center justify-center gap-2">
                    <inp.Icon size={15} className={inp.text} strokeWidth={2.2} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-900/60">{inp.label}</span>
                  </div>
                  <div className={`mt-3 font-mono text-[30px] font-extrabold leading-none ${inp.text}`}>
                    <CountUp value={inp.score} duration={1300} />
                    <span className="text-[13px] font-medium text-emerald-900/30"> / 100</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <Connector delay={0.7} />

          {/* fusion engine */}
          <motion.div
            className="w-full max-w-lg rounded-2xl border border-emerald-900/10 bg-emerald-950 px-6 py-5 text-center shadow-[0_20px_50px_-20px_rgba(6,69,44,0.6)]"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-center gap-2">
              {reduce ? null : (
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-fresh"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-fresh">AI Fusion Engine</span>
            </div>
            <p className="mx-auto mt-2.5 max-w-sm text-[12.5px] leading-relaxed text-emerald-100/60">
              Weighted combination of vision, gas and environmental signals into a single quality index.
            </p>
          </motion.div>

          <Connector delay={1.15} />

          {/* final score */}
          <motion.div
            className="w-full max-w-xl rounded-3xl border border-emerald-900/10 bg-white p-7 text-center shadow-[0_24px_60px_-24px_rgba(6,69,44,0.28)]"
            initial={{ opacity: 0, y: reduce ? 0 : 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 1.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-800/50">Final Quality Score</div>
            <div className="mt-2 font-mono text-[56px] font-extrabold leading-none text-emerald-950 sm:text-[64px]">
              <CountUp value={87} duration={1700} />
              <span className="text-xl font-medium text-emerald-900/25"> / 100</span>
            </div>
            <motion.div
              className="mt-5 inline-block rounded-xl bg-fresh px-6 py-2.5 text-sm font-extrabold tracking-wide text-emerald-950 shadow-[0_10px_28px_-10px_rgba(63,174,90,0.8)]"
              initial={{ opacity: 0, scale: reduce ? 1 : 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 1.9, ease: [0.22, 1, 0.36, 1] }}
            >
              GRADE A
            </motion.div>
          </motion.div>
        </div>

        {/* ---------- why fusion ---------- */}
        <Reveal delay={0.1}>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-emerald-900/[0.08] bg-white/70 p-6 sm:p-7">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-fresh">Why Fusion?</div>
            <p className="mt-2.5 text-[14.5px] leading-relaxed text-emerald-900/70">
              Visual inspection identifies visible defects. Sensor signals provide additional evidence
              about environmental and spoilage risk. Combining both produces a more consistent grade
              than either signal alone.
            </p>
            <p className="mt-3 text-[11.5px] italic leading-relaxed text-emerald-800/45">
              Sensor readings are supporting evidence, not a standalone determination of internal
              spoilage unless validated against model data for the deployed configuration.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
