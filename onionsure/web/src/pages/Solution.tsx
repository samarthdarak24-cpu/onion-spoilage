import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import Nav from '../components/home/Nav';
import Footer from '../components/home/Footer';
import HowItWorks from '../components/home/HowItWorks';
import { ActionLink, Reveal } from '../components/home/primitives';

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
    intro:
      'From lot registration to QR-verifiable certificate — a simple 5-step quality assessment workflow powered by AI and IoT.',
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
    intro:
      'Computer vision models detect and classify individual onions in a sample, then roll those detections up into a batch-level quality picture.',
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
    intro:
      'The IoT Quality Pod adds gas and environmental sensing alongside vision, contributing signals that are not available from the image alone.',
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
    intro:
      'Every inspection ends with a timestamped digital report that can be reviewed, shared and independently verified.',
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
    intro:
      'One quality intelligence platform for everyone in the onion supply chain — from the farm gate to the buyer.',
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
    intro:
      'Get a consistent, evidence-backed grade at the point of sale instead of a number that changes with whoever is holding the clipboard.',
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
    intro:
      'Standardise grading across every collection center your federation operates, and track quality over the season.',
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
    intro:
      'Run a repeatable inspection workflow at the gate: register the lot, capture the sample, inspect, and issue a grade.',
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
    intro:
      'Verify the quality of what you are purchasing before it ships, using a record you can check yourself.',
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
    intro:
      'OnionSure builds quality intelligence for the onion supply chain — combining computer vision and IoT sensing so grading decisions are measurable and consistent.',
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
    intro:
      'Talk to us about deploying OnionSure at your procurement center, FPO or buying operation.',
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
    intro:
      'How OnionSure handles inspection data, lot records and account information.',
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
    intro:
      'Terms governing use of the OnionSure platform and the quality grades it produces.',
    points: [
      { t: 'Decision support', d: 'Grades are decision support, not a substitute for contractual quality terms.' },
      { t: 'Sensor evidence', d: 'Gas and environment readings are supporting evidence, not standalone spoilage determinations.' },
      { t: 'Illustrative data', d: 'Demonstration values shown on this site are not measurements of a specific lot.' },
      { t: 'Account use', d: 'Access is per-role and credentials must not be shared.' },
    ],
  },
};

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
          <Link to="/" className="mt-8 inline-block rounded-xl bg-fresh px-5 py-3 text-sm font-bold text-emerald-950">
            Back to home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F2]">
      <Nav />

      {/* dark band keeps the fixed light-text nav readable */}
      <header className="relative overflow-hidden bg-emerald-950 pb-20 pt-[124px] sm:pb-24 sm:pt-[140px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(63,174,90,0.16),transparent_58%)]" aria-hidden />
        <div className="grain pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-fresh">{entry.eyebrow}</div>
            <h1 className="mt-3 text-[32px] font-extrabold leading-tight tracking-tight text-white sm:text-[46px]">
              {entry.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-emerald-100/70 sm:text-[17px]">
              {entry.intro}
            </p>
          </motion.div>
        </div>
      </header>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          {slug === 'how-it-works' ? (
            <HowItWorks />
          ) : (
            <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
              <div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {entry.points.map((p, i) => (
                    <Reveal key={p.t} delay={i * 0.07} className="h-full">
                      <div className="h-full rounded-2xl border border-emerald-900/[0.07] bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-fresh/30">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-fresh/15">
                          <Check size={14} className="text-forest" strokeWidth={3} />
                        </span>
                        <h2 className="mt-3.5 text-[14.5px] font-extrabold text-emerald-950">{p.t}</h2>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-emerald-800/60">{p.d}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>

                <Reveal delay={0.3}>
                  <div className="mt-10 flex flex-wrap gap-3">
                    <ActionLink href={entry.cta?.href || '/login'} variant="primary" arrow>
                      {entry.cta?.label || 'Start Quality Inspection'}
                    </ActionLink>
                    <Link
                      to="/"
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-forest transition hover:bg-emerald-50"
                    >
                      <ArrowRight size={15} className="rotate-180" />
                      Back to home
                    </Link>
                  </div>
                </Reveal>
              </div>

              {entry.image && (
                <Reveal delay={0.1}>
                  <div className="overflow-hidden rounded-2xl border border-emerald-900/[0.07] bg-white p-2 shadow-soft lg:sticky lg:top-28">
                    <img
                      src={entry.image}
                      alt={entry.imageAlt || entry.title}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full rounded-xl object-cover"
                    />
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
