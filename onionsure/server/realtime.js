/**
 * OnionSure — real-time event bus.
 *
 * A dependency-light WebSocket layer so every mutation made by any user (or by
 * the IoT simulation) is pushed to every connected dashboard instantly.
 *
 * Design notes:
 *  - Clients connect to ws://<host>/ws and receive `{ event, payload, ts }`.
 *  - `broadcast()` is deliberately dumb: it fans out to everyone. Anything
 *    role-sensitive is filtered client-side by refetching through the API, which
 *    already applies role scoping — so we never leak data over the socket.
 *  - High-frequency writes (sensor ticks) are throttled so a fast simulation
 *    cannot flood the browser.
 */

const { WebSocketServer } = require('ws');

let wss = null;
const clients = new Set();

/** Per-event throttle windows (ms). Anything not listed is sent immediately. */
const THROTTLE = {
  'sensor_readings:insert': 400,
  'db:sensor_readings': 400,
};
const lastSent = new Map();

function now() { return Date.now(); }

/**
 * Attach the WebSocket server to an existing HTTP server.
 * Safe to call once; repeated calls are ignored.
 */
function initRealtime(httpServer) {
  if (wss) return wss;

  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.meta = { ip: req.socket.remoteAddress, since: now() };
    clients.add(ws);

    // Acknowledge so the client knows it is live.
    send(ws, { event: 'hello', payload: { clients: clients.size, ts: now() }, ts: now() });

    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (raw) => {
      // Clients may send a ping/subscribe frame; we only need to keep alive.
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.type === 'ping') send(ws, { event: 'pong', payload: {}, ts: now() });
      } catch { /* ignore malformed frames */ }
    });
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  // Reap dead sockets every 30s.
  const iv = setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) { clients.delete(ws); try { ws.terminate(); } catch {} continue; }
      ws.isAlive = false;
      try { ws.ping(); } catch { clients.delete(ws); }
    }
  }, 30000);
  iv.unref?.();

  console.log('  Realtime: WebSocket live at /ws');
  return wss;
}

function send(ws, frame) {
  if (ws.readyState !== 1) return;
  try { ws.send(JSON.stringify(frame)); } catch { /* socket died mid-write */ }
}

/**
 * Push an event to every connected client.
 * @param {string} event  e.g. 'db:lots' or 'sensor_readings:insert'
 * @param {any} payload   small JSON-safe summary (never send whole collections)
 */
function broadcast(event, payload = {}) {
  if (!wss) return;

  const window = THROTTLE[event];
  if (window) {
    const last = lastSent.get(event) || 0;
    if (now() - last < window) return;
    lastSent.set(event, now());
  }

  const frame = { event, payload, ts: now() };
  for (const ws of clients) send(ws, frame);
}

function clientCount() { return clients.size; }

module.exports = { initRealtime, broadcast, clientCount };
