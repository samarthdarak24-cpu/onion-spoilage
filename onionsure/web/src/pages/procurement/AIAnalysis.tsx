import React from 'react';
import { Sparkles } from 'lucide-react';
import InspectionStudio from '../../components/InspectionStudio';

export default function AIAnalysis() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl"><Sparkles size={22} className="text-fresh" /> AI Analysis</h1>
      </div>

      <InspectionStudio
        role="officer"
        title="AI Vision Inspection"
        subtitle="Upload an onion photo — the OnionCheck detector scans for defects in real time."
      />
    </div>
  );
}
