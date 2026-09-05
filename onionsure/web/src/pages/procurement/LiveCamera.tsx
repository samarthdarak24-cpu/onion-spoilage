import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Camera, RefreshCw, ArrowLeft, Wifi, WifiOff, Play, Pause, Download } from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { PageTransition } from '../../components/motion';

const AI_API_URL = 'http://localhost:5000';

export default function LiveCamera() {
  const [cameraStatus, setCameraStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
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
      const response = await fetch(`${AI_API_URL}/api/camera/status`);
      const data = await response.json();
      
      if (data.available) {
        setCameraStatus('available');
        setError(null);
      } else {
        setCameraStatus('unavailable');
        setError('Camera not detected. Please connect a camera and try again.');
      }
    } catch (err) {
      setCameraStatus('unavailable');
      setError('Unable to connect to AI service. Make sure it is running on port 5000.');
    }
  };

  const startStreaming = () => {
    if (intervalRef.current) return;

    // Fetch frames at ~10 FPS
    intervalRef.current = window.setInterval(async () => {
      try {
        const response = await fetch(`${AI_API_URL}/api/camera/frame?detect=true`);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          // Clean up old URL
          if (frameUrl) {
            URL.revokeObjectURL(frameUrl);
          }
          
          setFrameUrl(url);
          setError(null);

          // Calculate FPS
          const now = Date.now();
          const delta = now - lastFrameTimeRef.current;
          if (delta > 0) {
            setFps(Math.round(1000 / delta));
          }
          lastFrameTimeRef.current = now;
        } else {
          setError('Failed to fetch frame from camera');
          setIsStreaming(false);
        }
      } catch (err) {
        setError('Connection lost to AI service');
        setIsStreaming(false);
      }
    }, 100); // 10 FPS
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

      {/* Camera Feed */}
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
          <strong className="text-ink">How it works:</strong> Defects are highlighted with bounding boxes. 
          Red boxes indicate rejected quality, green boxes indicate healthy onions. 
          Confidence scores are displayed on each detection.
        </div>
      </Card>

      {/* Model Info */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h4 className="mb-2 text-sm font-bold text-ink">Detection Classes</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-reject" />
              <span className="text-muted">Defective/Spoiled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-forest" />
              <span className="text-muted">Healthy/Good Quality</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="mb-2 text-sm font-bold text-ink">Model Details</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Architecture:</span>
              <span className="font-semibold text-ink">YOLOv8</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Source:</span>
              <span className="font-semibold text-ink">Roboflow</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Processing:</span>
              <span className="font-semibold text-forest">Real-time</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="mb-2 text-sm font-bold text-ink">Quick Tips</h4>
          <ul className="space-y-1 text-xs text-muted">
            <li>• Ensure good lighting</li>
            <li>• Position onions clearly</li>
            <li>• Avoid camera shake</li>
            <li>• Download frames for records</li>
          </ul>
        </Card>
      </div>
    </PageTransition>
  );
}
