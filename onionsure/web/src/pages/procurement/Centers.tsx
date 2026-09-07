import React from 'react';
import { Building2, MapPin, Globe2, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { EmptyState } from '../../components/ui';
import { PageTransition, Stagger, StaggerItem } from '../../components/motion';
import { useLiveData } from '../../hooks/useLiveData';
import { EV_LOTS } from '../../lib/events';
import { PageHeader, StatGrid, StatTile } from '../../components/PageHeader';

export default function Centers() {
  const { data, loading } = useLiveData<any[]>(
    () => api.getCenters(),
    { events: EV_LOTS, pollMs: 30000 },
  );

  const centers = data || [];
  const regions = Array.from(new Set(centers.map(c => (c.location || '').split(',').pop()?.trim()).filter(Boolean))) as string[];

  if (loading && !data) return (
    <PageTransition className="space-y-5">
      <div className="h-28 animate-pulse rounded-2xl bg-mint/60" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0,1,2,3,4,5].map(i => <div key={i} className="h-36 animate-pulse rounded-2xl bg-mint/60" />)}</div>
    </PageTransition>
  );

  return (
    <PageTransition className="space-y-5">
      <PageHeader icon={<Building2 size={22} />} eyebrow="Network" title="Procurement Centers" subtitle="Where onions are received, graded and certified across the network." />

      <StatGrid cols={3}>
        <StatTile label="Registered Centers" value={centers.length} sub="active in network" icon={Building2} accent="green" />
        <StatTile label="Regions" value={regions.length} sub={regions.slice(0, 2).join(', ') || '—'} icon={Globe2} accent="blue" />
        <StatTile label="Coverage" value="🛰️" sub="field-to-certified" icon={Navigation} accent="amber" />
      </StatGrid>

      {centers.length === 0 ? (
        <EmptyState title="No centers found" hint="Centers are configured by the platform administrator." />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {centers.map((c) => {
            const region = (c.location || '').split(',').pop()?.trim() || '—';
            return (
              <StaggerItem key={c.id} className="h-full">
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="flex h-full flex-col rounded-2xl border border-[rgba(20,20,25,0.07)] bg-white p-5 shadow-soft hover:shadow-card transition-shadow"
                >
                  {/* Top */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-forest/10 text-forest shrink-0">
                      <Building2 size={20} />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-mint px-2.5 py-0.5 text-[10px] font-bold text-forest">{region}</span>
                  </div>

                  <h3 className="font-bold text-ink">{c.name}</h3>

                  <div className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                    <MapPin size={14} className="text-forest shrink-0" />
                    <span className="truncate">{c.location}</span>
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="flex items-center gap-2 rounded-xl bg-bg border border-[rgba(20,20,25,0.06)] px-3 py-2 text-xs text-muted">
                      <Navigation size={12} className="text-forest" />
                      <span className="font-mono">{Number(c.latitude || 0).toFixed(4)}, {Number(c.longitude || 0).toFixed(4)}</span>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </PageTransition>
  );
}
