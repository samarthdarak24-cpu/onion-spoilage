import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ClipboardList, Boxes, ScanLine, Cpu, Brain, Cpu as CpuIcon, ShieldCheck, Award, BarChart3 } from 'lucide-react';
import Nav from '../components/home/Nav';
import Footer from '../components/home/Footer';
import HowItWorks from '../components/home/HowItWorks';
import { ActionLink, CountUp, DetectBox, Reveal } from '../components/home/primitives';

type Entry = {
  eyebrow: string;
  title: string;
  intro: string;
  points: { t: string; d: string }[];
  image?: string;
  imageAlt?: string;
  cta?: { label: string; href: string };
};

const CONTENT: Record<string, Entry> = {
  'how-it-works': {
    eyebrow: 'Process',
    title: 'How It Works',
    intro: 'From lot registration to QR-verifiable certificate — a simple 5-step quality assessment workflow powered by AI and IoT.',
    points: [
      { t: '1. Register Lot', d: 'Enter farmer details, crop variety, quantity and procurement center.' },
      { t: '2. Capture Sample', d: 'High-res sample photographs analyzed via Roboflow YOLO computer vision.' },
      { t: '3. Sensor Pod Sync', d: 'IoT environmental and gas sensor stream detects hidden internal spoilage.' },
      { t: '4. Multimodal Fusion', d: 'AI fuses Vision + Gas + Env data into a weighted quality score and grade.' },
    ],
    cta: { label: 'Start Quality Inspection', href: '/login' },
  },
  'ai-inspection': {
    eyebrow: 'Product',
    title: 'AI Inspection',
    intro: 'Computer vision models detect and classify individual onions in a sample, then roll those detections up into a batch-level quality picture.',
    image: '/onions/spotted-batch.jpg',
    imageAlt: 'Onion batch analysed by the OnionSure computer vision model',
    points: [
      { t: 'Defect detection', d: 'Flags damaged, rotten, sprouted and undersized bulbs with per-detection confidence.' },
      { t: 'Batch summary', d: 'Counts detected onions and breaks them down by class for a consistent view of the lot.' },
      { t: 'Camera flexible', d: 'Works with a phone capture at the gate or a fixed camera at the inspection station.' },
      { t: 'Explainable output', d: 'Every detection is retained, so a grade can be reviewed rather than just asserted.' },
    ],
  },
  iot: {
    eyebrow: 'Product',
    title: 'IoT Monitoring',
    intro: 'The IoT Quality Pod adds gas and environmental sensing alongside vision, contributing signals that are not available from the image alone.',
    image: '/onions/healthy-cluster.jpg',
    imageAlt: 'Onion sample inside the IoT quality sensing chamber',
    points: [
      { t: 'Gas sensing', d: 'Ethane and methane readings captured inside a sealed chamber during the inspection window.' },
      { t: 'Environment', d: 'Temperature and humidity logged alongside the gas signal for context.' },
      { t: 'Live trend', d: 'Operators watch the signal develop over the sampling window instead of a single point-in-time value.' },
      { t: 'Supporting evidence', d: 'Sensor readings support the grade; they are not a standalone determination of internal spoilage.' },
    ],
  },
  reports: {
    eyebrow: 'Product',
    title: 'Quality Reports',
    intro: 'Every inspection ends with a timestamped digital report that can be reviewed, shared and independently verified.',
    points: [
      { t: 'Grade distribution', d: 'Grade A, URS and rejected percentages for the whole lot.' },
      { t: 'Signal breakdown', d: 'The vision, gas and environment scores that produced the final grade.' },
      { t: 'QR verification', d: 'A QR code on every report resolves to a public verification record.' },
      { t: 'Traceability', d: 'Lot ID, inspection date and procurement center are captured on the document.' },
    ],
    cta: { label: 'View Sample Report', href: '/demo' },
  },
  solutions: {
    eyebrow: 'Solutions',
    title: 'Solutions',
    intro: 'One quality intelligence platform for everyone in the onion supply chain — from the farm gate to the buyer.',
    image: '/onions/hero-batch-white.jpg',
    imageAlt: 'Onion batches prepared for grading',
    points: [
      { t: 'For Farmers', d: 'Consistent, evidence-backed grading at the point of sale.' },
      { t: 'For FPOs', d: 'Standardise quality across every collection center you operate.' },
      { t: 'For Procurement', d: 'A repeatable inspection workflow at every gate.' },
      { t: 'For Buyers', d: 'Verify any lot before it ships with a scannable record.' },
    ],
    cta: { label: 'Start Quality Inspection', href: '/login' },
  },
  farmers: {
    eyebrow: 'Solutions',
    title: 'For Farmers',
    intro: 'Get a consistent, evidence-backed grade at the point of sale instead of a number that changes with whoever is holding the clipboard.',
    image: '/onions/healthy-deep.jpg',
    imageAlt: 'Healthy onion bulbs',
    points: [
      { t: 'Consistent grading', d: 'The same lot is evaluated against the same criteria at every center.' },
      { t: 'Transparent score', d: 'See the defect counts and sensor signals behind the grade you receive.' },
      { t: 'Digital record', d: 'Each inspection is stored as a shareable report tied to your lot ID.' },
      { t: 'Fewer disputes', d: 'A verifiable record makes disagreements easier to resolve.' },
    ],
  },
  fpos: {
    eyebrow: 'Solutions',
    title: 'For FPOs',
    intro: 'Standardise grading across every collection center your federation operates, and track quality over the season.',
    image: '/onions/hero-batch-white.jpg',
    imageAlt: 'Batch of onions collected for grading',
    points: [
      { t: 'Aggregate lots', d: 'Consolidate member lots and view quality across the federation.' },
      { t: 'Standardise centers', d: 'One grading criteria set applied consistently across locations.' },
      { t: 'Track trends', d: 'Compare quality score patterns week over week and by center.' },
      { t: 'Share with buyers', d: 'Send verifiable reports downstream without re-inspection.' },
    ],
  },
  'procurement-centers': {
    eyebrow: 'Solutions',
    title: 'Procurement Centers',
    intro: 'Run a repeatable inspection workflow at the gate: register the lot, capture the sample, inspect, and issue a grade.',
    image: '/onions/damaged-batch.jpg',
    imageAlt: 'Onions showing surface damage during procurement inspection',
    points: [
      { t: 'Repeatable workflow', d: 'Five standard steps from lot registration to digital grade.' },
      { t: 'Operator friendly', d: 'Designed for center staff, not machine learning engineers.' },
      { t: 'Audit ready', d: 'Every inspection is timestamped and retained for review.' },
      { t: 'Live operations', d: 'Real-time sync keeps dashboards current as inspections complete.' },
    ],
  },
  buyers: {
    eyebrow: 'Solutions',
    title: 'For Buyers',
    intro: 'Verify the quality of what you are purchasing before it ships, using a record you can check yourself.',
    image: '/onions/hero-batch-red.jpg',
    imageAlt: 'Graded onion batch ready for dispatch',
    points: [
      { t: 'Verify any lot', d: 'Scan a report QR code to confirm the inspection record is authentic.' },
      { t: 'Consistent criteria', d: 'Grades mean the same thing across centers and suppliers.' },
      { t: 'Signal detail', d: 'Review vision, gas and environment inputs, not just a headline number.' },
      { t: 'Reduced re-inspection', d: 'Trust the upstream record and cut duplicate checks.' },
    ],
  },
  about: {
    eyebrow: 'Company',
    title: 'About OnionSure',
    intro: 'OnionSure builds quality intelligence for the onion supply chain — combining computer vision and IoT sensing so grading decisions are measurable and consistent.',
    points: [
      { t: 'What we do', d: 'AI + IoT + computer vision for onion quality assessment and grading.' },
      { t: 'Why it matters', d: 'Manual grading varies between inspectors and centers; evidence-backed grading does not.' },
      { t: 'How we work', d: 'Sensor readings are treated as supporting evidence, validated against model data.' },
      { t: 'Where we operate', d: 'Built for Indian onion procurement, from farm gate to procurement center.' },
    ],
  },
  contact: {
    eyebrow: 'Company',
    title: 'Contact',
    intro: 'Talk to us about deploying OnionSure at your procurement center, FPO or buying operation.',
    points: [
      { t: 'Deployments', d: 'Pilot an inspection station at one center before scaling.' },
      { t: 'Partnerships', d: 'Work with FPOs and aggregators on standardised grading.' },
      { t: 'Support', d: 'Operator training and ongoing model support.' },
      { t: 'Get started', d: 'Sign in to run your first inspection.' },
    ],
    cta: { label: 'Start Quality Inspection', href: '/login' },
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy',
    intro: 'How OnionSure handles inspection data, lot records and account information.',
    points: [
      { t: 'What we store', d: 'Lot details, inspection results and the images captured during inspection.' },
      { t: 'Why we store it', d: 'To produce the digital quality report and keep it verifiable.' },
      { t: 'Who can see it', d: 'Access follows your role — farmer, FPO, procurement or buyer.' },
      { t: 'Retention', d: 'Inspection records are retained so reports stay verifiable over time.' },
    ],
  },
  terms: {
    eyebrow: 'Legal',
    title: 'Terms',
    intro: 'Terms governing use of the OnionSure platform and the quality grades it produces.',
    points: [
      { t: 'Decision support', d: 'Grades are decision support, not a substitute for contractual quality terms.' },
      { t: 'Sensor evidence', d: 'Gas and environment readings are supporting evidence, not standalone spoilage determinations.' },
      { t: 'Illustrative data', d: 'Demonstration values shown on this site are not measurements of a specific lot.' },
      { t: 'Account use', d: 'Access is per-role and credentials must not be shared.' },
    ],
  },
};

