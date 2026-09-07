import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ArrowRight, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, Spinner } from '../../components/ui';
import { PageTransition } from '../../components/motion';
import { FarmerSelector } from '../../components/FarmerSelector';

const CROPS = ['Onion', 'Potato', 'Tomato', 'Garlic', 'Chilli'];

export default function NewInspection() {
  const nav = useNavigate();
  
  // Reference data
  const [centers, setCenters] = useState<any[]>([]);
  const [fpos, setFpos] = useState<any[]>([]);
  
  // Lot form
  const [form, setForm] = useState({
    farmerId: '',
    farmerDetails: null as any,
    fpoId: '',
    crop: 'Onion',
    variety: 'Nashik Red',
    quantityKg: 1000,
    procurementCenterId: '',
    centralLotId: '',
  });
  
  // Central Lot ID lookup
  const [lookupLotId, setLookupLotId] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getCenters().then(setCenters).catch(() => {});
    api.getFpos().then(setFpos).catch(() => {});
  }, []);

  // Validation
  const isValid = form.farmerId && form.crop && form.quantityKg > 0 && form.procurementCenterId;

  const handleLookupLot = async () => {
    if (!lookupLotId.trim()) return;
    
    setLookupLoading(true);
    setErr('');
    setLookupResult(null);
    
    try {
      const result = await api.lookupLot(lookupLotId.trim());
      setLookupResult(result);
      
      // Pre-fill form with existing lot data
      if (result.lot) {
        setForm({
          ...form,
          farmerId: result.lot.farmerId || '',
          fpoId: result.lot.fpoId || '',
          crop: result.lot.crop || 'Onion',
          variety: result.lot.variety || 'Nashik Red',
          quantityKg: result.lot.quantityKg || 1000,
          centralLotId: result.lot.lotNumber || lookupLotId.trim(),
        });
      }
    } catch (e: any) {
      setErr(e.message || 'Lot not found. You can register a new lot below.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setErr('Please complete all required fields.');
      return;
    }

    setBusy(true);
    setErr('');

    try {
      // Create or update lot
      const lot = await api.createLot({
        farmerId: form.farmerId,
        fpoId: form.fpoId || undefined,
        crop: form.crop,
        variety: form.variety,
        quantityKg: Number(form.quantityKg),
        procurementCenterId: form.procurementCenterId,
        lotNumber: form.centralLotId || undefined,
      });

      // Start inspection session
      const inspection = await api.startInspection({
        lotId: lot.id,
        sampleWeightKg: 1.5,
        mode: 'STANDARD',
      });

      // Persist current inspection so all pages can access it.
      // Also dispatch a storage event so same-tab listeners (e.g. Certificates page)
      // react immediately when the officer navigates back.
      localStorage.setItem('onionsure_current_inspection_id', inspection.id);
      localStorage.setItem('onionsure_current_lot_id', lot.id);
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'onionsure_current_inspection_id',
          newValue: inspection.id,
          storageArea: localStorage,
        })
      );

      // Navigate to unified Quality Assessment
      nav(`/quality/assessment/${inspection.id}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageTransition className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-ink">
            <ClipboardList size={22} className="text-forest" /> New Inspection
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Register a lot and start a standardized quality assessment.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {err && (
        <div className="flex items-center gap-2 rounded-xl bg-reject/10 px-4 py-2.5 text-sm font-medium text-reject">
          <AlertTriangle size={16} /> {err}
        </div>
      )}

      {/* Main Form */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-ink">LOT IDENTITY</h3>
            <p className="text-xs text-muted mt-0.5">ONE PHYSICAL LOT = ONE CENTRAL LOT ID</p>
          </div>
          <Badge tone="forest">CENTRAL LOT SYSTEM</Badge>
        </div>

        {/* Central Lot ID Lookup */}
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <label className="text-xs font-bold uppercase tracking-wider text-forest">
            Have a Central Lot ID? Retrieve existing lot
          </label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="e.g., ON-2026-00421"
                className="input w-full bg-white pl-10 font-mono uppercase"
                value={lookupLotId}
                onChange={(e) => setLookupLotId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleLookupLot()}
              />
            </div>
            <button
              type="button"
              className="btn-ghost border border-forest/30 bg-white"
              disabled={!lookupLotId || lookupLoading}
              onClick={handleLookupLot}
            >
              {lookupLoading ? <Spinner label="Looking up..." /> : 'Lookup Central ID'}
            </button>
          </div>

          {lookupResult && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-forest">
                <CheckCircle2 size={15} /> Central Lot Found: {lookupResult.lot.lotNumber} ({lookupResult.lot.quantityKg} kg {lookupResult.lot.variety})
              </div>
              {lookupResult.resultVariationDetected && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-amber-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <div className="font-bold text-amber-900">⚠ RESULT VARIATION DETECTED ACROSS CENTERS</div>
                    <p className="mt-0.5">{lookupResult.variationDetails}</p>
                    <div className="mt-1 font-semibold">Prior center inspections will be preserved in the audit log.</div>
                  </div>
                </div>
              )}
              {lookupResult.inspections && lookupResult.inspections.length > 0 && (
                <div className="mt-2 text-xs text-muted">
                  Previous inspections: <span className="font-bold text-ink">{lookupResult.inspections.length}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Two-Column Form Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-ink">Farmer *</label>
              <p className="mb-2 text-xs text-muted">Search by name, mobile, or Farmer ID</p>
              <FarmerSelector
                value={form.farmerId}
                onChange={(id, farmer) => {
                  setForm({
                    ...form,
                    farmerId: id,
                    farmerDetails: farmer,
                    fpoId: farmer.fpoId || '',
                  });
                }}
                fpos={fpos}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink">FPO (optional)</label>
              <select
                className="input mt-1 w-full"
                value={form.fpoId}
                onChange={(e) => setForm({ ...form, fpoId: e.target.value })}
              >
                <option value="">None / Individual Farmer</option>
                {fpos.map((fpo) => (
                  <option key={fpo.id} value={fpo.id}>{fpo.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">FPO is separate from individual farmer identity</p>
            </div>

            <div>
              <label className="text-xs font-bold text-ink">Crop *</label>
              <select
                className="input mt-1 w-full"
                value={form.crop}
                onChange={(e) => setForm({ ...form, crop: e.target.value })}
              >
                {CROPS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-ink">Variety</label>
              <input
                type="text"
                className="input mt-1 w-full"
                value={form.variety}
                onChange={(e) => setForm({ ...form, variety: e.target.value })}
                placeholder="e.g., Nashik Red, Pusa Red"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink">Quantity (kg) *</label>
              <input
                type="number"
                min={1}
                className="input mt-1 w-full"
                value={form.quantityKg}
                onChange={(e) => setForm({ ...form, quantityKg: +e.target.value })}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-ink">Procurement Center *</label>
              <select
                className="input mt-1 w-full"
                value={form.procurementCenterId}
                onChange={(e) => setForm({ ...form, procurementCenterId: e.target.value })}
              >
                <option value="">Select center…</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.location}</option>
                ))}
              </select>
            </div>

            {form.farmerDetails && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">
                  Origin / Village
                </div>
                <div className="text-sm font-semibold text-ink">
                  {form.farmerDetails.village}
                </div>
              </div>
            )}

            {form.centralLotId && (
              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-2">
                  Central Lot ID
                </div>
                <div className="font-mono text-lg font-bold text-purple-900">
                  {form.centralLotId}
                </div>
                <div className="mt-1 text-xs text-muted">
                  This ID will be used across all centers
                </div>
              </div>
            )}

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-forest mb-2">
                Inspection Date
              </div>
              <div className="text-sm font-semibold text-ink">
                {new Date().toLocaleDateString('en-GB', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex items-center justify-between gap-3 pt-6 border-t border-border">
          <div className="text-xs text-muted">
            {isValid ? '✓ Ready to start assessment' : 'Complete all required fields to continue'}
          </div>
          <button
            className="btn-primary flex items-center gap-2"
            disabled={busy || !isValid}
            onClick={handleSubmit}
          >
            {busy ? (
              <Spinner label="Creating lot..." />
            ) : (
              <>
                Save Lot & Continue <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </Card>
    </PageTransition>
  );
}
