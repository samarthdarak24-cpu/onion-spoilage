/**
 * LiveCamera.tsx — Live camera inspection with proper open/close lifecycle.
 *
 * Camera lifecycle:
 *   Mount            → GET  /api/camera/status  (probe only, no open)
 *   "Start Stream"   → POST /api/camera/start   (opens camera, LED on)
 *                    → polls GET /api/camera/frame at 2 FPS (plain JPEG)
 *                    → every 5 s also fetches ?detect=true&format=json for YOLO
 *   "Stop Stream"    → POST /api/camera/stop    (releases camera, LED off)
 *   Unmount          → POST /api/camera/stop    (safety cleanup)
 *
 * Timeout budget:
 *   Plain frame  : 4 s  (should arrive in < 100 ms from local camera)
 *   YOLO frame   : 20 s (Roboflow serverless call can take 3-8 s)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, RefreshCw, ArrowLeft, Wifi, WifiOff, Play, Square,
  Download, Boxes, Leaf, Bug, Trash2, Sprout, Ruler, ScanLine,
  AlertCircle,
} from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { PageTransition } from '../../components/motion';

/* ── Config ──────────────────────────────────────────────────────── */
const AI_API_URL          = 'http://localhost:5000';
const PLAIN_FRAME_MS      = 500;   // 2 FPS plain video
const DETECT_EVERY_MS     = 5000;  // run YOLO every 5 s
const PLAIN_TIMEOUT_MS    = 4000;
const DETECT_TIMEOUT_MS   = 20000; // Roboflow can be slow
const MAX_ERRORS          = 4;

/* ── Colour / icon map ───────────────────────────────────────────── */
const CLASS_COLOR: Record<string, string> = {
  healthy:   '#3FAE5A',
  damaged:   '#F4B942',
  rotten:    '#D9534F',
  sprouted:  '#8B5CF6',
  undersized:'#0EA5E9',
};
const CLASS_ICON: Record<string, React.ElementType> = {
  healthy:   Leaf,
  damaged:   Bug,
  rotten:    Trash2,
  sprouted:  Sprout,
  undersized:Ruler,
};

/* ── Types ───────────────────────────────────────────────────────── */
type CamStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'opening' | 'streaming' | 'stopping';