const HOW_ICONS = [ClipboardList, Boxes, ScanLine, Cpu];

/* ── Inline Inspection Card (used on About page) ── */
const ABOUT_TILES = [
  { src: '/onions/healthy-closeup.jpg', alt: 'Healthy onion', boxes: [{ label: 'Healthy', conf: 96, tone: 'healthy' as const, style: { left: '14%', top: '16%', width: '56%', height: '58%' } }] },
  { src: '/onions/damaged-batch.jpg',   alt: 'Damaged onions', boxes: [{ label: 'Damaged', conf: 91, tone: 'damaged' as const, style: { left: '10%', top: '20%', width: '62%', height: '54%' } }] },
  { src: '/onions/moldy-mixed.jpg',     alt: 'Rotten onions', boxes: [{ label: 'Rotten',  conf: 94, tone: 'rotten'  as const, style: { left: '22%', top: '24%', width: '54%', height: '50%' } }] },
  { src: '/onions/healthy-cluster.jpg', alt: 'Healthy cluster', boxes: [{ label: 'Healthy', conf: 93, tone: 'healthy' as const, style: { left: '18%', top: '18%', width: '58%', height: '56%' } }] },
];

function AboutInspectionCard() {
  return (
    <Reveal delay={0.15}>
      <div className="relative lg:sticky lg:top-28">
        {/* ambient glow */}
        <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-fresh/15 blur-3xl" aria-hidden />

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative overflow-hidden rounded-[22px] border border-white/15 bg-[#0B3D28]/90 p-3.5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          {/* header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/50">Live AI Inspection</p>
              <p className="font-mono text-[10px] text-white/35 mt-0.5">ON-2026-00421</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-fresh/35 bg-fresh/12 px-2.5 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fresh opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-fresh" />
              </span>
              <span className="text-[8.5px] font-bold tracking-widest text-fresh">LIVE</span>
            </span>
          </div>

          {/* 2×2 onion grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {ABOUT_TILES.map((tile, i) => (
              <div key={tile.src} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-emerald-950/60">
                <img src={tile.src} alt={tile.alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                {/* scan line */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute inset-x-0 h-1/2 animate-scan bg-gradient-to-b from-transparent via-fresh/22 to-transparent"
                    style={{ animationDelay: `${i * 0.65}s` }} />
                </div>
                {tile.boxes.map((b, j) => (
                  <DetectBox key={j} label={b.label} conf={b.conf} tone={b.tone} style={b.style} delay={0.5 + i * 0.18} compact />
                ))}
              </div>
            ))}
          </div>

          {/* signal row */}
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {[{ k: 'VISION', v: 94 }, { k: 'GAS + ENV', v: 87 }, { k: 'FUSION', v: 91 }].map((s, i) => (
              <div key={s.k} className="rounded-lg border border-white/8 bg-white/[0.05] px-1.5 py-2 text-center">
                <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-white/45">{s.k}</p>
                <p className="mt-0.5 font-mono text-[15px] font-bold leading-none text-white">
                  <CountUp value={s.v} duration={1200 + i * 180} />
                </p>
              </div>
            ))}
          </div>

          {/* result strip */}
          <div className="mt-2.5 flex items-end justify-between rounded-xl border border-white/8 bg-white/[0.06] px-3.5 py-3">
            <div>
              <p className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-white/45">Quality Score</p>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-mono text-[24px] font-extrabold leading-none text-white">
                  <CountUp value={91} duration={1800} />
                </span>
                <span className="font-mono text-[11px] text-white/40">/ 100</span>
              </div>
            </div>
            <motion.span
              className="rounded-lg bg-fresh px-3 py-1.5 text-[11px] font-extrabold tracking-wider text-emerald-950"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              GRADE A
            </motion.span>
          </div>
        </motion.div>

        {/* floating badges below card */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {['AI + IoT Powered', 'YOLOv8 Vision', 'Real-Time Analysis'].map((label) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-900/15 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-forest">
              <span className="h-1.5 w-1.5 rounded-full bg-fresh" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

export default function Solution({ slug: slugProp }: { slug?: string }) {
  const { slug: paramSlug = '' } = useParams();
  const slug = slugProp ?? paramSlug;
  const entry = CONTENT[slug];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = entry ? `${entry.title} — OnionSure` : 'OnionSure';
  }, [entry, slug]);

  if (!entry) {
    return (
      <div className="min-h-screen bg-emerald-950">
        <Nav />
        <div className="mx-auto max-w-2xl px-5 pb-32 pt-44 text-center sm:px-8">
          <h1 className="text-3xl font-extrabold text-white">Page not found</h1>
          <p className="mt-3 text-emerald-100/60">That page does not exist.</p>
          <Link to="/" className="mt-8 inline-block rounded-xl bg-fresh px-5 py-3 text-sm font-bold text-emerald-950">Back to home</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isHowItWorks = slug === 'how-it-works';

  return (
    <div className="min-h-screen bg-[#FAF8F2]">
      <Nav />

      {/* ─── Hero Banner ─── */}
      <header className="relative overflow-hidden bg-[#0B5D3B] pb-24 pt-[120px] sm:pb-28 sm:pt-[140px]">
        {/* Radial glow */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 80% at 10% 40%, rgba(63,174,90,0.22) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 90% 80%, rgba(6,69,44,0.5) 0%, transparent 55%)' }} aria-hidden />
        {/* Dot-grid texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '24px 24px' }} aria-hidden />
        {/* Bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-[#FAF8F2]" aria-hidden />

        {/* Grain */}
        <div className="grain pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-fresh/30 bg-fresh/10 px-4 py-1.5 backdrop-blur-sm mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-fresh" />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-fresh">{entry.eyebrow}</span>
            </div>

            <h1 className="text-[34px] font-extrabold leading-[1.06] tracking-tight text-white sm:text-[50px] lg:text-[58px] max-w-3xl">
              {entry.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-emerald-100/70 sm:text-[17px]">
              {entry.intro}
            </p>
          </motion.div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">

          {isHowItWorks ? (
            <div>
              <HowItWorks />
              <div className="mt-16 grid gap-5 sm:grid-cols-2">
                {entry.points.map((p, i) => {
                  const Icon = HOW_ICONS[i] ?? Check;
                  return (
                    <Reveal key={p.t} delay={i * 0.08}>
                      <div className="group flex gap-5 rounded-2xl border border-emerald-900/[0.07] bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-fresh/30 hover:shadow-card">
                        <div className="relative shrink-0">
                          <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#0B5D3B]/8 transition-colors duration-300 group-hover:bg-fresh/15">
                            <Icon size={22} className="text-forest" strokeWidth={1.8} />
                          </div>
                          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-forest text-[9px] font-extrabold text-white shadow">
                            {i + 1}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-[14.5px] font-extrabold text-emerald-950">{p.t}</h3>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-emerald-800/60">{p.d}</p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
              <Reveal delay={0.3}>
                <div className="mt-10 flex flex-wrap gap-3">
                  <ActionLink href={entry.cta?.href || '/login'} variant="primary" arrow>{entry.cta?.label || 'Start Quality Inspection'}</ActionLink>
                  <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-forest transition hover:bg-emerald-50">
                    <ArrowRight size={15} className="rotate-180" /> Back to home
                  </Link>
                </div>
              </Reveal>
            </div>
          ) : (
            <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
              {/* Feature cards */}
              <div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {entry.points.map((p, i) => (
                    <Reveal key={p.t} delay={i * 0.07} className="h-full">
                      <div className="group relative h-full overflow-hidden rounded-2xl border border-emerald-900/[0.07] bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-fresh/35 hover:shadow-[0_18px_44px_-12px_rgba(6,69,44,0.20)]">
                        {/* top accent line on hover */}
                        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-fresh/0 via-fresh/60 to-fresh/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                        {/* number badge */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B5D3B]/8 transition-colors duration-300 group-hover:bg-fresh/15">
                            <Check size={16} className="text-forest" strokeWidth={2.5} />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-emerald-900/25">0{i + 1}</span>
                        </div>

                        <h2 className="text-[14.5px] font-extrabold text-emerald-950 leading-snug">{p.t}</h2>
                        <p className="mt-2 text-[13px] leading-relaxed text-emerald-800/60">{p.d}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>

                <Reveal delay={0.3}>
                  <div className="mt-10 flex flex-wrap gap-3">
                    <ActionLink href={entry.cta?.href || '/login'} variant="primary" arrow>
                      {entry.cta?.label || 'Start Quality Inspection'}
                    </ActionLink>
                    <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-forest transition hover:bg-emerald-50">
                      <ArrowRight size={15} className="rotate-180" /> Back to home
                    </Link>
                  </div>
                </Reveal>
              </div>

              {/* Image panel */}
              {entry.image && (
                <Reveal delay={0.1}>
                  <div className="overflow-hidden rounded-2xl border border-emerald-900/[0.07] bg-white p-2 shadow-card lg:sticky lg:top-28">
                    <div className="relative overflow-hidden rounded-xl">
                      <img
                        src={entry.image}
                        alt={entry.imageAlt || entry.title}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                      <div className="absolute bottom-3 left-3">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-[#0B5D3B]/80 px-3 py-1.5 backdrop-blur-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-fresh" />
                          <span className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-white/90">{entry.eyebrow} — OnionSure</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
