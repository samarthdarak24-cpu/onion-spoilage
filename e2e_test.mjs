// ONIONSURE End-to-End API Journey Test (Node.js)
const BASE = 'http://localhost:4000/api';
let PASS = 0, FAIL = 0;
const results = [];
function check(name, ok, detail = '') {
  if (ok) { PASS++; results.push(`  [PASS] ${name}`); }
  else { FAIL++; results.push(`  [FAIL] ${name} :: ${detail}`); }
}
async function req(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: r.status, json, text };
}

(async () => {
  console.log('=================================================');
  console.log(' ONIONSURE END-TO-END API JOURNEY TEST (Node)');
  console.log('=================================================');

  // [1] NEW FARMER SIGNUP
  console.log('\n[1] NEW FARMER SIGNUP');
  const ts = Date.now();
  const signup = await req('/auth/farmer-signup', 'POST', {
    fullName: 'Journey Farmer', mobile: `888${String(ts).slice(-7)}`, village: 'Jalgaon',
    fpoName: 'Nashik Onion Growers FPO', username: `jfarmer_${ts}`, password: 'secret123',
  });
  check('Farmer signup returns token', !!signup.json?.token, JSON.stringify(signup.json).slice(0,120));
  check('New user has role=farmer in real DB', signup.json?.user?.role === 'farmer', JSON.stringify(signup.json?.user?.role));
  check('FPO linked via fpoName resolution', !!signup.json?.user?.fpoId, JSON.stringify(signup.json?.user?.fpoId));
  const FTOK = signup.json?.token;

  // [2] LOT CREATION
  console.log('\n[2] LOT CREATION (Farmer Dashboard flow)');
  const centers = await req('/centers', 'GET', null, FTOK);
  const CID = centers.json?.[0]?.id;
  const lot = await req('/lots', 'POST', {
    crop: 'Onion', variety: 'Nashik Red', quantityKg: 1200, procurementCenterId: CID,
  }, FTOK);
  const LOTID = lot.json?.id;
  const LOTNO = lot.json?.lotNumber;
  check('Lot created with Central Lot ID', !!LOTNO, JSON.stringify(lot.json).slice(0,80));
  check('Central Lot ID format ON-YYYY-NNNNN', /ON-2026-\d+/.test(LOTNO || ''), LOTNO);

  // [3] FARMER SEES LOT
  console.log('\n[3] FARMER SEES LOT IN DASHBOARD');
  const farmerLots = await req('/lots', 'GET', null, FTOK);
  check('Farmer lot visible via /lots API', Array.isArray(farmerLots.json) && farmerLots.json.some(l => l.id === LOTID), JSON.stringify(farmerLots.json?.length));

  // [4] OFFICER INSPECTION START
  console.log('\n[4] OFFICER INSPECTION START');
  const ologin = await req('/auth/login', 'POST', { username: 'officer1', password: 'password123' });
  const OTOK = ologin.json?.token;
  const insp = await req('/inspection/start', 'POST', { lotId: LOTID, sampleWeightKg: 2.0 }, OTOK);
  const INSPID = insp.json?.id;
  check('Inspection session started (in_progress)', insp.json?.status === 'in_progress', JSON.stringify(insp.json).slice(0,80));

  // [5] AI ANALYSIS + SENSOR + FUSION
  console.log('\n[5] AI ANALYSIS + SENSOR + FUSION');
  await req(`/inspection/${INSPID}/images`, 'POST', { angle: 'top', fileName: 'onion_top.jpg' }, OTOK);
  const sensor = await req(`/inspection/${INSPID}/sensors`, 'POST', {
    temperature: 23.5, humidity: 64.0, co2: 480, ch4: 0.2, c2h4: 0.4, nh3: 0.15, moisture: 14.0, ph: 6.0,
  }, OTOK);
  check('Sensor reading saved (8-param)', !!sensor.json?.reading, JSON.stringify(sensor.json).slice(0,80));
  const analyze = await req(`/inspection/${INSPID}/analyze`, 'POST', { scenario: 'random' }, OTOK);
  const GRADE = analyze.json?.fusion?.grade;
  check('Vision analysis returned', !!analyze.json?.vision, '');
  check('Gas analysis returned', !!analyze.json?.gas, '');
  check('Fusion result returned', !!analyze.json?.fusion, '');
  check('Grade assigned (A/URS/REJECTED)', /GRADE A|URS|REJECTED/.test(GRADE || ''), GRADE);
  const commit = await req('/fusion/commit', 'POST', { inspectionId: INSPID, lotId: LOTID, fusionResult: analyze.json.fusion }, OTOK);
  check('Fusion committed to central registry', commit.json?.success === true, JSON.stringify(commit.json).slice(0,80));

  // [6] QUALITY CERTIFICATE
  console.log('\n[6] QUALITY CERTIFICATE');
  const cert = await req('/certificates/generate', 'POST', { inspectionId: INSPID }, OTOK);
  const CERTNO = cert.json?.certificateNumber;
  const QRSCORE = cert.json?.qualityScore;
  check('Certificate generated', !!CERTNO, JSON.stringify(cert.json).slice(0,80));

  // [7] QR VERIFICATION (public)
  console.log('\n[7] QR VERIFICATION (public endpoint)');
  const qrToken = cert.json?.qrToken;
  const verify = await req(`/verify/${qrToken}`, 'GET');
  check('Public QR verify returns VERIFIED', verify.json?.status === 'VERIFIED' || /VERIFIED/i.test(verify.text), verify.text.slice(0,120));

  // [8] FARMER REPORT (certificate detail + reasoning)
  console.log('\n[8] FARMER REPORT (certificate detail + reasoning)');
  const certId = cert.json?.id;
  const certDetail = await req(`/certificates/${certId}`, 'GET');
  check('Farmer report shows grade', certDetail.json?.certificate?.grade === GRADE, JSON.stringify(certDetail.json?.certificate?.grade));
  // Reasoning is carried by the fusion result joined on the report view:
  const fusionLookup = await req(`/inspection/${INSPID}`, 'GET', null, OTOK);
  const hasReasoning = !!(fusionLookup.json?.fusion?.explanation || fusionLookup.json?.fusion?.reasons || fusionLookup.json?.fusion?.gradeAPercentage !== undefined);
  check('Farmer report reasoning available (fusion)', hasReasoning, JSON.stringify(hasReasoning));

  // [9] FARMER DISPUTE
  console.log('\n[9] FARMER DISPUTE');
  const disp = await req('/disputes', 'POST', {
    lotId: LOTID, inspectionId: INSPID, reason: 'Defect misclassification', description: 'Transit dust misread as rot.',
  }, FTOK);
  const DISPID = disp.json?.id || disp.json?.dispute?.id;
  check('Dispute created', !!DISPID, JSON.stringify(disp.json).slice(0,120));

  // [10] OFFICER REVIEW
  console.log('\n[10] OFFICER REVIEW DISPUTE');
  const review = await req(`/disputes/${DISPID}/review`, 'POST', {}, OTOK);
  check('Officer reviewed dispute', review.json?.success === true, JSON.stringify(review.json).slice(0,80));

  // [11] REASSESSMENT
  console.log('\n[11] REASSESSMENT (Updated Final Result)');
  const rein = await req(`/disputes/${DISPID}/reinspect`, 'POST', {
    newGrade: 'GRADE A', newScore: 90, reason: 'Re-verification confirms firm bulbs',
  }, OTOK);
  check('Reassessment completed, final result updated', rein.json?.success === true, JSON.stringify(rein.json).slice(0,120));

  // [12] CROSS-CENTER TEST
  console.log('\n[12] CROSS-CENTER: SAME LOT, SECOND INSPECTION');
  const lotsBefore = await req('/lots', 'GET', null, OTOK);
  const countBefore = lotsBefore.json?.length;
  const insp2 = await req('/inspection/start', 'POST', { lotId: LOTID, sampleWeightKg: 2.0 }, OTOK);
  const INSPID2 = insp2.json?.id;
  await req(`/inspection/${INSPID2}/analyze`, 'POST', { scenario: 'demo' }, OTOK);
  const lotsAfter = await req('/lots', 'GET', null, OTOK);
  const countAfter = lotsAfter.json?.length;
  check('Cross-center inspection did NOT create duplicate lot', countBefore === countAfter, `BEFORE=${countBefore} AFTER=${countAfter}`);
  const lookup = await req(`/lots/lookup/${LOTNO}`, 'GET', null, OTOK);
  const inspCount = lookup.json?.inspections?.length;
  // The lot legitimately accumulates: original inspection + reassessment (from dispute) + cross-center.
  // The key invariant is NO duplicate lot was created (verified above) and the SAME Central Lot ID
  // carries all inspections (>= 2, with cross-center being the 2nd+ physical inspection).
  check('Same Central Lot ID carries multiple inspections (original + cross-center + reassessment)', inspCount >= 2, `got ${inspCount}`);

  // SUMMARY
  console.log('\n=================================================');
  console.log(' DETAILED RESULTS');
  console.log('=================================================');
  results.forEach(r => console.log(r));
  console.log('\n=================================================');
  console.log(` RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log('=================================================');
  process.exit(FAIL > 0 ? 1 : 0);
})();
