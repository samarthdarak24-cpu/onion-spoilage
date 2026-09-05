// Full-stack integration test against the REAL server/ backend (port 4000).
// Exercises every role dashboard's data flows: auth, lots, inspection,
// image upload, sensors, fusion, certificates, public verify, analytics,
// config, simulation, and role-scoping / authorization.
const BASE = 'http://localhost:4000/api';
const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, ok: !!cond, detail }); };
const j = (res) => res.json().catch(() => ({}));

async function call(method, path, token, body, isForm = false) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let payload;
  if (isForm) { payload = body; } // FormData
  else { headers['Content-Type'] = 'application/json'; payload = body ? JSON.stringify(body) : undefined; }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const data = await j(res);
  return { status: res.status, data };
}

const results_log = [];
const log = (s) => results_log.push(s);

async function login(username, password) {
  const r = await call('POST', '/auth/login', null, { username, password });
  return r;
}

// ---------- AUTH ----------
log('=== AUTH ===');
const off = await login('officer1', 'password123');
ok('login officer1 → 200 + JWT + role', off.status === 200 && off.data.token && off.data.user?.role === 'procurement_officer', `status=${off.status} role=${off.data.user?.role}`);
const bad = await login('officer1', 'wrong');
ok('login wrong password → 401', bad.status === 401, `status=${bad.status}`);
const noTok = await call('GET', '/lots', null);
ok('protected route without token → 401', noTok.status === 401, `status=${noTok.status}`);

const officerTok = off.data.token;
const fpo = await login('fpo1', 'password123');
const farmer = await login('farmer1', 'password123');
const buyer = await login('buyer1', 'password123');
const admin = await login('admin', 'password123');
ok('login fpo/farmer/buyer/admin → 200', [fpo, farmer, buyer, admin].every(r => r.status === 200), `fpo=${fpo.status} farmer=${farmer.status} buyer=${buyer.status} admin=${admin.status}`);
const fpoTok = fpo.data.token, farmerTok = farmer.data.token, buyerTok = buyer.data.token, adminTok = admin.data.token;

// ---------- PROCUREMENT OFFICER FULL FLOW ----------
log('=== PROCUREMENT OFFICER DASHBOARD FLOW ===');
const dash = await call('GET', '/analytics/dashboard', officerTok);
ok('GET /analytics/dashboard → real stats', dash.status === 200 && typeof dash.data.totalLots === 'number', `todayInspections=${dash.data.todayInspections} gradeALots=${dash.data.gradeALots} avg=${dash.data.averageQualityScore}`);

const centers = await call('GET', '/centers', officerTok);
ok('GET /centers → array', centers.status === 200 && Array.isArray(centers.data) && centers.data.length > 0, `centers=${centers.data?.length}`);
const centerId = centers.data[0].id;

const lots = await call('GET', '/lots', officerTok);
ok('GET /lots → array', lots.status === 200 && Array.isArray(lots.data), `lots=${lots.data?.length}`);

const newLot = await call('POST', '/lots', officerTok, { crop: 'Onion', variety: 'Nashik Red', quantityKg: 1200, procurementCenterId: centerId });
ok('POST /lots → created', newLot.status === 201 && newLot.data.id, `lotId=${newLot.data.id}`);
const lotId = newLot.data.id;

const start = await call('POST', '/inspection/start', officerTok, { lotId, sampleWeightKg: 1.5, mode: 'DEMO' });
ok('POST /inspection/start → session', start.status === 201 && start.data.id, `inspId=${start.data.id}`);
const inspId = start.data.id;

const sensor = await call('POST', `/inspection/${inspId}/sensors`, officerTok, { ethane: 0.42, methane: 0.18, temperature: 24.1, humidity: 61 });
ok('POST /inspection/:id/sensors → stored reading', sensor.status === 201 && sensor.data.id && sensor.data.ethane === 0.42, `readingId=${sensor.data.id} ethane=${sensor.data.ethane}`);
// Real gas classification comes from /iot/readings (used by LiveSensor / postReadings)
const readingGas = await call('POST', '/iot/readings', officerTok, { inspectionId: inspId, ethane: 0.42, methane: 0.18, temperature: 24.1, humidity: 61 });
ok('POST /iot/readings → reading + gas.stage', readingGas.status === 201 && readingGas.data.gas?.stage, `gasStage=${readingGas.data.gas?.stage}`);

