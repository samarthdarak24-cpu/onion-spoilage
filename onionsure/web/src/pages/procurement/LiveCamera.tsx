import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, RefreshCw, ArrowLeft, Wifi, WifiOff, Play, Pause, Download,
  Boxes, Leaf, Bug, Trash2, Sprout, Ruler, ScanLine
} from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { PageTransition } from '../../components/motion';

const AI_API_URL = 'http://localhost:5000';

const CLASS_COLOR: Record<string, string> = {
  healthy: '#3FAE5A',
  damaged: '#F4B942',
  rotten: '#D9534F',
  sprouted: '#8B5CF6',
  undersized: '#0EA5E9',
};

const CLASS_ICON: Record<string, any> = {
  healthy: Leaf,
  damaged: Bug,
  rotten: Trash2,
  sprouted: Sprout,
  undersized: Ruler,
};

export default function LiveCamera() {
  const [cameraStatus, setCameraStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [detections, setDetections] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [visionScore, setVisionScore] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());

  // Check camera status on mount
  useEffect(() => {
    checkCameraStatus();
  }, []);

  // Start/stop streaming
  useEffect(() => {
    if (isStreaming) {
      startStreaming();
    } else {
      stopStreaming();
    }
    return () => stopStreaming();
  }, [isStreaming]);

  const checkCameraStatus = async () => {
    try {
      setCameraStatus('checking');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${AI_API_URL}/api/camera/status`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (data.available) {
        setCameraStatus('available');
        setError(null);
      } else {
        setCameraStatus('unavailable');
        setError('Camera not detected. Please connect a camera and try again.');
      }
    } catch (err: any) {
      setCameraStatus('unavailable');
      if (err.name === 'AbortError') {
        setError('Camera check timed out. The camera might be in use by another application.');
      } else {
        setError('Unable to connect to AI service. Make sure it is running on port 5000.');
      }
    }
  };

  const startStreaming = () => {
    if (intervalRef.current) return;

    let consecutiveErrors = 0;
    const maxErrors = 5;

    // Fetch frames at ~5 FPS (slower for stability)
    intervalRef.current = window.setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout per frame
        
        const response = await fetch(`${AI_API_URL}/api/camera/frame?detect=true`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          // Clean up old URL
          if (frameUrl) {
            URL.revokeObjectURL(frameUrl);
          }
          
          setFrameUrl(url);
          setError(null);
          consecutiveErrors = 0; // Reset error counter

          // Calculate FPS
          const now = Date.now();
          const delta = now - lastFrameTimeRef.current;
          if (delta > 0) {
            setFps(Math.round(1000 / delta));
          }
          lastFrameTimeRef.current = now;
        } else {
          consecutiveErrors++;
          if (consecutiveErrors >= maxErrors) {
            setError('Too many failed frames. Camera may be unavailable.');
            setIsStreaming(false);
          }
        }
      } catch (err: any) {
        consecutiveErrors++;
        if (err.name === 'AbortError') {
          setError('Frame capture timed out. Camera may be slow or busy.');
        } else {
          setError('Connection lost to AI service');
        }
        
        if (consecutiveErrors >= maxErrors) {
          setIsStreaming(false);
        }
      }
    }, 200); // 5 FPS
  };

  const stopStreaming = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (frameUrl) {
      URL.revokeObjectURL(frameUrl);
      setFrameUrl(null);
    }
    setFps(0);
  };

  const handleToggleStream = () => {
    if (cameraStatus !== 'available') {
      checkCameraStatus();
      return;
    }
    setIsStreaming(!isStreaming);
  };

  const handleDownloadFrame = () => {
    if (!frameUrl) return;
    
    const a = document.createElement('a');
    a.href = frameUrl;
    a.download = `onion-inspection-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <PageTransition className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/procurement" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">Computer Vision</div>
          <h1 className="truncate text-xl font-extrabold text-ink md:text-2xl">Live Camera Inspection</h1>
          <p className="mt-0.5 text-sm text-muted">Real-time onion quality detection with AI model</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={cameraStatus === 'available' ? 'forest' : cameraStatus === 'checking' ? 'amber' : 'reject'}>
            {cameraStatus === 'available' && <Wifi size={12} />}
            {cameraStatus === 'unavailable' && <WifiOff size={12} />}
            {cameraStatus === 'checking' ? 'Checking...' : cameraStatus === 'available' ? 'Camera Ready' : 'No Camera'}
          </Badge>
        </div>
      </div>

      {/* Camera Status Card */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Camera className="text-forest" size={20} />
              <h3 className="text-base font-bold text-ink">Camera Status</h3>
            </div>
            <p className="mb-3 text-sm text-muted">
              {cameraStatus === 'available' && 'Camera is connected and ready for inspection'}
              {cameraStatus === 'checking' && 'Checking camera availability...'}
              {cameraStatus === 'unavailable' && 'Camera is not available'}
            </p>
            
            {error && (
              <div className="mb-3 rounded-lg border border-reject/20 bg-reject/5 px-3 py-2 text-sm text-reject">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleToggleStream}
                disabled={cameraStatus === 'checking'}
                className={`btn-primary flex items-center gap-2 ${
                  cameraStatus !== 'available' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isStreaming ? <Pause size={16} /> : <Play size={16} />}
                {isStreaming ? 'Stop Stream' : 'Start Stream'}
              </button>
              
              <button
                onClick={checkCameraStatus}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh Status
              </button>

              {frameUrl && (
                <button
                  onClick={handleDownloadFrame}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download size={16} />
                  Save Frame
                </button>
              )}
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="rounded-lg bg-gradient-to-br from-forest/10 to-fresh/10 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-forest">{fps}</div>
              <div className="text-xs text-muted">FPS</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content: Camera Feed + Live Results */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left: Camera Feed */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-ink">Live Feed</h3>
            {isStreaming && (
              <Badge tone="forest">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-forest" />
                Streaming
              </Badge>
            )}
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
            {frameUrl ? (
              <img
                src={frameUrl}
                alt="Live camera feed"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Camera className="mx-auto mb-3 text-slate-600" size={48} />
                  <p className="text-sm text-slate-400">
                    {isStreaming ? 'Loading feed...' : 'Click "Start Stream" to begin live inspection'}
                  </p>
                </div>
              </div>
            )}
            
            {isStreaming && (
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  AI Detection: Active
                </div>
                <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  {fps} FPS
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-lg bg-mint/20 px-4 py-3 text-sm text-muted">
            <strong className="text-ink">Real-time Detection:</strong> Bounding boxes show detected onions. 
            Red = Defective, Green = Healthy. Confidence scores displayed on each detection.
          </div>
        </Card>

        {/* Right: Live Results (AI Analysis Format) */}
        <div className="space-y-5">
          {/* Detection Summary */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 font-bold text-ink">
              <Boxes size={18} className="text-fresh" /> Detection Summary
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="text-xs text-muted">Total</div>
                <div className="text-xl font-bold text-forest">
                  {detections.length || 0}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="text-xs text-muted">Score</div>
                <div className="text-xl font-bold text-forest">
                  {visionScore}/100
                </div>
              </div>
              
              {Object.entries(CLASS_COLOR).map(([className, color]) => {
                const Icon = CLASS_ICON[className];
                const count = counts[className] || 0;
                return (
                  <div key={className} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Icon size={12} style={{ color }} />
                      {className}
                    </div>
                    <div className="text-xl font-bold" style={{ color }}>
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Detected Defects List */}
          {isStreaming && detections.length > 0 && (
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 font-bold text-ink">
                <ScanLine size={18} className="text-fresh" /> Detected Items
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {detections.slice(0, 10).map((d: any, i: number) => (
                  <div
                    key={d.id || i}
                    className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <i
                        className="h-2 w-2 rounded-full"
                        style={{ background: CLASS_COLOR[d.class] || '#3FAE5A' }}
                      />
                      {d.label || d.class}
                    </span>
                    <span className="text-muted">
                      {d.confidence != null && <>{Math.round(d.confidence * 100)}%</>}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Empty State */}
          {!isStreaming && (
            <Card className="p-8 text-center">
              <Camera className="mx-auto mb-3 text-muted/30" size={40} />
              <p className="text-sm text-muted">
                Start streaming to see live detection results
              </p>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
