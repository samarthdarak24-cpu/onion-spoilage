import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package, User, Building2, Calendar, Award, AlertTriangle, 
  CheckCircle2, ChevronRight, RotateCcw, FileText, TrendingUp
} from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, GradeBadge, Spinner, EmptyState } from '../../components/ui';
import { PageTransition } from '../../components/motion';

export default function LotDetail() {
  const { lotNumber } = useParams();
  const nav = useNavigate();
  
  const [lot, setLot] = useState<any>(null);
  const [farmer, setFarmer] = useState<any>(null);
  const [center, setCenter] = useState<any>(null);
  const [fpo, setFpo] = useState<any>(null);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!lotNumber) {
      nav('/quality/dashboard');
      return;
    }

    setLoading(true);
    api.lookupLot(lotNumber)
      .then((result) => {
        setLookupResult(result);
        setLot(result.lot);
        
        // Load related data
        return Promise.all([
          api.getFarmers().then(farmers => farmers.find(f => f.id === result.lot.farmerId)),
          api.getCenters().then(centers => centers.find(c => c.id === result.lot.procurementCenterId)),
          result.lot.fpoId ? api.getFpos().then(fpos => fpos.find(f => f.id === result.lot.fpoId)) : Promise.resolve(null)
        ]);
      })
      .then(([farmerData, centerData, fpoData]) => {
        setFarmer(farmerData);
        setCenter(centerData);
        setFpo(fpoData);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [lotNumber, nav]);

  const startReassessment = async () => {
    if (!lot) return;
    try {
      const inspection = await api.startInspection({
        lotId: lot.id,
        sampleWeightKg: 1.5,
        mode: 'REASSESSMENT',
      });
      nav(`/quality/assessment/${inspection.id}`);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner label="Loading lot details..." />
      </div>
    );
  }

  if (!lot || !lookupResult) {
    return (
      <PageTransition>
        <div className="grid min-h-[60vh] place-items-center text-center">
          <div>
            <AlertTriangle size={40} className="mx-auto text-reject mb-3" />
            <h2 className="text-xl font-bold text-ink">Lot Not Found</h2>
            <p className="mt-2 text-sm text-muted">{err || 'Central Lot ID not found in the system.'}</p>
            <button onClick={() => nav('/quality/new-inspection')} className="btn-primary mt-4">
              Register New Lot
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const inspections = lookupResult.inspections || [];
  const hasVariation = lookupResult.resultVariationDetected;

  return (
    <PageTransition className="space-y-5">
      {/* Breadcrumb */}
      <div className="text-xs text-muted">
        <span>Quality</span>
        <ChevronRight size={12} className="inline mx-1" />
        <span>Central Lots</span>
        <ChevronRight size={12} className="inline mx-1" />
        <span className="font-mono font-semibold text-forest">{lot.lotNumber}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-ink">
            <Package size={22} className="text-forest" /> Central Lot Details
          </h2>
          <p className="mt-0.5 font-mono text-sm font-bold text-forest">{lot.lotNumber}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => nav('/quality/new-inspection')} className="btn-ghost">
            ← Back
          </button>
          <button onClick={startReassessment} className="btn-primary flex items-center gap-2">
            <RotateCcw size={16} /> Start Reassessment
          </button>
        </div>
      </div>

      {/* Cross-Center Variation Alert */}
      {hasVariation && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <div className="font-bold text-amber-900 text-lg">
                ⚠ RESULT VARIATION DETECTED ACROSS CENTERS
              </div>
              <p className="mt-1 text-sm text-amber-800">{lookupResult.variationDetails}</p>
              <div className="mt-2 text-xs text-amber-700">
                This lot has been inspected at multiple centers with different results. 
                Compare inspections below and consider reassessment if needed.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lot Overview */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Main Column */}
        <div className="space-y-5">
          {/* LOT IDENTITY */}
          <Card>
            <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
              <Package size={20} className="text-forest" /> LOT OVERVIEW
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-bold uppercase text-muted">Central Lot ID</div>
                <div className="mt-1 font-mono text-lg font-bold text-forest">{lot.lotNumber}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted">Current Grade</div>
                <div className="mt-1">
                  {lot.currentGrade ? (
                    <GradeBadge grade={lot.currentGrade} />
                  ) : (
                    <span className="text-sm text-muted">Not graded yet</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted">Crop & Variety</div>
                <div className="mt-1 font-semibold text-ink">{lot.crop} - {lot.variety}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted">Quantity</div>
                <div className="mt-1 text-lg font-bold text-ink">{lot.quantityKg} KG</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted">Current Score</div>
                <div className="mt-1 text-lg font-bold text-ink">
                  {lot.currentScore ? `${lot.currentScore}/100` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted">Status</div>
                <div className="mt-1">
                  <Badge tone={lot.status === 'analyzed' ? 'forest' : 'amber'}>
                    {lot.status?.toUpperCase() || 'REGISTERED'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* FARMER & CENTER INFO */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                <User size={16} className="text-forest" /> Farmer
              </h4>
              {farmer ? (
                <div className="space-y-2 text-sm">
                  <div className="font-bold text-ink">{farmer.fullName}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-forest">{farmer.farmerId}</span>
                    <span className="text-muted">•</span>
                    <span className="text-muted">{farmer.village}</span>
                  </div>
                  {farmer.mobile && (
                    <div className="text-xs text-muted">📱 {farmer.mobile}</div>
                  )}
                  {farmer.farmName && (
                    <div className="text-xs text-muted">🏭 {farmer.farmName}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted">Loading farmer details...</div>
              )}
            </Card>

            <Card>
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-forest" /> Procurement Center
              </h4>
              {center ? (
                <div className="space-y-2 text-sm">
                  <div className="font-bold text-ink">{center.name}</div>
                  <div className="text-xs text-muted">{center.location}</div>
                </div>
              ) : (
                <div className="text-sm text-muted">Loading center details...</div>
              )}
              {fpo && (
                <>
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs font-bold uppercase text-muted mb-1">FPO</div>
                    <div className="text-sm font-semibold text-ink">{fpo.name}</div>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* INSPECTION TIMELINE */}
          <Card>
            <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
              <FileText size={20} className="text-forest" /> INSPECTION TIMELINE
            </h3>
            <p className="text-xs text-muted mb-4">
              All inspections for this Central Lot ID across different centers
            </p>

            {inspections.length === 0 ? (
              <EmptyState 
                title="No inspections yet" 
                hint="Start a new inspection to grade this lot" 
              />
            ) : (
              <div className="space-y-3">
                {inspections.map((insp: any, idx: number) => (
                  <div
                    key={insp.id}
                    className="rounded-xl border border-border bg-white p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-muted">
                            Inspection #{idx + 1}
                          </span>
                          {insp.centerName && (
                            <>
                              <span className="text-muted">•</span>
                              <span className="text-xs font-semibold text-ink">
                                {insp.centerName}
                              </span>
                            </>
                          )}
                          {insp.isReassessment && (
                            <Badge tone="purple">REASSESSMENT</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 mb-2">
                          <GradeBadge grade={insp.grade} />
                          <div className="text-sm font-bold text-ink">
                            {insp.score}/100
                          </div>
                          {insp.overridden && (
                            <Badge tone="amber">OVERRIDE</Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted">
                          <Calendar size={12} className="inline mr-1" />
                          {new Date(insp.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (insp.certificateId) {
                            nav(`/certificate/${insp.certificateId}`);
                          }
                        }}
                        className="btn-ghost text-xs"
                        disabled={!insp.certificateId}
                      >
                        View Certificate
                      </button>
                    </div>

                    {/* Score Variance Indicator */}
                    {hasVariation && inspections.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 text-xs">
                          <TrendingUp size={14} className="text-amber" />
                          <span className="text-muted">
                            Score variance with other centers detected
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <Card>
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
              Quick Actions
            </h4>
            <div className="space-y-2">
              <button
                onClick={startReassessment}
                className="w-full btn-primary text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Start Reassessment
              </button>
              <button
                onClick={() => nav('/quality/new-inspection')}
                className="w-full btn-ghost text-sm"
              >
                Register Another Lot
              </button>
            </div>
          </Card>

          {/* Stats */}
          <Card>
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
              Lot Statistics
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Total Inspections</span>
                <span className="font-bold text-ink">{inspections.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Centers Visited</span>
                <span className="font-bold text-ink">
                  {new Set(inspections.map((i: any) => i.centerName)).size}
                </span>
              </div>
              {inspections.length > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Highest Score</span>
                    <span className="font-bold text-forest">
                      {Math.max(...inspections.map((i: any) => i.score || 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Lowest Score</span>
                    <span className="font-bold text-reject">
                      {Math.min(...inspections.map((i: any) => i.score || 0))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Cross-Center Summary */}
          {hasVariation && lookupResult.crossCenterSummary && (
            <Card className="border-2 border-amber-200 bg-amber-50/50">
              <h4 className="text-sm font-bold uppercase tracking-wider text-amber-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} /> Variation Summary
              </h4>
              <div className="text-xs text-amber-900 space-y-2">
                {lookupResult.crossCenterSummary.split('\n').map((line: string, idx: number) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