const analyze = await call('POST', `/inspection/${inspId}/analyze`, officerTok, { scenario: 'random' });
ok('POST /inspection/:id/analyze → vision+gas+env+fusion', analyze.status === 200 && analyze.data.fusion?.grade && analyze.data.vision?.total, `grade=${analyze.data.fusion?.grade} finalScore=${analyze.data.fusion?.finalScore} risk=${analyze.data.fusion?.riskLevel}`);
ok('analyze → earlySpoilageAlert boolean present', typeof analyze.data.fusion?.earlySpoilageAlert === 'boolean', `earlySpoilageAlert=${analyze.data.fusion?.earlySpoilageAlert}`);

const cert = await call('POST', '/certificates/generate', officerTok, { inspectionId: inspId });
ok('POST /certificates/generate → cert + qrToken', cert.status === 201 && cert.data.qrToken && cert.data.certificateNumber, `certNo=${cert.data.certificateNumber} grade=${cert.data.grade} qa%=${cert.data.grade_a_percentage}`);
const certNo = cert.data.certificateNumber, qr = cert.data.qrToken;

const certsList = await call('GET', '/certificates', officerTok);
ok('GET /certificates → includes new cert', certsList.status === 200 && certsList.data.some(c => c.id === cert.data.id), `certs=${certsList.data?.length}`);

const inspHist = await call('GET', '/inspections', officerTok);
ok('GET /inspections → enriched list', inspHist.status === 200 && Array.isArray(inspHist.data) && inspHist.data[0]?.lotNumber, `items=${inspHist.data?.length}`);

const q = await call('GET', '/analytics/quality', officerTok);
ok('GET /analytics/quality → distribution+trend', q.status === 200 && q.data.gradeDistribution && q.data.qualityTrend, `gradeDist=${JSON.stringify(q.data.gradeDistribution)}`);
const d = await call('GET', '/analytics/defects', officerTok);
ok('GET /analytics/defects → counts', d.status === 200 && typeof d.data.healthy === 'number', `defects=${JSON.stringify(d.data)}`);

const fuse = await call('POST', '/fusion/calculate', officerTok, { vision: { visionScore: 90, confidence: 0.9 }, gas: { gasScore: 50, stage: 'HIGH', confidence: 0.9 }, environment: { environmentScore: 90, confidence: 0.9 }, weights: { vision: 0.45, gas: 0.35, environment: 0.2 }, grading: { gradeA: 85, urs: 65 } });
ok('POST /fusion/calculate → grade + earlySpoilage (HIGH gas) ', fuse.status === 200 && fuse.data.earlySpoilageAlert === true, `grade=${fuse.data.grade} earlySpoilageAlert=${fuse.data.earlySpoilageAlert}`);

// Vision image upload (multipart) → falls back to DEMO when OnionCheck down, returns originalImage
const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
const buf = Buffer.from(pngB64, 'base64');
const form = new FormData();
form.append('image', new Blob([buf], { type: 'image/png' }), 'onion.png');
form.append('pixels_per_cm', '38.0');
const visionUp = await call('POST', '/vision/analyze', officerTok, form, true);
ok('POST /vision/analyze (multipart image) → result + originalImage', visionUp.status === 200 && visionUp.data.originalImage?.startsWith('data:image'), `source=${visionUp.data.source} total=${visionUp.data.total} hasOriginal=${!!visionUp.data.originalImage}`);

// Live sensor simulation
const simStart = await call('POST', '/iot/simulate/start', officerTok, {});
ok('POST /iot/simulate/start → device', simStart.status === 201 && simStart.data.deviceId, `device=${simStart.data.deviceId}`);
const simTick = await call('POST', '/iot/simulate/tick', officerTok, { deviceId: simStart.data.deviceId, scenario: 'spoilage' });
ok('POST /iot/simulate/tick (spoilage) → reading + gas', simTick.status === 200 && simTick.data.device && simTick.data.gas, `ethane=${simTick.data.device?.reading?.ethane} stage=${simTick.data.gas?.stage}`);
const simStop = await call('POST', '/iot/simulate/stop', officerTok, { deviceId: simStart.data.deviceId });
ok('POST /iot/simulate/stop → stopped', simStop.status === 200 && simStop.data.stopped === true, `stopped=${simStop.data.stopped}`);

const farmers = await call('GET', '/farmers', officerTok);
const fpos = await call('GET', '/fpos', officerTok);
ok('GET /farmers + /fpos → arrays', farmers.status === 200 && fpos.status === 200 && farmers.data.length && fpos.data.length, `farmers=${farmers.data.length} fpos=${fpos.data.length}`);

