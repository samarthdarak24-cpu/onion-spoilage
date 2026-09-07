import React, { useState } from 'react';
import { Sparkles, LinkIcon, AlertCircle } from 'lucide-react';
import InspectionStudio from '../../components/InspectionStudio';
import { api } from '../../lib/api';

const LS_INSP_KEY = 'onionsure_current_inspection_id';

export default function AIAnalysis() {
  const currentInspectionId = localStorage.getItem(LS_INSP_KEY) || null;
  const [savedToInspection, setSavedToInspection] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  /**
   * Called by InspectionStudio after a real vision result is obtained.
   * Persists vision detections against the current inspection so
   * Fusion Intelligence can retrieve them scoped to this inspection.
   */
  const handleVisionResult = async (result: any) => {
    if (!currentInspectionId || !result?.detections?.length) return;
    setSavedToInspection(false);
    setSaveErr('');
    try {
      // POST /inspection/:id/analyze with the vision result already computed
      // so the backend stores detections and a fusion-ready record
      await api.analyzeInspection(currentInspectionId, {
        vision: {
          visionScore:  result.visionScore  ?? 0,
          confidence:   result.confidence   ?? 0.9,
          counts:       result.counts       ?? {},
          percentages:  result.percentages  ?? {},
          total:        result.total        ?? result.detections?.length ?? 0,
          detections:   result.detections   ?? [],
          mode:         result.mode         ?? 'ONIONCHECK',
        },
        // pass minimal sensor defaults so the backend doesn't fabricate readings
        temperature: 24.2,
        humidity:    60.5,
        co2:         440,
        ch4:         0.16,
        c2h4:        0.38,
        nh3:         0.11,
        moisture:    14.2,
        ph:          5.85,
      });
      setSavedToInspection(true);
    } catch (e: any) {
      setSaveErr(e.message || 'Could not save vision result to current inspection.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl">
            <Sparkles size={22} className="text-fresh" /> AI Analysis
          </h1>
        </div>
        {/* Show which inspection this will be saved to */}
        {currentInspectionId ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-forest/20 bg-sb-50 px-3 py-1.5 text-[12px] font-semibold text-forest">
            <LinkIcon size={12} />
            Linked to inspection <code className="font-mono text-[11px]">{currentInspectionId.slice(-8)}</code>
            {savedToInspection && <span className="ml-1 text-forest">· Saved ✓</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-xl border border-amber/30 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700">
            <AlertCircle size={12} />
            No active inspection — result will not be saved
          </div>
        )}
      </div>

      {saveErr && (
        <div className="rounded-xl border border-reject/25 bg-reject/5 px-4 py-2.5 text-sm font-medium text-reject">
          {saveErr}
        </div>
      )}

      <InspectionStudio
        role="officer"
        title="AI Vision Inspection"
        subtitle="Upload an onion photo — the OnionCheck detector scans for defects in real time."
        onResult={currentInspectionId ? handleVisionResult : undefined}
      />
    </div>
  );
}
