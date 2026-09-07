import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Camera, CheckCircle2, Leaf, Info } from 'lucide-react';
import InspectionStudio from '../../components/InspectionStudio';

export default function FarmerInspection() {
  return (
    <div className="space-y-5">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest via-[#0e6b44] to-darkgreen p-6 text-white shadow-card"
      >
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Leaf size={18} /></div>
            <span className="text-sm font-bold text-emerald-200 uppercase tracking-wider">My Farm</span>
          </div>
          <h1 className="text-2xl font-extrabold">Pre-Check Your Onions</h1>
          <p className="mt-1 text-sm text-emerald-100/80">
            Take a photo of your onion lot at home to get an early quality estimate before going to the procurement center.
          </p>
        </div>
      </motion.div>

      {/* What is Pre-Check info cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Camera, title: 'Snap a Photo', desc: 'Take a clear photo of your onion batch in good light.', color: 'bg-mint text-forest' },
          { icon: CheckCircle2, title: 'Get AI Estimate', desc: 'Our AI checks for visible defects and gives you a grade hint.', color: 'bg-soft-blue text-blue-700' },
          { icon: Info, title: 'Advisory Only', desc: 'This is NOT the official grade. The final grade comes from the procurement center.', color: 'bg-amber/20 text-amber-700' },
        ].map((c) => (
          <div key={c.title} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c.color}`}>
              <c.icon size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{c.title}</p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Important disclaimer */}
      <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
        <div>
          <p className="text-sm font-extrabold text-amber-900">Advisory Estimate — Not an Official Grade</p>
          <p className="mt-1 text-xs text-amber-800 leading-relaxed">
            This Pre-Check is only to help you sort defects at home before traveling. It <strong>does not</strong> create an official certificate or binding quality grade. Your final grade is given by the procurement officer at the center.
          </p>
        </div>
      </div>

      {/* Inspection studio */}
      <InspectionStudio
        role="farmer"
        title="Upload Onion Photo"
        subtitle="Photograph your onion lot to receive a preliminary quality estimate and reduce transport risk."
      />
    </div>
  );
}
