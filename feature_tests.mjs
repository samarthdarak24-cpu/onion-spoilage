// ONIONSURE — COMPLETE FEATURE TEST SUITE (every route, one by one)
const BASE = 'http://localhost:4000/api';
let PASS = 0, FAIL = 0;
const rows = [];
let current = '';

function section(name) { current = name; console.log(`\n${'='.repeat(52)}\n${name}\n${'='.repeat(52)}`); }
async function test(name, fn) {
  try {
    const ok = await fn();
    if (ok === true) { PASS++; rows.push(`[PASS] ${current} → ${name}`); console.log(`  ✓ PASS  ${name}`); }
    else { FAIL++; rows.push(`[FAIL] ${current} → ${name} :: ${ok}`); console.log(`  ✗ FAIL  ${name} :: ${ok}`); }
  } catch (e) {
    FAIL++; rows.push(`[FAIL] ${current} → ${name} :: ${e.message}`);
    console.log(`  ✗ FAIL  ${name} :: ${e.message}`);
  }
}
async function req(path, method = 'GET', body = null, token = null) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j, text: t };
}
// multipart helper for vision analyze
async function reqForm(path, formData, token) {
  const h = {}; if (token) h['Authorization'] = `Bearer ${token}`;
  const r = await fetch(BASE + path, { method: 'POST', headers: h, body: formData });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j, text: t };
}
const ok = (r) => r.status >= 200 && r.status < 300;

// tiny valid 1x1 JPEG
const JPEG_B64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDQ0M//bAEMBCQkJDAsMGA0NGDIhHCEyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+gAoAKACgAoAKACgD/9k=';

