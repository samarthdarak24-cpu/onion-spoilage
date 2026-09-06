import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ScanEye, Radio, GitMerge, FileCheck2, QrCode } from 'lucide-react';

const ITEMS = [
  { label: 'AI Vision', Icon: ScanEye },
  { label: 'IoT Sensing', Icon: Radio },
  { label: 'AI Fusion', Icon: GitMerge },
  { label: 'Digital Reports', Icon: FileCheck2 },
  { label: 'QR Verification', Icon: QrCode },
];

export default function TrustStrip() {
  const reduce = useReducedMotion();
  return (
    <section className="border-y border-emerald-900/10 bg-emerald-950" aria-label="Platform capabilities">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 py-5 sm:justify-between sm:gap-x-2">
          {ITEMS.map(({ label, Icon }, i) => (
            <motion.li
              key={label}
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: reduce ? 0 : 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Icon size={15} className="text-fresh" strokeWidth={2} />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{label}</span>
              {i < ITEMS.length - 1 && (
                <span className="ml-2 hidden h-1 w-1 rounded-full bg-fresh/40 sm:block" aria-hidden />
              )}
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
