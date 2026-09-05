import type {
  Certificate, DashboardStats, EnvResult, FusionResult, GasResult, Lot, SensorReading, User, VisionResult,
} from './types';

const TOKEN_KEY = 'onionsure_token';
const USER_KEY = 'onionsure_user';

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t: string | null) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
export function getStoredUser(): User | null {
  const u = localStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}
export function setStoredUser(u: User | null) { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); }

/**
 * API base URL. Defaults to the Vite dev proxy path (`/api` → server:4000).
 * In production set `VITE_API_BASE_URL` (e.g. https://api.onionsure.in) so the
 * same build can target a different host with no source changes (spec §31).
 */
const API_BASE: string = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Hook for global 401 handling. The AuthProvider registers a callback that
 * clears the session and redirects to /login when the backend rejects the
 * token (spec §5: "redirect to login after unauthorized response").
 */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null) { onUnauthorized = fn; }

async function req<T = any>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    let msg = res.statusText;
    try { const e = await res.json(); msg = e.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? (null as any) : res.json();
}

export const api = {
  // auth
  login: (username: string, password: string) => req<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { username, password } }),
  register: (payload: any) => req<User>('/auth/register', { method: 'POST', body: payload }),

  // lots
  getLots: () => req<Lot[]>('/lots'),
  createLot: (payload: any) => req<Lot>('/lots', { method: 'POST', body: payload }),
  getLot: (id: string) => req<Lot>(`/lots/${id}`),
  getCenters: () => req<any[]>('/centers'),
  getFarmers: () => req<any[]>('/farmers'),
  getFpos: () => req<any[]>('/fpos'),

  // inspection
  startInspection: (payload: any) => req<{ id: string }>('/inspection/start', { method: 'POST', body: payload }),
  addImage: (id: string, payload: any) => req(`/inspection/${id}/images`, { method: 'POST', body: payload }),
  addSensor: (id: string, payload: any) => req(`/inspection/${id}/sensors`, { method: 'POST', body: payload }),
  analyzeInspection: (id: string, payload: any) => req<{ vision: VisionResult; gas: GasResult; environment: EnvResult; fusion: FusionResult }>(`/inspection/${id}/analyze`, { method: 'POST', body: payload }),
  getInspection: (id: string) => req<any>(`/inspection/${id}`),

  // vision
  visionAnalyze: (payload: any) => req<VisionResult>('/vision/analyze', { method: 'POST', body: payload }),
  visionAnalyzeImage: (file: File, pixelsPerCm?: number) => {
    const form = new FormData();
    form.append('image', file);
    if (pixelsPerCm != null) form.append('pixels_per_cm', String(pixelsPerCm));
    return fetch(`${API_BASE}/vision/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() || ''}` },
      body: form,
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Vision analysis failed');
      return r.json();
    });
  },

  // iot
  postReadings: (payload: any) => req<{ reading: SensorReading; gas: GasResult }>('/iot/readings', { method: 'POST', body: payload }),
  getReadings: (inspectionId: string) => req<SensorReading[]>(`/iot/${inspectionId}`),
  simulateStart: (payload: any) => req<any>('/iot/simulate/start', { method: 'POST', body: payload }),
  simulateTick: (payload: any) => req<{ device: any; gas: GasResult }>('/iot/simulate/tick', { method: 'POST', body: payload }),
  simulateStop: (payload: any) => req('/iot/simulate/stop', { method: 'POST', body: payload }),

  // fusion
  calculateFusion: (payload: any) => req<FusionResult>('/fusion/calculate', { method: 'POST', body: payload }),

  // certificates
  generateCertificate: (payload: any) => req<Certificate>('/certificates/generate', { method: 'POST', body: payload }),
  getCertificates: () => req<Certificate[]>('/certificates'),
  getCertificate: (id: string) => req<any>(`/certificates/${id}`),
  certificatePdf: (id: string) => req<any>(`/certificates/${id}/pdf`),

  // inspection history — single enriched call (cert + lot + fusion)
  getInspections: () => req<any[]>('/inspections'),

  // verify (public)
  verify: (certId: string) => req<any>(`/verify/${certId}`),

  // analytics
  analyticsDashboard: () => req<DashboardStats>('/analytics/dashboard'),
  analyticsQuality: () => req<any>('/analytics/quality'),
  analyticsDefects: () => req<Record<string, number>>('/analytics/defects'),

  // config
  configFusion: () => req<{ weights: Record<string, number>; grading: { gradeA: number; urs: number } }>('/config/fusion'),
  updateConfigFusion: (payload: any) => req('/config/fusion', { method: 'PATCH', body: payload }),

  // demo
  demoRun: (payload: any) => req<any>('/demo/run', { method: 'POST', body: payload }),
  demoPublic: (payload: any) => req<any>('/demo/public', { method: 'POST', body: payload }),
};
