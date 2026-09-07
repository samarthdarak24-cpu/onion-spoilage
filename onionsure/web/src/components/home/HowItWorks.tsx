import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ClipboardList, Boxes, ScanLine, Cpu, BadgeCheck } from 'lucide-react';
import { Reveal, SectionHeading } from './primitives';

const STEPS = [
  { n: '01', title: 'Register Lot', desc: 'Farmer / FPO + lot details', Icon: ClipboardList },
  { n: '02', title: 'Collect Sample', desc: 'Representative onion sample', Icon: Boxes },
  { n: '03', title: 'Inspect', desc: 'Camera + IoT sensing', Icon: ScanLine },
  { n: '04', title: 'AI Fusion', desc: 'Vision + gas + environment', Icon: Cpu },
  { n: '05', title: 'Digital Grade', desc: 'Grade A / URS / Rejected', Icon: BadgeCheck },
];

export default function HowItWorks() {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start 85%', 'end 55%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.001 });
  const railWidth = useTransform(progress, [0, 1], ['0%', '100%']);

  return (
    <section className="bg-white py-20 sm:py-24 lg:py-28" id="how">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="How It Works"
            title="From Sample to Standardized Grade."
            sub="Five repeatable steps take an onion lot from registration to a verifiable digital grade."
          />
        </Reveal>

        <div ref={trackRef} className="relative mt-16">
          {/* desktop animated rail */}
          <div className="absolute left-0 right-0 top-[36px] hidden lg:block" aria-hidden>
            <div className="h-0.5 w-full bg-emerald-900/8 rounded-full" />
            <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-fresh/60 via-fresh to-fresh/60" style={{ width: railWidth }} />
          </div>

          {/* mobile vertical rail */}
          <div className="absolute bottom-0 left-[35px] top-0 w-0.5 rounded-full bg-emerald-900/8 lg:hidden" aria-hidden>
            <motion.div className="absolute inset-x-0 top-0 rounded-full bg-gradient-to-b from-fresh to-fresh/40" initial={{ height: 0 }} whileInView={{ height: '100%' }} viewport={{ once: true }} transition={{ duration: 1.6, ease: 'easeOut' }} />
          </div>

          <ol className="relative grid gap-6 lg:grid-cols-5 lg:gap-4">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.n}
                className="group relative"
                initial={{ opacity: 0, y: reduce ? 0 : 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* mobile */}
                <div className="flex items-start gap-5 lg:hidden">
                  <div className="relative shrink-0 mt-0.5">
                    <div className="grid h-[70px] w-[70px] place-items-center rounded-2xl border-2 border-fresh/30 bg-white shadow-card">
                      <s.Icon size={26} className="text-forest" strokeWidth={1.7} />
                    </div>
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-forest text-[9px] font-extrabold text-white shadow-sm">
                      {i + 1}
                    </span>
                  </div>
                  <div className="pt-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-fresh">Step {s.n}</div>
                    <h3 className="mt-1 text-[15px] font-extrabold tracking-tight text-emerald-950">{s.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-emerald-800/60">{s.desc}</p>
                  </div>
                </div>

                {/* desktop */}
                <div className="hidden lg:flex lg:flex-col lg:items-center lg:text-center">
                  <div className="relative">
                    <motion.div
                      className="grid h-[72px] w-[72px] place-items-center rounded-2xl border-2 border-fresh/25 bg-white shadow-card transition-all duration-300 group-hover:-translate-y-2 group-hover:border-fresh group-hover:shadow-[0_0_0_8px_rgba(63,174,90,0.10)]"
                      whileHover={reduce ? undefined : { scale: 1.06 }}
                    >
                      <s.Icon size={26} className="text-forest transition-transform duration-300 group-hover:scale-110" strokeWidth={1.7} />
                    </motion.div>
                    <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-forest text-[10px] font-extrabold text-white shadow-md ring-2 ring-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="mt-5 px-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-fresh">Step {s.n}</div>
                    <h3 className="mt-2 text-[14px] font-extrabold uppercase tracking-[0.04em] text-emerald-950 leading-tight">{s.title}</h3>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-emerald-800/60 transition-opacity duration-300 opacity-70 group-hover:opacity-100">{s.desc}</p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