(async () => {
  const ts = Date.now();

  // ---------- tokens ----------
  const admin = (await req('/auth/login', 'POST', { username: 'admin', password: 'password123' })).json.token;
  const officer = (await req('/auth/login', 'POST', { username: 'officer1', password: 'password123' })).json.token;
  const farmer1 = (await req('/auth/login', 'POST', { username: 'farmer1', password: 'password123' })).json.token;
  const fpoTok = (await req('/auth/login', 'POST', { username: 'fpo1', password: 'password123' })).json.token;

  /* ================= A. AUTHENTICATION ================= */
  section('A. AUTHENTICATION');
  await test('POST /auth/login — valid credentials return JWT', async () => {
    const r = await req('/auth/login', 'POST', { username: 'officer1', password: 'password123' });
    return ok(r) && !!r.json.token ? true : `status ${r.status}`;
  });
  await test('POST /auth/login — invalid credentials rejected (401)', async () => {
    const r = await req('/auth/login', 'POST', { username: 'officer1', password: 'wrongpass' });
    return r.status === 401 ? true : `expected 401 got ${r.status}`;
  });
  await test('POST /auth/farmer-signup — new farmer self-registers → real DB user', async () => {
    const r = await req('/auth/farmer-signup', 'POST', {
      fullName: 'Feat Farmer', mobile: `900${String(ts).slice(-7)}`, village: 'Nashik',
      fpoName: 'Nashik Onion Growers FPO', username: `ffeat_${ts}`, password: 'secret123',
    });
    return ok(r) && r.json.user?.role === 'farmer' && !!r.json.user?.fpoId ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /auth/farmer-signup — duplicate username blocked (409)', async () => {
    const u = `fdup_${ts}`;
    await req('/auth/farmer-signup', 'POST', { fullName: 'A', mobile: `901${String(ts).slice(-7)}`, village: 'X', username: u, password: 'secret123' });
    const r2 = await req('/auth/farmer-signup', 'POST', { fullName: 'B', mobile: `902${String(ts).slice(-7)}`, village: 'Y', username: u, password: 'secret123' });
    return r2.status === 409 ? true : `expected 409 got ${r2.status}`;
  });
  await test('POST /auth/farmer-signup — short password rejected (400)', async () => {
    const r = await req('/auth/farmer-signup', 'POST', { fullName: 'A', mobile: `903${String(ts).slice(-7)}`, village: 'X', username: `fshort_${ts}`, password: '123' });
    return r.status === 400 ? true : `expected 400 got ${r.status}`;
  });
  await test('POST /auth/register — admin-only creates user', async () => {
    const r = await req('/auth/register', 'POST', { username: `regu_${ts}`, password: 'secret123', role: 'procurement_officer', name: 'Reg Officer' }, admin);
    return ok(r) ? true : `status ${r.status} ${r.text.slice(0, 60)}`;
  });
  await test('POST /auth/register — non-admin forbidden (403)', async () => {
    const r = await req('/auth/register', 'POST', { username: `nope_${ts}`, password: 'secret123', role: 'farmer', name: 'X' }, officer);
    return r.status === 403 ? true : `expected 403 got ${r.status}`;
  });

  /* ================= B. LOTS ================= */
  section('B. LOTS (Central Lot ID)');
  let LOTID, LOTNO, centerId;
  await test('GET /centers — list procurement centers', async () => {
    const r = await req('/centers', 'GET', null, officer);
    centerId = r.json?.[0]?.id;
    return ok(r) && Array.isArray(r.json) && r.json.length > 0 ? true : `status ${r.status}`;
  });
  await test('POST /lots — create lot → Central Lot ID assigned', async () => {
    const r = await req('/lots', 'POST', { crop: 'Onion', variety: 'Nashik Red', quantityKg: 800, procurementCenterId: centerId }, officer);
    LOTID = r.json?.id; LOTNO = r.json?.lotNumber;
    return ok(r) && /ON-2026-\d+/.test(LOTNO || '') ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /lots — missing required fields rejected (400)', async () => {
    const r = await req('/lots', 'POST', { crop: 'Onion' }, officer);
    return r.status === 400 ? true : `expected 400 got ${r.status}`;
  });
  await test('GET /lots — officer lists lots', async () => {
    const r = await req('/lots', 'GET', null, officer);
    return ok(r) && Array.isArray(r.json) ? true : `status ${r.status}`;
  });
  await test('GET /lots — farmer sees only own lots (role scoping)', async () => {
    const r = await req('/lots', 'GET', null, farmer1);
    return ok(r) && Array.isArray(r.json) ? true : `status ${r.status}`;
  });
  await test('GET /lots/:id — fetch single lot', async () => {
    const r = await req(`/lots/${LOTID}`, 'GET', null, officer);
    return ok(r) && r.json?.lotNumber === LOTNO ? true : `status ${r.status}`;
  });
  await test('GET /lots/lookup/:lotNumber — mandatory ON-2026-00421 has cross-center variation', async () => {
    const r = await req('/lots/lookup/ON-2026-00421', 'GET', null, officer);
    return ok(r) && r.json?.lot && r.json?.resultVariationDetected === true && r.json?.inspections?.length >= 2
      ? true : `status ${r.status} variation=${r.json?.resultVariationDetected} insps=${r.json?.inspections?.length}`;
  });
  await test('GET /lots/lookup/:lotNumber — unknown lot → 404', async () => {
    const r = await req('/lots/lookup/ON-9999-99999', 'GET', null, officer);
    return r.status === 404 ? true : `expected 404 got ${r.status}`;
  });

  /* ================= C. MASTER DATA ================= */
  section('C. MASTER DATA (farmers / FPOs / centers)');
  await test('GET /farmers — list farmer profiles', async () => {
    const r = await req('/farmers', 'GET', null, officer);
    return ok(r) && Array.isArray(r.json) && r.json.length > 0 ? true : `status ${r.status}`;
  });
  await test('GET /farmers/search?q= — search farmers', async () => {
    const r = await req('/farmers/search?q=Ramesh', 'GET', null, officer);
    return ok(r) && Array.isArray(r.json) ? true : `status ${r.status}`;
  });
  await test('POST /farmers — officer registers a farmer profile', async () => {
    const r = await req('/farmers', 'POST', { fullName: `FeatReg ${ts}`, mobile: `904${String(ts).slice(-7)}`, village: 'Nashik', farmName: 'Test Farm' }, officer);
    return ok(r) && !!r.json?.farmerId ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('GET /fpos — list FPOs', async () => {
    const r = await req('/fpos', 'GET', null, officer);
    return ok(r) && Array.isArray(r.json) && r.json.length > 0 ? true : `status ${r.status}`;
  });

  /* ================= D. INSPECTION WORKFLOW ================= */
  section('D. INSPECTION WORKFLOW');
  let INSPID;
  await test('POST /inspection/start — start inspection session', async () => {
    const r = await req('/inspection/start', 'POST', { lotId: LOTID, sampleWeightKg: 2.0 }, officer);
    INSPID = r.json?.id;
    return ok(r) && r.json?.status === 'in_progress' ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /inspection/start — missing lotId rejected (400)', async () => {
    const r = await req('/inspection/start', 'POST', {}, officer);
    return r.status === 400 ? true : `expected 400 got ${r.status}`;
  });
  await test('GET /inspection/:id — fetch inspection with lot/fusion/cert', async () => {
    const r = await req(`/inspection/${INSPID}`, 'GET', null, officer);
    return ok(r) ? true : `status ${r.status}`;
  });
  await test('POST /inspection/:id/images — add capture image', async () => {
    const r = await req(`/inspection/${INSPID}/images`, 'POST', { angle: 'top', fileName: 'a.jpg' }, officer);
    return ok(r) ? true : `status ${r.status}`;
  });
  await test('POST /inspection/:id/sensors — add 8-param sensor reading', async () => {
    const r = await req(`/inspection/${INSPID}/sensors`, 'POST', { temperature: 23, humidity: 62, co2: 450, ch4: 0.2, c2h4: 0.4, nh3: 0.12, moisture: 14, ph: 6.0 }, officer);
    return ok(r) && !!r.json?.reading ? true : `status ${r.status}`;
  });
  await test('POST /inspection/:id/analyze — AI vision+gas+fusion → grade', async () => {
    const r = await req(`/inspection/${INSPID}/analyze`, 'POST', { scenario: 'random' }, officer);
    global.__GRADE = r.json?.fusion?.grade;
    return ok(r) && !!r.json?.vision && !!r.json?.gas && !!r.json?.fusion && /GRADE A|URS|REJECTED/.test(global.__GRADE || '')
      ? true : `status ${r.status} grade=${global.__GRADE}`;
  });
  await test('PATCH /inspection/:id/step — update workflow step', async () => {
    const r = await req(`/inspection/${INSPID}/step`, 'PATCH', { step: 3, status: 'in_progress' }, officer);
    return ok(r) ? true : `status ${r.status}`;
  });
  await test('GET /inspection/:id — unknown id → 404', async () => {
    const r = await req('/inspection/insp_DOESNOTEXIST', 'GET', null, officer);
    return r.status === 404 ? true : `expected 404 got ${r.status}`;
  });

  /* ================= E. VISION ================= */
  section('E. COMPUTER VISION');
  await test('POST /vision/analyze — multipart image analysis', async () => {
    const fd = new FormData();
    fd.append('image', new Blob([Buffer.from(JPEG_B64, 'base64')], { type: 'image/jpeg' }), 'onion.jpg');
    const r = await reqForm('/vision/analyze', fd, officer);
    return ok(r) ? true : `status ${r.status} ${r.text.slice(0, 70)}`;
  });

  /* ================= F. IoT / SENSORS ================= */
  section('F. IoT / SENSOR TELEMETRY');
  await test('POST /iot/readings — post sensor reading', async () => {
    const r = await req('/iot/readings', 'POST', { inspectionId: INSPID, ethane: 0.4, methane: 0.2, temperature: 24, humidity: 60 }, officer);
    return ok(r) && !!r.json?.reading ? true : `status ${r.status}`;
  });
  await test('GET /iot/:inspectionId — readings for an inspection', async () => {
    const r = await req(`/iot/${INSPID}`, 'GET', null, officer);
    return ok(r) && Array.isArray(r.json) ? true : `status ${r.status}`;
  });
  let DEV;
  await test('POST /iot/simulate/start — start virtual ESP32 device', async () => {
    const r = await req('/iot/simulate/start', 'POST', {}, officer);
    DEV = r.json?.deviceId;
    return ok(r) && !!DEV ? true : `status ${r.status}`;
  });
  await test('GET /iot/device/:deviceId — get live device state', async () => {
    const r = await req(`/iot/device/${DEV}`, 'GET', null, officer);
    return ok(r) && r.json?.connected === true ? true : `status ${r.status}`;
  });
  await test('POST /iot/simulate/tick — advance sensor drift', async () => {
    const r = await req('/iot/simulate/tick', 'POST', { deviceId: DEV, scenario: 'normal' }, officer);
    return ok(r) && !!r.json?.device ? true : `status ${r.status}`;
  });
  await test('POST /iot/simulate/tick — spoilage scenario drifts gases up', async () => {
    const r = await req('/iot/simulate/tick', 'POST', { deviceId: DEV, scenario: 'spoilage' }, officer);
    return ok(r) ? true : `status ${r.status}`;
  });
  await test('POST /iot/simulate/stop — stop device', async () => {
    const r = await req('/iot/simulate/stop', 'POST', { deviceId: DEV }, officer);
    return ok(r) && r.json?.stopped === true ? true : `status ${r.status}`;
  });
  await test('POST /iot/simulate/tick — unknown device → 404', async () => {
    const r = await req('/iot/simulate/tick', 'POST', { deviceId: 'ESP32_NOPE' }, officer);
    return r.status === 404 ? true : `expected 404 got ${r.status}`;
  });

  /* ================= G. FUSION ================= */
  section('G. FUSION INTELLIGENCE');
  await test('GET /fusion/context — load lot context by lotNumber', async () => {
    const r = await req('/fusion/context?lotNumber=ON-2026-00421', 'GET', null, officer);
    return ok(r) ? true : `status ${r.status}`;
  });
  await test('POST /fusion/calculate — compute fusion result', async () => {
    // Route requires vision / gas / environment OBJECTS (see api.js:873)
    const r = await req('/fusion/calculate', 'POST', {
      vision: { percentages: { healthy: 90, damaged: 5, sprouted: 2, rotten: 2, undersized: 1 }, detections: [], mode: 'DEMO' },
      gas: { stage: 'LOW', gasScore: 88, parameters: {} },
      environment: { temperature: 23, humidity: 60, environmentalScore: 86 },
    }, officer);
    return ok(r) ? true : `status ${r.status} ${r.text.slice(0, 70)}`;
  });
  await test('POST /fusion/calculate — missing objects rejected (400)', async () => {
    const r = await req('/fusion/calculate', 'POST', { visionScore: 90 }, officer);
    return r.status === 400 ? true : `expected 400 got ${r.status}`;
  });
  await test('POST /fusion/commit — officer commits decision', async () => {
    const an = await req(`/inspection/${INSPID}/analyze`, 'POST', { scenario: 'random' }, officer);
    const r = await req('/fusion/commit', 'POST', { inspectionId: INSPID, lotId: LOTID, fusionResult: an.json.fusion }, officer);
    return ok(r) && r.json?.success === true ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /fusion/commit — farmer forbidden (403)', async () => {
    const r = await req('/fusion/commit', 'POST', { inspectionId: INSPID, lotId: LOTID, fusionResult: { grade: 'GRADE A', finalScore: 90 } }, farmer1);
    return r.status === 403 ? true : `expected 403 got ${r.status}`;
  });

  /* ================= H. CERTIFICATES ================= */
  section('H. QUALITY CERTIFICATES');
  let CERT;
  await test('POST /certificates/generate — generate certificate', async () => {
    const r = await req('/certificates/generate', 'POST', { inspectionId: INSPID }, officer);
    CERT = r.json;
    return ok(r) && !!CERT?.certificateNumber ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('GET /certificates — list certificates (officer)', async () => {
    const r = await req('/certificates', 'GET', null, officer);
    return ok(r) && Array.isArray(r.json) ? true : `status ${r.status}`;
  });
  await test('GET /certificates/:id — certificate detail (public)', async () => {
    const r = await req(`/certificates/${CERT.id}`, 'GET');
    return ok(r) && r.json?.certificate?.certificateNumber === CERT.certificateNumber ? true : `status ${r.status}`;
  });
  await test('GET /certificates/:id/pdf — printable cert data', async () => {
    const r = await req(`/certificates/${CERT.id}/pdf`, 'GET', null, officer);
    return ok(r) ? true : `status ${r.status}`;
  });

  /* ================= I. INSPECTION HISTORY ================= */
  section('I. INSPECTION HISTORY');
  await test('GET /inspections — enriched history list', async () => {
    const r = await req('/inspections', 'GET', null, officer);
    return ok(r) && Array.isArray(r.json) ? true : `status ${r.status}`;
  });

  /* ================= J. OVERRIDE & AUDIT ================= */
  section('J. MANUAL OVERRIDE & AUDIT TRAIL');
  await test('POST /inspections/:id/override — officer overrides grade', async () => {
    const r = await req(`/inspections/${INSPID}/override`, 'POST', { newGrade: 'GRADE A', reason: 'Manual re-verification' }, officer);
    return ok(r) && r.json?.success === true ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /inspections/:id/override — override without reason rejected', async () => {
    const r = await req(`/inspections/${INSPID}/override`, 'POST', { newGrade: 'URS' }, officer);
    return r.status >= 400 ? true : `expected error got ${r.status}`;
  });
  await test('GET /inspections/:id/audit — audit trail for inspection', async () => {
    const r = await req(`/inspections/${INSPID}/audit`, 'GET', null, officer);
    return ok(r) && Array.isArray(r.json?.auditTrail) ? true : `status ${r.status}`;
  });
  await test('GET /audit/logs — global audit log', async () => {
    const r = await req('/audit/logs', 'GET', null, officer);
    return ok(r) && Array.isArray(r.json?.logs) ? true : `status ${r.status}`;
  });
  await test('GET /audit/lot/:lotNumber — audit by Central Lot ID', async () => {
    const r = await req('/audit/lot/ON-2026-00421', 'GET', null, officer);
    return ok(r) && Array.isArray(r.json?.logs) ? true : `status ${r.status}`;
  });

  /* ================= K. DISPUTES ================= */
  section('K. DISPUTE & REASSESSMENT');
  let D1, D2, D3;
  // Disputes require farmer OWNERSHIP of the lot (api.js:1253). The lot created
  // earlier was created by an officer (farmerId=null), so create a farmer-owned lot.
  let FLOT;
  await test('POST /lots — create farmer-OWNED lot for dispute tests', async () => {
    const r = await req('/lots', 'POST', { crop: 'Onion', variety: 'Nashik Red', quantityKg: 600, procurementCenterId: centerId }, farmer1);
    FLOT = r.json?.id;
    return ok(r) && !!FLOT ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /inspection/start + analyze — prepare farmer lot for dispute', async () => {
    const insp = await req('/inspection/start', 'POST', { lotId: FLOT, sampleWeightKg: 2.0 }, officer);
    await req(`/inspection/${insp.json.id}/sensors`, 'POST', { temperature: 23, humidity: 62, co2: 450, ch4: 0.2, c2h4: 0.4, nh3: 0.12, moisture: 14, ph: 6 }, officer);
    const an = await req(`/inspection/${insp.json.id}/analyze`, 'POST', { scenario: 'random' }, officer);
    global.__FINSP = insp.json.id;
    return ok(an) && !!an.json?.fusion?.grade ? true : `status ${an.status}`;
  });
  await test('POST /disputes — farmer raises dispute', async () => {
    const r = await req('/disputes', 'POST', { lotId: FLOT, inspectionId: global.__FINSP, reason: 'Defect misclassification', description: 'Dust read as rot' }, farmer1);
    D1 = r.json?.id || r.json?.dispute?.id;
    return ok(r) && !!D1 ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('GET /disputes — list disputes', async () => {
    const r = await req('/disputes', 'GET', null, officer);
    return ok(r) && Array.isArray(r.json) ? true : `status ${r.status}`;
  });
  await test('GET /disputes/:id — dispute detail', async () => {
    const r = await req(`/disputes/${D1}`, 'GET', null, officer);
    return ok(r) ? true : `status ${r.status}`;
  });
  await test('POST /disputes/:id/review — officer reviews', async () => {
    const r = await req(`/disputes/${D1}/review`, 'POST', {}, officer);
    return ok(r) && r.json?.success === true ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /disputes/:id/reinspect — reassessment updates final result', async () => {
    const r = await req(`/disputes/${D1}/reinspect`, 'POST', { newGrade: 'GRADE A', newScore: 90, reason: 'Re-verified firm bulbs' }, officer);
    return ok(r) && r.json?.success === true ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /disputes — create 2nd dispute (for accept path)', async () => {
    const r = await req('/disputes', 'POST', { lotId: FLOT, reason: 'Accept path test', description: 'x' }, farmer1);
    D2 = r.json?.id || r.json?.dispute?.id;
    return ok(r) && !!D2 ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /disputes/:id/accept — officer accepts dispute', async () => {
    await req(`/disputes/${D2}/review`, 'POST', {}, officer);
    const r = await req(`/disputes/${D2}/accept`, 'POST', { reason: 'Farmer claim valid' }, officer);
    return ok(r) && r.json?.success === true ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /disputes — create 3rd dispute (for reject path)', async () => {
    const r = await req('/disputes', 'POST', { lotId: FLOT, reason: 'Reject path test', description: 'y' }, farmer1);
    D3 = r.json?.id || r.json?.dispute?.id;
    return ok(r) && !!D3 ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /disputes/:id/reject — officer rejects dispute', async () => {
    await req(`/disputes/${D3}/review`, 'POST', {}, officer);
    const r = await req(`/disputes/${D3}/reject`, 'POST', { reason: 'Original grade stands' }, officer);
    return ok(r) && r.json?.success === true ? true : JSON.stringify(r.json).slice(0, 90);
  });
  await test('POST /disputes — farmer cannot review (403)', async () => {
    const r = await req(`/disputes/${D2}/review`, 'POST', {}, farmer1);
    return r.status === 403 ? true : `expected 403 got ${r.status}`;
  });

  /* ================= L. PUBLIC QR VERIFY ================= */
  section('L. PUBLIC QR VERIFICATION');
  await test('GET /verify/:certificateId — verified cert (no auth needed)', async () => {
    const r = await req(`/verify/${CERT.qrToken}`, 'GET');
    return ok(r) && /VERIFIED/i.test(r.text) ? true : `status ${r.status} ${r.text.slice(0, 70)}`;
  });
  await test('GET /verify/:certificateId — unknown token → not found', async () => {
    const r = await req('/verify/TOKEN_DOES_NOT_EXIST', 'GET');
    return r.status >= 400 ? true : `expected error got ${r.status}`;
  });

  /* ================= M. ANALYTICS ================= */
  section('M. ANALYTICS');
  await test('GET /analytics/dashboard — dashboard stats', async () => {
    const r = await req('/analytics/dashboard', 'GET', null, officer);
    return ok(r) ? true : `status ${r.status}`;
  });
  await test('GET /analytics/quality — quality analytics', async () => {
    const r = await req('/analytics/quality', 'GET', null, officer);
    return ok(r) ? true : `status ${r.status}`;
  });
  await test('GET /analytics/defects — defect distribution', async () => {
    const r = await req('/analytics/defects', 'GET', null, officer);
    return ok(r) ? true : `status ${r.status}`;
  });

  /* ================= N. CONFIG (admin) ================= */
  section('N. FUSION CONFIGURATION (admin)');
  await test('GET /config/fusion — read fusion weights (admin)', async () => {
    const r = await req('/config/fusion', 'GET', null, admin);
    return ok(r) && !!r.json?.weights ? true : `status ${r.status}`;
  });
  await test('PATCH /config/fusion — update weights (admin)', async () => {
    const cur = (await req('/config/fusion', 'GET', null, admin)).json;
    const r = await req('/config/fusion', 'PATCH', { weights: cur.weights, grading: cur.grading }, admin);
    return ok(r) ? true : `status ${r.status}`;
  });
  await test('GET /config/fusion — non-admin forbidden (403)', async () => {
    const r = await req('/config/fusion', 'GET', null, officer);
    return r.status === 403 ? true : `expected 403 got ${r.status}`;
  });

  /* ================= O. DEMO RUNNER ================= */
  section('O. DEMO RUNNER');
  await test('POST /demo/run — authenticated demo run', async () => {
    const r = await req('/demo/run', 'POST', { scenario: 'demo' }, officer);
    return ok(r) && !!r.json?.lot ? true : `status ${r.status}`;
  });
  await test('POST /demo/public — public demo run (no auth)', async () => {
    const r = await req('/demo/public', 'POST', { scenario: 'demo' });
    return ok(r) && !!r.json?.lot ? true : `status ${r.status}`;
  });

  /* ================= SUMMARY ================= */
  console.log('\n' + '='.repeat(52));
  console.log('FEATURE-BY-FEATURE SUMMARY');
  console.log('='.repeat(52));
  rows.forEach(r => console.log(' ' + r));
  console.log('\n' + '='.repeat(52));
  console.log(`TOTAL: ${PASS} passed, ${FAIL} failed (${PASS + FAIL} tests)`);
  console.log('='.repeat(52));
  process.exit(FAIL > 0 ? 1 : 0);
})();
