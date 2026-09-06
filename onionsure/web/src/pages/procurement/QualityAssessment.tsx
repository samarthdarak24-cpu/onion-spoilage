import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Search, TrendingUp, Award, Clock,
  Package, CheckCircle2, AlertCircle, ChevronRight, Radio,
  Camera, ScanLine, GitMerge, FileText
} from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, GradeBadge, Spinner, EmptyState } from '../../components/ui';
import { PageTransition } from '../../components/motion';

export default function QualityAssessment() {
  const nav = useNavigate();
  const [recentInspections, setRecentInspections] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getInspections(),
      // Could add stats endpoint here
    ])
      .then(([inspections]) => {
        // Sort by date, most recent first
        const sorted = inspections.sort((a: any, b: any) => 
          new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
        );
        setRecentInspections(sorted.slice(0, 5));

        // Calculate quick stats
        const today = new Date().toDateString();
        const todayInspections = inspections.filter((i: any) => 
          new Date(i.startedAt).toDateString() === today
        );
        const completed = inspections.filter((i: any) => i.status === 'completed');
        const inProgress = inspections.filter((i: any) => i.status === 'in_progress');

        setStats({
          today: todayInspections.length,
          completed: completed.length,
          inProgress: inProgress.length,
          total: inspections.length,
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const workflowSteps = [
    {
      step: 1,
      title: 'Register Lot',
      description: 'Register farmer and lot details with Central Lot ID',
      icon: ClipboardList,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      step: 2,
      title: 'IoT Pod Connection',
      description: 'Connect environmental sensors for real-time monitoring',
      icon: Radio,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      step: 3,
      title: 'Stabilization',
      description: '60-second environment stabilization period',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      step: 4,
      title: 'Multi-Angle Capture',
      description: 'Capture sample images from 4 different angles',
      icon: Camera,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      step: 5,
      title: 'AI Analysis',
      description: 'Vision, Gas, and Environment analysis with scoring',
      icon: ScanLine,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      step: 6,
      title: 'Fusion & Result',
      description: 'Final grading, evidence review, and certificate generation',
      icon: GitMerge,
      color: 'text-forest',
      bg: 'bg-forest-light',
    },
  ];

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner label="Loading quality assessment..." />
      </div>
    );
  }

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-ink">
            <ScanLine size={24} className="text-forest" /> Quality Assessment Hub
          </h2>
          <p className="mt-1 text-sm text-muted">
            Unified 6-step workflow for complete onion quality assessment
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => nav('/quality/new-inspection')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Start New Assessment
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-forest">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                  Today's Inspections
                </div>
                <div className="mt-1 text-3xl font-extrabold text-forest">
                  {stats.today}
                </div>
              </div>
              <TrendingUp size={32} className="text-forest/30" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                  In Progress
                </div>
                <div className="mt-1 text-3xl font-extrabold text-blue-600">
                  {stats.inProgress}
                </div>
              </div>
              <Clock size={32} className="text-blue-600/30" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                  Completed
                </div>
                <div className="mt-1 text-3xl font-extrabold text-green-600">
                  {stats.completed}
                </div>
              </div>
              <CheckCircle2 size={32} className="text-green-600/30" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                  Total Lots
                </div>
                <div className="mt-1 text-3xl font-extrabold text-purple-600">
                  {stats.total}
                </div>
              </div>
              <Package size={32} className="text-purple-600/30" />
            </div>
          </Card>
        </div>
      )}

      {/* Workflow Steps Overview */}
      <Card>
        <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
          <GitMerge size={20} className="text-forest" />
          6-Step Unified Workflow
        </h3>
        <p className="text-sm text-muted mb-4">
          Complete quality assessment in one seamless flow. All steps are integrated into a single page
          with real-time progress tracking and state persistence.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflowSteps.map((step) => (
            <div
              key={step.step}
              className="group relative rounded-xl border border-border bg-white p-4 transition hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg ${step.bg} p-2.5`}>
                  <step.icon size={20} className={step.color} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">
                    Step {step.step}
                  </div>
                  <div className="mt-0.5 font-bold text-ink">{step.title}</div>
                  <p className="mt-1 text-xs text-muted">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between rounded-lg bg-forest-light p-4">
          <div className="text-sm font-semibold text-forest">
            Ready to start a new quality assessment?
          </div>
          <button
            onClick={() => nav('/quality/new-inspection')}
            className="btn-primary flex items-center gap-2"
          >
            Begin Assessment <ChevronRight size={16} />
          </button>
        </div>
      </Card>

      {/* Recent Inspections */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <FileText size={20} className="text-forest" />
            Recent Inspections
          </h3>
          <button
            onClick={() => nav('/quality/history')}
            className="btn-ghost text-xs"
          >
            View All
          </button>
        </div>

        {recentInspections.length === 0 ? (
          <EmptyState
            title="No inspections yet"
            hint="Start your first quality assessment to see it here"
            action={
              <button
                onClick={() => nav('/quality/new-inspection')}
                className="btn-primary mt-4"
              >
                Start New Assessment
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {recentInspections.map((insp: any) => (
              <div
                key={insp.id}
                className="group flex items-center justify-between rounded-xl border border-border bg-white p-4 transition hover:border-forest hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-forest-light p-2.5">
                    <Package size={20} className="text-forest" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-forest">
                      {insp.lotNumber || insp.lotId}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <span>
                        {new Date(insp.completedAt || insp.startedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {insp.status && (
                        <>
                          <span>•</span>
                          <Badge
                            tone={
                              insp.status === 'completed'
                                ? 'forest'
                                : insp.status === 'in_progress'
                                ? 'blue'
                                : 'gray'
                            }
                          >
                            {insp.status}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {insp.grade && <GradeBadge grade={insp.grade} />}
                  <button
                    onClick={() => {
                      if (insp.status === 'completed') {
                        // View certificate or details
                        if (insp.certificateId) {
                          nav(`/certificate/${insp.certificateId}`);
                        }
                      } else {
                        // Resume inspection
                        nav(`/quality/assessment/${insp.id}`);
                      }
                    }}
                    className="btn-ghost text-xs opacity-0 transition group-hover:opacity-100"
                  >
                    {insp.status === 'completed' ? 'View Certificate' : 'Resume'}
                    <ChevronRight size={14} className="ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer transition hover:shadow-lg" onClick={() => nav('/quality/new-inspection')}>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-forest-light p-3">
              <Plus size={24} className="text-forest" />
            </div>
            <div>
              <div className="font-bold text-ink">Start New</div>
              <div className="text-xs text-muted">Begin quality assessment</div>
            </div>
          </div>
        </Card>

        <Card className="cursor-pointer transition hover:shadow-lg" onClick={() => {
          const searchLotId = prompt('Enter Central Lot ID to search:');
          if (searchLotId) nav(`/quality/lots/${searchLotId.trim()}`);
        }}>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-3">
              <Search size={24} className="text-blue-600" />
            </div>
            <div>
              <div className="font-bold text-ink">Search Lot</div>
              <div className="text-xs text-muted">Find by Central Lot ID</div>
            </div>
          </div>
        </Card>

        <Card className="cursor-pointer transition hover:shadow-lg" onClick={() => nav('/quality/certificates')}>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-3">
              <Award size={24} className="text-amber-600" />
            </div>
            <div>
              <div className="font-bold text-ink">Certificates</div>
              <div className="text-xs text-muted">View all certificates</div>
            </div>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
