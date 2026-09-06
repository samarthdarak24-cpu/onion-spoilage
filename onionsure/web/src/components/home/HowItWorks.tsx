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

  // Desktop rail draws itself as the section scrolls through the viewport.
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start 85%', 'end 55%'],
  });
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

        <div ref={trackRef} className="relative mt-14">
          {/* ---------- desktop rail ---------- */}
          <div className="absolute left-0 right-0 top-[26px] hidden lg:block" aria-hidden>
            <div className="h-px w-full bg-emerald-900/10" />
            <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-fresh/40 via-fresh to-fresh/40" style={{ width: railWidth }} />
          </div>

          {/* ---------- mobile vertical rail ---------- */}
          <div className="absolute bottom-0 left-[26px] top-0 w-px bg-emerald-900/10 lg:hidden" aria-hidden />

          <ol className="relative grid gap-8 lg:grid-cols-5 lg:gap-4">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.n}
                className="group relative pl-16 lg:pl-0"
                initial={{ opacity: 0, y: reduce ? 0 : 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* mobile node */}
                <div className="absolute left-0 top-0 lg:hidden">
                  <div className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-fresh/35 bg-white">
                    <s.Icon size={20} className="text-forest" strokeWidth={1.9} />
                  </div>
                </div>

                <div className="lg:pt-0">
                  {/* desktop node */}
                  <div className="hidden lg:block">
                    <motion.div
                      className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-fresh/30 bg-white shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:border-fresh group-hover:shadow-[0_0_0_6px_rgba(63,174,90,0.10)]"
                      whileHover={reduce ? undefined : { scale: 1.08 }}
                    >
                      <s.Icon size={20} className="text-forest transition-transform duration-300 group-hover:scale-110" strokeWidth={1.9} />
                    </motion.div>
                  </div>

                  <div className="font-mono text-[11px] font-bold tracking-widest text-fresh">STEP {s.n}</div>
                  <h3 className="mt-2 text-[15px] font-extrabold uppercase tracking-[0.04em] text-emerald-950">{s.title}</h3>
                  <p className="mt-1.5 max-w-[190px] text-[13px] leading-relaxed text-emerald-800/60 opacity-100 transition-opacity duration-300 lg:opacity-70 lg:group-hover:opacity-100">
                    {s.desc}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
