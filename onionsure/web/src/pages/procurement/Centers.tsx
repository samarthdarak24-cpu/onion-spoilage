import React from 'react';
import { Building2, MapPin, Globe2, Navigation } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, StatCard, EmptyState } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_LOTS } from '../../lib/events';

export default function Centers() {
  const { data, loading } = useLiveData<any[]>(
    () => api.getCenters(),
    { events: EV_LOTS, pollMs: 30000 },
  );

  const centers = data || [];
  const regions = Array.from(new Set(centers.map((c) => (c.location || '').split(',').pop()?.trim()).filter(Boolean))) as string[];

  if (loading && !data) {
    return (
      <PageTransition className="space-y-5">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-mint/60" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-mint/60" />)}</div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-5">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Network</div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl"><Building2 size={22} className="text-fresh" /> Procurement Centers</h1>
        <p className="mt-0.5 text-sm text-muted">Where onions are received, graded and certified across the network.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Registered Centers" value={centers.length} sub="active in network" accent="forest" icon={Building2} />
        <StatCard label="Regions Covered" value={regions.length} sub={regions.slice(0, 2).join(', ') || '—'} accent="fresh" icon={Globe2} />
        <StatCard label="Coverage" value={<span className="text-2xl">🛰️</span>} sub="field-to-certified" accent="amber" icon={Navigation} />
      </div>

      {centers.length === 0 ? (
        <EmptyState title="No centers found" hint="Centers are configured by the platform administrator." />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {centers.map((c) => {
            const region = (c.location || '').split(',').pop()?.trim() || '—';
            return (
              <StaggerItem key={c.id} className="h-full">
                <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2"><Building2 size={18} className="text-fresh" /><span className="font-bold text-ink">{c.name}</span></div>
                    <span className="chip bg-mint text-forest">{region}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-sm text-muted"><MapPin size={14} className="text-fresh" /> {c.location}</div>
                  <div className="mt-auto flex items-center gap-2 rounded-xl bg-mint/60 px-3 py-2 text-xs text-muted">
                    <Navigation size={13} className="text-fresh" />
                    <span>{Number(c.latitude).toFixed(4)}, {Number(c.longitude).toFixed(4)}</span>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </PageTransition>
  );
}