// ---------- PUBLIC VERIFY (no auth) ----------
log('=== PUBLIC VERIFY ===');
const verifyByNo = await call('GET', `/verify/${certNo}`, null);
ok('GET /verify/:certificateNumber (public) → verified', verifyByNo.status === 200 && verifyByNo.data.verified === true, `grade=${verifyByNo.data.grade} score=${verifyByNo.data.qualityScore}`);
const verifyByToken = await call('GET', `/verify/${qr}`, null);
ok('GET /verify/:qrToken (public) → verified', verifyByToken.status === 200 && verifyByToken.data.verified === true, `lot=${verifyByToken.data.lotNumber}`);
const verifyBad = await call('GET', `/verify/NOTREAL`, null);
ok('GET /verify/invalid → 404', verifyBad.status === 404, `status=${verifyBad.status}`);

// ---------- ROLE SCOPING ----------
log('=== ROLE SCOPING ===');
const fpoLots = await call('GET', '/lots', fpoTok);
ok('FPO lots scoped to fpoId', fpoLots.status === 200 && fpoLots.data.every(l => l.fpoId === fpo.data.user.fpoId), `fpoLots=${fpoLots.data.length} fpoId=${fpo.data.user.fpoId}`);
const farmerLots = await call('GET', '/lots', farmerTok);
ok('Farmer lots scoped to farmerId', farmerLots.status === 200 && (farmerLots.data.length === 0 || farmerLots.data.every(l => l.farmerId === farmer.data.user.farmerId)), `farmerLots=${farmerLots.data.length} farmerId=${farmer.data.user.farmerId}`);
const buyerLots = await call('GET', '/lots', buyerTok);
ok('Buyer lots → visible (no scoping)', buyerLots.status === 200 && Array.isArray(buyerLots.data), `buyerLots=${buyerLots.data.length}`);
const buyerCerts = await call('GET', '/certificates', buyerTok);
ok('Buyer certificates → visible', buyerCerts.status === 200 && Array.isArray(buyerCerts.data), `buyerCerts=${buyerCerts.data.length}`);

// ---------- ADMIN + AUTHORIZATION ----------
log('=== ADMIN + AUTHZ ===');
const cfgGet = await call('GET', '/config/fusion', adminTok);
ok('Admin GET /config/fusion → weights', cfgGet.status === 200 && cfgGet.data.weights, `weights=${JSON.stringify(cfgGet.data.weights)}`);
const cfgPatch = await call('PATCH', '/config/fusion', adminTok, { weights: { vision: 0.5, gas: 0.3, environment: 0.2 }, grading: { gradeA: 90, urs: 70 } });
ok('Admin PATCH /config/fusion → persisted', cfgPatch.status === 200 && cfgPatch.data.weights.vision === 0.5 && cfgPatch.data.grading.gradeA === 90, `vision=${cfgPatch.data.weights.vision} gradeA=${cfgPatch.data.grading.gradeA}`);
// revert
await call('PATCH', '/config/fusion', adminTok, { weights: { vision: 0.45, gas: 0.35, environment: 0.2 }, grading: { gradeA: 85, urs: 65 } });
const nonAdminCfg = await call('GET', '/config/fusion', officerTok);
ok('Non-admin GET /config/fusion → 403 (authorization enforced)', nonAdminCfg.status === 403, `status=${nonAdminCfg.status}`);

// ---------- DEMO PUBLIC (no auth) ----------
log('=== DEMO PUBLIC ===');
const demo = await call('POST', '/demo/public', null, { scenario: 'standard' });
ok('POST /demo/public (no auth) → full flow', demo.status === 200 && demo.data.certificate && demo.data.fusion, `grade=${demo.data.fusion?.grade}`);
const demoSpoil = await call('POST', '/demo/public', null, { scenario: 'spoilage' });
ok('POST /demo/public spoilage → earlySpoilageAlert true', demoSpoil.status === 200 && demoSpoil.data.fusion?.earlySpoilageAlert === true, `earlySpoilageAlert=${demoSpoil.data.fusion?.earlySpoilageAlert}`);

// ---------- REPORT ----------
log('\n================ FULL-STACK TEST REPORT ================');
let pass = 0, fail = 0;
for (const r of results) {
  const tag = r.ok ? 'PASS' : 'FAIL';
  if (r.ok) pass++; else fail++;
  log(`${tag}  ${r.name}${r.ok ? '' : '  >> ' + r.detail}`);
}
log(`\nTOTAL: ${results.length}   PASS: ${pass}   FAIL: ${fail}`);
console.log(results_log.join('\n'));
process.exit(fail ? 1 : 0);
