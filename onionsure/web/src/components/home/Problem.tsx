import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Reveal, SectionHeading } from './primitives';

/* ---------- Card 01 — two inspectors, two answers ---------- */
function SubjectiveVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { who: 'Inspector A', grade: 'A', tone: 'border-fresh/40 bg-fresh/10', text: 'text-forest' },
        { who: 'Inspector B', grade: 'B', tone: 'border-amber/40 bg-amber/10', text: 'text-amber-700' },
      ].map((s, i) => (
        <motion.div
          key={s.who}
          className={`rounded-xl border p-3 ${s.tone}`}
          initial={{ opacity: 0, x: reduce ? 0 : i === 0 ? -12 : 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: i * 0.15 }}
        >
          <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-emerald-800/55">{s.who}</div>
          <div className={`mt-1.5 font-mono text-2xl font-extrabold leading-none ${s.text}`}>{s.grade}</div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-emerald-900/10">
            <motion.div
              className={`h-full rounded-full ${i === 0 ? 'bg-fresh' : 'bg-amber'}`}
              initial={{ width: 0 }}
              whileInView={{ width: i === 0 ? '88%' : '64%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.3 + i * 0.15 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Card 02 — looks fine on the surface ---------- */
function HiddenSpoilageVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-emerald-950">
      <div className="absolute inset-0 grid place-items-center" aria-hidden>
        {[0, 1, 2].map((r) => (
          <motion.span
            key={r}
            className="absolute rounded-full border border-amber/30"
            style={{ width: `${42 + r * 26}%`, aspectRatio: '1' }}
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={reduce ? { opacity: 0.35, scale: 1 } : { opacity: [0, 0.45, 0], scale: [0.7, 1.25, 1.25] }}
            viewport={{ once: true }}
            transition={{ duration: 2.6, delay: r * 0.55, repeat: Infinity, repeatDelay: 0.35, ease: 'easeOut' }}
          />
        ))}
      </div>
      <img src="/onions/healthy-extra.jpg" alt="Onion that appears healthy on the surface" loading="lazy" decoding="async" className="relative mx-auto h-full w-full object-cover opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-emerald-950/10 to-transparent" />
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
        <span className="rounded-md bg-white/12 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/80 backdrop-blur">Surface: clean</span>
        <span className="flex items-center gap-1.5 rounded-md bg-amber/20 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200 backdrop-blur">
          <motion.span className="h-1.5 w-1.5 rounded-full bg-amber" animate={reduce ? undefined : { opacity: [1, 0.25, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          Gas signal: elevated
        </span>
      </div>
    </div>
  );
}

/* ---------- Card 03 — paper → digital ---------- */
function NoEvidenceVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[46%] shrink-0 rounded-lg border border-dashed border-emerald-900/25 bg-white/70 p-2.5">
        <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-800/50">Paper Record</div>
        <div className="space-y-1.5">{[80, 62, 74, 50].map((w, i) => <div key={i} className="h-1.5 rounded-full bg-emerald-900/12" style={{ width: `${w}%` }} />)}</div>
        <div className="mt-2 text-[9px] italic text-emerald-800/40">handwritten, unverifiable</div>
      </div>
      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="relative h-px w-full overflow-hidden bg-emerald-900/15">
          <motion.div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-fresh to-transparent" initial={{ x: '-100%' }} whileInView={reduce ? { x: 0 } : { x: '300%' }} viewport={{ once: true }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.5, ease: 'easeInOut' }} />
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-fresh" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div className="w-[46%] shrink-0 rounded-lg border border-fresh/30 bg-gradient-to-br from-fresh/12 to-white p-2.5 shadow-soft">
        <div className="mb-1.5 flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[0.12em] text-forest">Digital</span><span className="h-1.5 w-1.5 rounded-full bg-fresh" /></div>
        <div className="space-y-1.5">{[88, 70, 80, 58].map((w, i) => <motion.div key={i} className="h-1.5 rounded-full bg-fresh/45" initial={{ width: 0 }} whileInView={{ width: `${w}%` }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.5 + i * 0.1 }} />)}</div>
        <div className="mt-2 text-[9px] font-medium text-forest/70">timestamped + verifiable</div>
      </div>
    </div>
  );
}

const CARDS = [
  { n: '01', title: 'Subjective Grading', body: 'Different inspectors can evaluate the same onion batch differently.', Visual: SubjectiveVisual, topStrip: 'from-fresh/0 via-fresh to-fresh/0', numColor: 'text-fresh', hoverBorder: 'hover:border-fresh/40', hoverShadow: 'hover:shadow-[0_24px_56px_-16px_rgba(27,120,60,0.22)]' },
  { n: '02', title: 'Hidden Spoilage', body: 'Some quality risks may not be visible from the surface.', Visual: HiddenSpoilageVisual, topStrip: 'from-amber/0 via-amber to-amber/0', numColor: 'text-amber-500', hoverBorder: 'hover:border-amber/40', hoverShadow: 'hover:shadow-[0_24px_56px_-16px_rgba(180,120,10,0.18)]' },
  { n: '03', title: 'No Digital Evidence', body: 'Manual records make verification and dispute resolution difficult.', Visual: NoEvidenceVisual, topStrip: 'from-reject/0 via-reject to-reject/0', numColor: 'text-reject', hoverBorder: 'hover:border-reject/35', hoverShadow: 'hover:shadow-[0_24px_56px_-16px_rgba(180,40,40,0.18)]' },
];

export default function Problem() {
  return (
    <section className="bg-[#FAF8F2] py-20 sm:py-24 lg:py-32" id="problem">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="The Problem"
            title="Onion Grading Shouldn't Depend on Opinion."
            sub="Manual grading can vary between inspectors and procurement centers. Visible defects may not reveal early spoilage, while paper-based records make quality decisions difficult to verify."
          />
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3 lg:gap-8">
          {CARDS.map(({ n, title, body, Visual, topStrip, numColor, hoverBorder, hoverShadow }, i) => (
            <Reveal key={n} delay={i * 0.12}>
              <article className={`group relative h-full overflow-hidden rounded-2xl border border-emerald-900/[0.08] bg-white transition-all duration-300 hover:-translate-y-2 ${hoverBorder} ${hoverShadow}`}
                style={{ boxShadow: '0 1px 2px rgba(20,20,25,0.04), 0 10px 30px rgba(20,20,25,0.05)' }}>
                {/* colored top strip */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${topStrip} opacity-70`} />

                <div className="p-7">
                  {/* ghost number + label */}
                  <div className="flex items-start justify-between mb-4">
                    <span className={`font-mono text-[56px] font-extrabold leading-none tracking-tight ${numColor} opacity-10 select-none`}>{n}</span>
                    <span className={`mt-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${numColor} border-current/20 bg-current/5`}>
                      Problem {n}
                    </span>
                  </div>

                  <div className="h-px bg-emerald-900/[0.07] mb-5" />

                  <h3 className="text-[17px] font-extrabold uppercase tracking-[0.05em] text-emerald-950 leading-tight">{title}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-emerald-800/65">{body}</p>

                  <div className="mt-6"><Visual /></div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
