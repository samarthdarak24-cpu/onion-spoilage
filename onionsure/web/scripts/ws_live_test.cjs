/**
 * OnionSure — WebSocket live-sync data-path test.
 *
 * Proves the REAL end-to-end realtime path (master prompt §24 / §39):
 *   1. browser opens ws://host/ws
 *   2. a backend mutation (db.js insert) calls emit() -> realtime.broadcast()
 *   3. the connected client receives a `db:changed` (and `db:lots`, `lots:insert`) frame
 *   4. useLiveData would refetch the (role-scoped) REST API on that event
 *
 * We test BOTH:
 *   - the direct backend socket   ws://localhost:4000/ws
 *   - the dev-proxy socket         ws://localhost:3005/ws   (what the browser actually uses)
 * In both cases REST goes through the proxy :3005 to mirror the SPA exactly.
 *
 * Exit 0 only if every assertion passes.
 */

const path = require('path');
const WebSocket = require(path.join(process.cwd(), 'server', 'node_modules', 'ws'));

const PROXY = 'http://localhost:3005';   // Vite dev server (proxies /api + /ws -> :4000)
const API = `${PROXY}/api`;
const WS_DIRECT = 'ws://localhost:4000/ws';
const WS_PROXY = 'ws://localhost:3005/ws';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Connect a WS, resolve once 'hello' arrives, return a frame collector. */
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const frames = [];
    let helloResolve = null;
    const hello = new Promise((r) => (helloResolve = r));
    ws.on('open', () => {});
    ws.on('message', (raw) => {
      let f;
      try { f = JSON.parse(String(raw)); } catch { return; }
      frames.push(f);
      if (f.event === 'hello' && helloResolve) helloResolve(f);
    });
    ws.on('error', (e) => reject(e));
    ws.on('close', () => {});
    ws.on('open', async () => {
      try { await hello; resolve({ ws, frames }); }
      catch (e) { reject(e); }
    });
  });
}

/** Wait until a frame matching predicate arrives (or timeout). */
function waitForFrame(frames, predicate, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const found = frames.find(predicate);
    if (found) return resolve(found);
    const start = Date.now();
    const iv = setInterval(() => {
      const f = frames.find(predicate);
      if (f) { clearInterval(iv); resolve(f); }
      else if (Date.now() - start > timeoutMs) { clearInterval(iv); resolve(null); }
    }, 50);
  });
}

async function login() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'officer1', password: 'password123' }),
  });
  if (r.status !== 200) throw new Error(`login ${r.status}`);
  const j = await r.json();
  if (!j.token) throw new Error('no token in login response');
  return j.token;
}

async function getCenterId(token) {
  const r = await fetch(`${API}/centers`, { headers: { Authorization: `Bearer ${token}` } });
  const centers = await r.json();
  if (!Array.isArray(centers) || !centers.length) throw new Error('no procurement centers seeded');
  return centers[0].id;
}

async function createLot(token, centerId) {
  const r = await fetch(`${API}/lots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ crop: 'Onion', variety: 'Nashik Red', quantityKg: 50, procurementCenterId: centerId }),
  });
  const j = await r.json();
  if (r.status !== 201) throw new Error(`lot create ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

async function runScenario(label, wsUrl) {
  console.log(`\n=== Scenario: ${label} (${wsUrl}) ===`);
  const { ws, frames } = await connect(wsUrl);
  try {
    const token = await login();
    check(`${label}: REST login returned token`, true);
    const centerId = await getCenterId(token);
    check(`${label}: fetched a procurementCenterId`, true, centerId);

    const before = frames.length;
    const lot = await createLot(token, centerId);
    check(`${label}: POST /api/lots -> 201`, true, lot.id);

    // The mutation must broadcast to the connected socket.
    const dbChanged = await waitForFrame(
      frames,
      (f) => f.event === 'db:changed' && f.payload?.collection === 'lots',
    );
    check(`${label}: received 'db:changed' (collection=lots)`, !!dbChanged,
      dbChanged ? `ts=${dbChanged.ts}` : 'no frame within 5s');

    const dbLots = await waitForFrame(frames, (f) => f.event === 'db:lots');
    check(`${label}: received 'db:lots' frame`, !!dbLots);

    const lotsInsert = await waitForFrame(frames, (f) => f.event === 'lots:insert');
    check(`${label}: received 'lots:insert' frame`, !!lotsInsert,
      lotsInsert ? `payload=${JSON.stringify(lotsInsert.payload)}` : '');

    // Confirm the broadcast carried the new record's id (so useLiveData refetch
    // would now return it).
    const carriedId = lotsInsert?.payload?.id === lot.id || dbLots?.payload?.id === lot.id;
    check(`${label}: broadcast payload references the new lot id`, !!carriedId, lot.id);

    return lot;
  } finally {
    try { ws.close(); } catch {}
  }
}

(async () => {
  console.log('OnionSure WebSocket live-sync data-path test');
  console.log(`Proxy REST base: ${API}`);
  let directLot, proxyLot;
  try {
    directLot = await runScenario('DIRECT (backend socket)', WS_DIRECT);
  } catch (e) {
    check('DIRECT scenario completed', false, String(e.message || e));
  }
  try {
    proxyLot = await runScenario('PROXY (browser path via Vite)', WS_PROXY);
  } catch (e) {
    check('PROXY scenario completed', false, String(e.message || e));
  }

  // Cross-check: the lot we created via the proxy path is now retrievable via
  // the role-scoped GET /api/lots (proves the mutation persisted in the store).
  if (proxyLot) {
    try {
      const token = await login();
      const r = await fetch(`${API}/lots`, { headers: { Authorization: `Bearer ${token}` } });
      const lots = await r.json();
      const found = Array.isArray(lots) && lots.some((l) => l.id === proxyLot.id);
      check('PROXY: new lot is visible via GET /api/lots (persisted & role-scoped)', found, proxyLot.id);
    } catch (e) {
      check('PROXY: GET /api/lots cross-check', false, String(e.message || e));
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
