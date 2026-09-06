/**
 * OnionSure — real-time client.
 *
 * One shared WebSocket for the whole app. Pages subscribe to events and refetch
 * through the normal (role-scoped) REST API, so the socket never needs to know
 * who is allowed to see what.
 *
 * Falls back to polling automatically when the socket is unavailable.
 */

export type RealtimeStatus = 'connecting' | 'live' | 'offline';

export interface RealtimeFrame {
  event: string;
  payload: any;
  ts: number;
}

type Listener = (frame: RealtimeFrame) => void;

const WS_URL =
  (import.meta as any).env?.VITE_WS_URL ||
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<(s: RealtimeStatus) => void>();
  private reconnectTimer: any = null;
  private attempt = 0;
  private closedByUser = false;

  status: RealtimeStatus = 'connecting';
  lastEventAt: number | null = null;
  clientCount = 0;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.closedByUser = false;
    this.setStatus(this.attempt === 0 ? 'connecting' : 'connecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.setStatus('live');
      // Heartbeat keeps proxies from closing an idle socket.
      this.ping();
    };

    ws.onmessage = (ev) => {
      let frame: RealtimeFrame;
      try { frame = JSON.parse(ev.data); } catch { return; }
      if (frame.event === 'pong') return;
      if (frame.event === 'hello') {
        this.clientCount = frame.payload?.clients ?? this.clientCount;
        return;
      }
      this.lastEventAt = Date.now();
      this.listeners.forEach((l) => {
        try { l(frame); } catch (e) { console.error('[realtime] listener error', e); }
      });
    };

    ws.onclose = () => {
      this.ws = null;
      if (!this.closedByUser) this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose always follows; reconnect is handled there.
      this.setStatus('offline');
    };
  }

  private ping() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try { this.ws.send(JSON.stringify({ type: 'ping' })); } catch {}
    setTimeout(() => this.ping(), 25000);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.setStatus('offline');
    // Exponential backoff: 1s, 2s, 4s … capped at 15s.
    const delay = Math.min(15000, 1000 * 2 ** this.attempt);
    this.attempt = Math.min(5, this.attempt + 1);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private setStatus(s: RealtimeStatus) {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach((l) => { try { l(s); } catch {} });
  }

  disconnect() {
    this.closedByUser = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    try { this.ws?.close(); } catch {}
    this.ws = null;
  }

  /** Subscribe to every frame. Returns an unsubscribe function. */
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: (s: RealtimeStatus) => void) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }
}

export const realtime = new RealtimeClient();

/* ------------------------------------------------------------------ */
/* Global "last data refresh" store                                    */
/*                                                                     */
/* Lets the header pill show data freshness without threading props    */
/* through every page.                                                 */
/* ------------------------------------------------------------------ */

let lastDataAt: number | null = null;
let lastDataRefreshing = false;
const dataListeners = new Set<() => void>();

function emitData() { dataListeners.forEach((l) => { try { l(); } catch {} }); }

export function markDataUpdated() {
  lastDataAt = Date.now();
  emitData();
}

export function setGlobalRefreshing(v: boolean) {
  if (lastDataRefreshing === v) return;
  lastDataRefreshing = v;
  emitData();
}

/* ------------------------------------------------------------------ */
/* React helpers                                                       */
/* ------------------------------------------------------------------ */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** Timestamp of the most recent successful data refresh anywhere in the app. */
export function useLastDataUpdated(): { at: number | null; refreshing: boolean } {
  const snapshot = useRef({ at: lastDataAt, refreshing: lastDataRefreshing });
  return useSyncExternalStore(
    (cb) => { dataListeners.add(cb); return () => dataListeners.delete(cb); },
    () => {
      if (snapshot.current.at !== lastDataAt || snapshot.current.refreshing !== lastDataRefreshing) {
        snapshot.current = { at: lastDataAt, refreshing: lastDataRefreshing };
      }
      return snapshot.current;
    },
  );
}

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(
    (cb) => realtime.onStatus(cb),
    () => realtime.status,
    () => 'connecting' as RealtimeStatus,
  );
}

/**
 * Run `handler` whenever a matching event arrives.
 * `pattern` may be an exact event name, an array of names, or a RegExp.
 * Matching is throttled by `minGapMs` so bursts trigger a single call.
 */
export function useRealtimeEvent(
  pattern: string | string[] | RegExp,
  handler: (frame: RealtimeFrame) => void,
  minGapMs = 250,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const matches = (event: string) => {
      if (pattern instanceof RegExp) return pattern.test(event);
      if (Array.isArray(pattern)) return pattern.includes(event);
      return pattern === event;
    };
    let last = 0;
    let timer: any = null;

    const unsubscribe = realtime.subscribe((frame) => {
      if (!matches(frame.event)) return;
      const now = Date.now();
      const wait = Math.max(0, minGapMs - (now - last));
      clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        handlerRef.current(frame);
      }, wait);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [Array.isArray(pattern) ? pattern.join('|') : String(pattern), minGapMs]);
}