/* ════════════════════════════════════════════════════════════════════ */
export default function LiveCamera() {

  const [camStatus,   setCamStatus]   = useState<CamStatus>('idle');
  const [frameUrl,    setFrameUrl]    = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [fps,         setFps]         = useState(0);
  const [detections,  setDetections]  = useState<any[]>([]);
  const [counts,      setCounts]      = useState<Record<string, number>>({});
  const [visionScore, setVisionScore] = useState<number | null>(null);
  const [lastDetectTs,setLastDetectTs]= useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const plainTimerRef  = useRef<number | null>(null);
  const detectTimerRef = useRef<number | null>(null);
  const lastFrameTime  = useRef<number>(Date.now());
  const errCountRef    = useRef(0);

  /* ── Helpers ───────────────────────────────────────────────────── */

  const clearTimers = () => {
    if (plainTimerRef.current)  { clearInterval(plainTimerRef.current);  plainTimerRef.current  = null; }
    if (detectTimerRef.current) { clearInterval(detectTimerRef.current); detectTimerRef.current = null; }
  };

  const fetchWithTimeout = async (url: string, timeoutMs: number, opts?: RequestInit) => {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...opts, signal: ctrl.signal });
    } finally {
      clearTimeout(tid);
    }
  };

  /* ── 1. Probe camera status (does NOT open it) ─────────────────── */
  const checkStatus = useCallback(async () => {
    setCamStatus('checking');
    setError(null);
    try {
      const res  = await fetchWithTimeout(`${AI_API_URL}/api/camera/status`, 8000);
      const data = await res.json();
      if (data.available || data.open) {
        setCamStatus('available');
      } else {
        setCamStatus('unavailable');
        setError(data.message || 'No camera detected.');
      }
    } catch (e: any) {
      setCamStatus('unavailable');
      setError(e.name === 'AbortError'
        ? 'Camera check timed out. Is the AI service running on port 5000?'
        : 'Cannot reach AI service on port 5000.');
    }
  }, []);

  /* ── 2. Open camera and start streams ─────────────────────────── */
  const startStream = useCallback(async () => {
    setCamStatus('opening');
    setError(null);
    errCountRef.current = 0;

    try {
      const res  = await fetchWithTimeout(`${AI_API_URL}/api/camera/start`, 12000, { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        setCamStatus('unavailable');
        setError(data.message || 'Could not open camera.');
        return;
      }
    } catch (e: any) {
      setCamStatus('unavailable');
      setError('Failed to open camera. Check port 5000.');
      return;
    }

    setCamStatus('streaming');

    /* ── Plain video loop — 2 FPS, no YOLO ── */
    const fetchPlainFrame = async () => {
      try {
        const res = await fetchWithTimeout(
          `${AI_API_URL}/api/camera/frame?detect=false&format=image`,
          PLAIN_TIMEOUT_MS
        );
        if (!res.ok) { errCountRef.current++; return; }
        const blob = await res.blob();
        // Revoke previous blob URL to free memory
        setFrameUrl(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
        setError(null);
        errCountRef.current = 0;
        const now   = Date.now();
        const delta = now - lastFrameTime.current;
        if (delta > 0) setFps(Math.round(1000 / delta));
        lastFrameTime.current = now;
      } catch (e: any) {
        errCountRef.current++;
        if (errCountRef.current >= MAX_ERRORS) {
          setError('Lost connection to camera stream.');
          stopStream();
        }
      }
    };

    plainTimerRef.current = window.setInterval(fetchPlainFrame, PLAIN_FRAME_MS);

    /* ── YOLO detection loop — every 5 s ── */
    const fetchDetection = async () => {
      if (isDetecting) return;   // skip if previous YOLO call is still running
      setIsDetecting(true);
      try {
        const res = await fetchWithTimeout(
          `${AI_API_URL}/api/camera/frame?detect=true&format=json`,
          DETECT_TIMEOUT_MS
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.image) return;

        // Overlay the annotated frame on top of the plain stream briefly
        setFrameUrl(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return data.image; });
        setLastDetectTs(new Date().toLocaleTimeString());

        if (Array.isArray(data.detections)) {
          setDetections(data.detections);
          const c: Record<string, number> = {};
          for (const d of data.detections) c[d.class || 'unknown'] = (c[d.class || 'unknown'] || 0) + 1;
          setCounts(c);
        }
        if (data.statistics?.defect_rate != null) {
          setVisionScore(Math.max(0, Math.round(100 - data.statistics.defect_rate)));
        }
      } catch {
        /* YOLO timeout is non-fatal — plain stream continues */
      } finally {
        setIsDetecting(false);
      }
    };

    detectTimerRef.current = window.setInterval(fetchDetection, DETECT_EVERY_MS);
    // Run detection immediately on start too
    fetchDetection();

  }, [isDetecting]);

  /* ── 3. Stop stream and RELEASE the camera ─────────────────────── */
  const stopStream = useCallback(async () => {
    setCamStatus('stopping');
    clearTimers();
    setFrameUrl(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return null; });
    setFps(0);
    setIsDetecting(false);

    try {
      await fetchWithTimeout(`${AI_API_URL}/api/camera/stop`, 5000, { method: 'POST' });
    } catch {
      /* best-effort — camera may have already closed */
    }

    setCamStatus('available');
  }, []);

  /* ── 4. Probe on mount; release camera on unmount ──────────────── */
  useEffect(() => {
    checkStatus();
    return () => {
      clearTimers();
      // Fire-and-forget on unmount — ensure camera LED turns off
      fetch(`${AI_API_URL}/api/camera/stop`, { method: 'POST' }).catch(() => {});
    };
  }, []);

  /* ── Derived state ─────────────────────────────────────────────── */
  const isStreaming = camStatus === 'streaming';
  const isBusy      = camStatus === 'checking' || camStatus === 'opening' || camStatus === 'stopping';

  const badgeTone = (): 'forest' | 'amber' | 'reject' => {
    if (isStreaming)             return 'forest';
    if (isBusy)                  return 'amber';
    if (camStatus === 'available') return 'amber';
    return 'reject';
  };

  const badgeLabel = () => {
    if (camStatus === 'streaming')  return 'Streaming';
    if (camStatus === 'opening')    return 'Opening…';
    if (camStatus === 'stopping')   return 'Stopping…';
    if (camStatus === 'checking')   return 'Checking…';
    if (camStatus === 'available')  return 'Camera Ready';
    if (camStatus === 'unavailable')return 'No Camera';
    return 'Idle';
  };

  /* ── Download current frame ────────────────────────────────────── */
  const handleDownload = () => {
    if (!frameUrl) return;
    const a    = document.createElement('a');
    a.href     = frameUrl;
    a.download = `onion-${Date.now()}.jpg`;
    a.click();
  };

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <PageTransition className="space-y-5">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/quality/dashboard" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Computer Vision</div>
          <h1 className="truncate text-xl font-extrabold text-ink md:text-2xl">Live Camera Inspection</h1>
          <p className="mt-0.5 text-sm text-muted">Real-time onion quality detection · camera releases when stopped</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={badgeTone()}>
            {isStreaming ? <Wifi size={12} /> : camStatus === 'unavailable' ? <WifiOff size={12} /> : null}
            {badgeLabel()}
          </Badge>
          {isDetecting && (
            <Badge tone="amber">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 mr-1" />
              AI Running
            </Badge>
          )}
        </div>
      </div>

      {/* ── Controls card ────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Camera className="text-forest" size={20} />
              <h3 className="text-base font-bold text-ink">Camera Control</h3>
            </div>

            <p className="mb-3 text-sm text-muted">
              {isStreaming && 'Streaming live. Click Stop to release the camera (LED off).'}
              {camStatus === 'available' && 'Camera detected. Click Start Stream to begin.'}
              {camStatus === 'opening'   && 'Opening camera — please wait…'}
              {camStatus === 'stopping'  && 'Releasing camera…'}
              {camStatus === 'checking'  && 'Checking camera availability…'}
              {camStatus === 'unavailable' && 'Camera not detected.'}
              {camStatus === 'idle'       && 'Checking camera…'}
            </p>

            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-reject/20 bg-reject/5 px-3 py-2 text-sm text-reject">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {/* Start / Stop button */}
              {!isStreaming ? (
                <button
                  onClick={startStream}
                  disabled={isBusy || camStatus === 'unavailable'}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={15} />
                  {camStatus === 'opening' ? 'Opening…' : 'Start Stream'}
                </button>
              ) : (
                <button
                  onClick={stopStream}
                  disabled={isBusy}
                  className="flex items-center gap-2 rounded-xl border-2 border-reject bg-reject/5 px-4 py-2.5 text-sm font-bold text-reject transition hover:bg-reject/10 disabled:opacity-50"
                >
                  <Square size={15} />
                  Stop Stream
                </button>
              )}

              {/* Refresh probe */}
              <button
                onClick={checkStatus}
                disabled={isBusy || isStreaming}
                className="btn-secondary flex items-center gap-2 disabled:opacity-40"
              >
                <RefreshCw size={15} className={isBusy ? 'animate-spin' : ''} />
                Refresh
              </button>

              {/* Download frame */}
              {frameUrl && (
                <button onClick={handleDownload} className="btn-secondary flex items-center gap-2">
                  <Download size={15} />
                  Save Frame
                </button>
              )}
            </div>
          </div>

          {/* FPS badge */}
          <div className="hidden sm:block shrink-0">
            <div className="rounded-xl border border-forest/15 bg-forest/5 px-4 py-3 text-center min-w-[64px]">
              <div className="text-2xl font-extrabold text-forest">{fps}</div>
              <div className="text-xs text-muted">FPS</div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Feed + results ───────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">

        {/* Camera feed */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-ink">Live Feed</h3>
            <div className="flex items-center gap-2">
              {isDetecting && (
                <span className="text-xs text-amber-500 font-semibold animate-pulse">Running AI…</span>
              )}
              {isStreaming && (
                <Badge tone="forest">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-fresh mr-1" />
                  Live
                </Badge>
              )}
            </div>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
            {frameUrl ? (
              <img
                src={frameUrl}
                alt="Live camera feed"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <Camera className="text-slate-600" size={48} />
                <p className="text-sm text-slate-400 text-center px-4">
                  {isBusy ? 'Opening camera…' : 'Click "Start Stream" to begin live inspection'}
                </p>
              </div>
            )}

            {isStreaming && (
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
                <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  {isDetecting ? '🔍 AI Detecting…' : '📷 AI Detection: Active'}
                </div>
                <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  {fps} FPS
                </div>
              </div>
            )}
          </div>

          {lastDetectTs && (
            <p className="mt-2 text-xs text-muted">
              Last AI detection: <span className="font-semibold text-forest">{lastDetectTs}</span>
              {' '}· Next in ~5 s · AI detection runs every 5 s to avoid timeouts
            </p>
          )}

          <div className="mt-3 rounded-lg bg-mint/20 px-4 py-2.5 text-sm text-muted">
            <strong className="text-ink">Note:</strong> Plain video streams at 2 FPS.
            YOLO detection runs every 5 s and annotates the frame with bounding boxes.
          </div>
        </Card>

        {/* Results panel */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <Boxes size={17} className="text-fresh" /> Detection Summary
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="text-[11px] text-muted">Detected</div>
                <div className="text-xl font-bold text-forest">{detections.length}</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="text-[11px] text-muted">Score</div>
                <div className="text-xl font-bold text-forest">
                  {visionScore !== null ? `${visionScore}/100` : '—'}
                </div>
              </div>

              {Object.entries(CLASS_COLOR).map(([cls, color]) => {
                const Icon  = CLASS_ICON[cls];
                const count = counts[cls] || 0;
                return (
                  <div key={cls} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                    <div className="flex items-center gap-1 text-[11px] text-muted">
                      <Icon size={11} style={{ color }} />
                      <span className="capitalize">{cls}</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {detections.length > 0 && (
            <Card className="p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                <ScanLine size={16} className="text-fresh" /> Detections
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-0.5">
                {detections.slice(0, 12).map((d: any, i: number) => (
                  <div
                    key={d.id || i}
                    className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-1.5 text-xs"
                  >
                    <span className="flex items-center gap-2 font-semibold text-ink capitalize">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: CLASS_COLOR[d.class] || '#3FAE5A' }} />
                      {d.label || d.class}
                    </span>
                    {d.confidence != null && (
                      <span className="text-muted">{Math.round(d.confidence * 100)}%</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!isStreaming && detections.length === 0 && (
            <Card className="p-8 text-center">
              <Camera className="mx-auto mb-2 text-muted/30" size={36} />
              <p className="text-sm text-muted">Start streaming to see live detection results</p>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
