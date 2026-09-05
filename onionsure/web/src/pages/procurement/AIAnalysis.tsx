import React from 'react';
import { Sparkles, Leaf, Bug, Trash2, Sprout, Ruler, AlertTriangle } from 'lucide-react';
import InspectionStudio from '../../components/InspectionStudio';
import { Card } from '../../components/ui';

const CAPABILITIES = [
  { icon: Leaf, label: 'Healthy', color: 'text-fresh', bg: 'bg-mint' },
  { icon: Bug, label: 'Damaged', color: 'text-amber-600', bg: 'bg-amber/15' },
  { icon: Trash2, label: 'Rotten', color: 'text-reject', bg: 'bg-reject/10' },
  { icon: Sprout, label: 'Sprouted', color: 'text-purple-600', bg: 'bg-purple-100' },
  { icon: Ruler, label: 'Undersized', color: 'text-sky-600', bg: 'bg-sky-100' },
];

export default function AIAnalysis() {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Computer Vision</div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl"><Sparkles size={22} className="text-fresh" /> AI Analysis</h1>
        <p className="mt-0.5 text-sm text-muted">OnionCheck detector scans each batch for defects, size and spoilage signals.</p>
      </div>

      <Card className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Sparkles size={16} className="text-fresh" /> Detects</div>
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map((c) => (
            <span key={c.label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${c.bg} ${c.color}`}>
              <c.icon size={14} /> {c.label}
            </span>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-amber/15 px-3 py-1.5 text-xs font-semibold text-amber-700">
          <AlertTriangle size={13} /> DEMO detector unless OnionCheck is connected
        </span>
      </Card>

      <InspectionStudio
        role="officer"
        title="AI Vision Inspection"
        subtitle="Upload an onion photo — the OnionCheck detector scans for defects in real time."
      />
    </div>
  );
}
