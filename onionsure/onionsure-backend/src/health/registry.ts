/**
 * Health probe registry (spec §42).
 *
 * Phases register their own probes here by name; later registrations overwrite
 * earlier ones. This keeps `GET /api/health/dependencies` working from Phase 1
 * while IoT/Realtime/AI modules plug themselves in as they are built.
 */
export type ProbeStatus = 'up' | 'down' | 'unknown';

export interface ProbeResult {
  status: ProbeStatus;
  detail?: string;
  latencyMs?: number;
}

export type Probe = () => Promise<ProbeResult>;

const probes = new Map<string, Probe>();

/** Register (or replace) a named health probe. */
export function registerProbe(name: string, probe: Probe): void {
  probes.set(name, probe);
}

export function removeProbe(name: string): void {
  probes.delete(name);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`probe timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/** Run every registered probe, tolerating and reporting individual failures. */
export async function runProbes(timeoutMs = 3000): Promise<Record<string, ProbeResult>> {
  const entries = [...probes.entries()];

  const settled = await Promise.all(
    entries.map(async ([name, probe]) => {
      const started = Date.now();
      try {
        const result = await withTimeout(probe(), timeoutMs);
        return [name, { ...result, latencyMs: result.latencyMs ?? Date.now() - started }] as const;
      } catch (err) {
        return [name, {
          status: 'down' as ProbeStatus,
          detail: err instanceof Error ? err.message : 'probe failed',
          latencyMs: Date.now() - started,
        }] as const;
      }
    }),
  );

  return Object.fromEntries(settled);
}

/**
 * Overall status: healthy only when every probe reports `up`.
 * `unknown` probes (not yet wired) degrade rather than fail the service.
 */
export function summarize(results: Record<string, ProbeResult>): 'healthy' | 'degraded' {
  return Object.values(results).every((r) => r.status === 'up') ? 'healthy' : 'degraded';
}
