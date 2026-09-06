import React from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import InspectionStudio from '../../components/InspectionStudio';

export default function FarmerInspection() {
  return (
    <div className="space-y-4">
      {/* Mandatory Disclaimer Banner per Section 11 */}
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={22} />
          <div>
            <div className="font-extrabold text-sm uppercase tracking-wider text-amber-900">
              PRELIMINARY ESTIMATE — NOT AN OFFICIAL PROCUREMENT GRADE
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Pre-Check provides an early, advisory AI estimate so you can sort out defects at home before traveling to a procurement center.
              This estimate never generates an official certificate or legally binding grade.
            </p>
          </div>
        </div>
      </div>

      <InspectionStudio
        role="farmer"
        title="Farm Pre-Check & Advisory"
        subtitle="Photograph your onion lot at home to receive preliminary quality guidance and reduce transport risk."
      />
    </div>
  );
}
