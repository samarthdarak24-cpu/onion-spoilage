/**
 * OnionSure — "New Inspection" page workflow test.
 *
 * Mirrors EXACTLY the calls the redesigned web/src/pages/procurement/NewInspection.tsx
 * makes, so the UI wiring is proven against the real backend (server/, :4000) through
 * the Vite proxy (:3000).
 *
 *   Step 0  createLot({ farmerId, fpoId, crop, variety, quantityKg, procurementCenterId })
 *   Step 1  inspection/start -> simulateStart
 *   Step 2  simulateTick (stabilization readings)
 *   Step 3  inspection/:id/images (real upload metadata)
 *   Step 4  inspection/:id/analyze -> { vision, gas, environment, fusion }
 *   Step 5  certificates/generate -> certificateNumber
 *
 * Exit 0 only if every step passes.
 */

const API = 'http://localhost:3000/api';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function jpost(path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
  });
  const b = await r.json().catch(() => null);
  return { status: r.status, body: b };
}
async function jget(path, token) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, body: await r.json().catch(() => null) };
}

(async () => {
  const login = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'officer1', password: 'password123' }),
  })).json();
  const token = login.token;
  check('login (officer1)', !!token, `role=${login.user.role}`);

  // reference data for the lot form
  const [farmers, fpos, centers] = await Promise.all([
    jget('/farmers', token), jget('/fpos', token), jget('/centers', token),
  ]);
  const farmerId = (farmers.body || [])[0]?.id;
  const fpoId = (fpos.body || [])[0]?.id;
  const centerId = (centers.body || [])[0]?.id;
  check('reference data (farmers/fpos/centers) loaded', !!(farmerId && fpoId && centerId),
    `farmer=${farmerId} fpo=${fpoId} center=${centerId}`);

  // STEP 0 — createLot with real farmerId + fpoId (the gap the redesign fixes)
  const lotRes = await jpost('/lots', token, {
    farmerId, fpoId, crop: 'Onion', variety: 'Nashik Red', quantityKg: 750, procurementCenterId: centerId,
  });
  check('POST /lots (farmerId + fpoId) -> 201', lotRes.status === 201, lotRes.body?.id);
  if (lotRes.status !== 201) { finish(); return; }
  const lotId = lotRes.body.id;

  // STEP 1 — start inspection + connect IoT pod
  const insp = await jpost('/inspection/start', token, { lotId, sampleWeightKg: 1.5, mode: 'DEMO' });
  check('POST /inspection/start -> 201', insp.status === 201, insp.body?.id);
  const inspectionId = insp.body.id;
  const pod = await jpost('/iot/simulate/start', token, {});
  check('POST /iot/simulate/start -> 201 (device)', pod.status === 201 && !!pod.body?.deviceId, pod.body?.deviceId);
  const deviceId = pod.body.deviceId;

  // STEP 2 — stabilization tick
  const tick = await jpost('/iot/simulate/tick', token, { deviceId, scenario: 'normal' });
  check('POST /iot/simulate/tick -> reading+gas', tick.status === 200 && !!tick.body?.device?.reading,
    `temp=${tick.body?.device?.reading?.temperature}`);

  // STEP 3 — image upload metadata (4 angles)
  let imgsOk = 0;
  for (const a of ['Front', 'Top', 'Side', 'Close-up']) {
    const r = await jpost(`/inspection/${inspectionId}/images`, token, { angle: a, fileName: `${a}.jpg` });
    if (r.status === 201) imgsOk++;
  }
  check('POST /inspection/:id/images x4 -> 201', imgsOk === 4, `${imgsOk}/4`);

  // STEP 4 — analyze
  const an = await jpost(`/inspection/${inspectionId}/analyze`, token, {
    scenario: 'random',
    ethane: tick.body.device.reading.ethane, methane: tick.body.device.reading.methane,
    temperature: tick.body.device.reading.temperature, humidity: tick.body.device.reading.humidity,
  });
  check('POST /inspection/:id/analyze -> vision+gas+env+fusion',
    an.status === 200 && an.body?.fusion?.grade,
    `grade=${an.body?.fusion?.grade} score=${an.body?.fusion?.finalScore}`);
  check('fusion has subscores + riskLevel', !!an.body?.fusion?.visionScore && !!an.body?.fusion?.riskLevel,
    `risk=${an.body?.fusion?.riskLevel}`);

  // STEP 5 — generate certificate
  const cert = await jpost('/certificates/generate', token, { inspectionId });
  check('POST /certificates/generate -> 201', cert.status === 201, cert.body?.certificateNumber);
  check('certificate carries grade + qualityScore', !!cert.body?.grade && cert.body?.qualityScore != null,
    `grade=${cert.body?.grade} score=${cert.body?.qualityScore}`);

  finish();
})().catch((e) => { console.error('FATAL', e); process.exit(2); });

function finish() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
}
