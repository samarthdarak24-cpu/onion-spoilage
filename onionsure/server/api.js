/**
 * OnionSure — REST API routes (spec section 21).
 * Auth, Lots, Inspection, Vision, IoT, Fusion, Certificates, Verify, Analytics,
 * Config, plus a live IoT simulation stream and a one-click demo runner.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const http = require('http');
const db = require('./db');
const auth = require('./auth');
const ai = require('./ai');
const config = require('./config');

const requireAuth = auth.requireAuth;

// In-memory upload handling for vision image analysis (images are forwarded to
// the OnionCheck service and never persisted to disk by this server).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

/**
 * Forward a multipart-form (field `image`) + extra fields to the OnionCheck
 * Flask service using only Node's built-in http (no extra dependency).
 */
function forwardToOnionCheck(buffer, filename, fields, cb) {
  const boundary = '----onionsure' + Date.now();
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
    ));
  }
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`
  ));
  parts.push(buffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  const body = Buffer.concat(parts);

  const url = new URL(process.env.ONIONCHECK_URL || 'http://localhost:5000/api/detect');
  const req = http.request({
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
  }, (resp) => {
    let data = '';
    resp.on('data', (c) => (data += c));
    resp.on('end', () => {
      try { cb(null, JSON.parse(data)); } catch (e) { cb(new Error('Invalid response from OnionCheck')); }
    });
  });
  req.on('error', (e) => cb(e));
  req.setTimeout(60000, () => { req.destroy(new Error('OnionCheck timeout')); });
  req.write(body);
  req.end();
}

/* ----------------------------------------------------------------- */
/* AUTH                                                              */
/* ----------------------------------------------------------------- */

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = await auth.authenticate(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = auth.signToken(user);
  const { passwordHash, ...safe } = user;
  res.json({ token, user: safe });
});

router.post('/auth/register', requireAuth('admin'), async (req, res) => {
  try {
    const user = await auth.createUser(req.body);
    const { passwordHash, ...safe } = user;
    res.status(201).json(safe);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ----------------------------------------------------------------- */
/* LOTS                                                              */
/* ----------------------------------------------------------------- */

function visibleLots(user) {
  let lots = db.all('lots');
  if (user.role === 'farmer') lots = lots.filter((l) => l.farmerId === user.farmerId);
  else if (user.role === 'fpo') lots = lots.filter((l) => l.fpoId === user.fpoId);
  return lots;
}

router.post('/lots', requireAuth(), async (req, res) => {
  const b = req.body || {};
  if (!b.crop || !b.quantityKg || !b.procurementCenterId)
    return res.status(400).json({ error: 'crop, quantityKg and procurementCenterId are required' });
  const lot = {
    id: db.id('lot'),
    lotNumber: b.lotNumber || `ON-${new Date().getFullYear()}-${String(db.all('lots').length + 1000)}`,
    farmerId: b.farmerId || userFarmerId(req.user),
    fpoId: b.fpoId || userFpoId(req.user),
    crop: b.crop,
    variety: b.variety || 'Nashik Red',
    quantityKg: b.quantityKg,
    procurementCenterId: b.procurementCenterId,
    inspectorId: req.user.role === 'procurement_officer' ? req.user.sub : (b.inspectorId || null),
    status: 'registered',
    createdAt: db.nowISO(),
  };
  db.insert('lots', lot);
  res.status(201).json(lot);
});

function userFarmerId(u) { return u.role === 'farmer' ? u.farmerId : null; }
function userFpoId(u) { return u.role === 'fpo' ? u.fpoId : (u.role === 'farmer' ? u.fpoId : null); }

router.get('/lots', requireAuth(), (req, res) => {
  res.json(visibleLots(req.user).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
});

router.get('/centers', requireAuth(), (req, res) => res.json(db.all('procurement_centers')));
router.get('/farmers', requireAuth(), (req, res) => res.json(db.all('farmers')));
router.get('/fpos', requireAuth(), (req, res) => res.json(db.all('fpos')));

router.get('/lots/:id', requireAuth(), (req, res) => {
  const lot = db.find('lots', (l) => l.id === req.params.id);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });
  res.json(lot);
});

/* ----------------------------------------------------------------- */
/* INSPECTION                                                        */
/* ----------------------------------------------------------------- */

router.post('/inspection/start', requireAuth(), (req, res) => {
  const b = req.body || {};
  if (!b.lotId) return res.status(400).json({ error: 'lotId required' });
  const lot = db.find('lots', (l) => l.id === b.lotId);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });
  const sess = {
    id: db.id('insp'),
    lotId: lot.id,
    sampleWeightKg: b.sampleWeightKg || 1.5,
    status: 'in_progress',
    mode: b.mode || 'DEMO',
    startedAt: db.nowISO(),
    completedAt: null,
  };
  db.insert('inspection_sessions', sess);
  res.status(201).json(sess);
});

router.post('/inspection/:id/images', requireAuth(), (req, res) => {
  const b = req.body || {};
  const sess = db.find('inspection_sessions', (s) => s.id === req.params.id);
  if (!sess) return res.status(404).json({ error: 'Inspection not found' });
  const img = {
    id: db.id('img'),
    inspectionId: sess.id,
    angle: b.angle || 'front',
    fileName: b.fileName || 'capture.jpg',
    createdAt: db.nowISO(),
  };
  db.insert('inspection_images', img);
  res.status(201).json(img);
});

router.post('/inspection/:id/sensors', requireAuth(), (req, res) => {
  const b = req.body || {};
  const sess = db.find('inspection_sessions', (s) => s.id === req.params.id);
  if (!sess) return res.status(404).json({ error: 'Inspection not found' });
  const reading = {
    id: db.id('sen'),
    inspectionId: sess.id,
    ethane: b.ethane, methane: b.methane, temperature: b.temperature, humidity: b.humidity,
    timestamp: db.nowISO(),
  };
  db.insert('sensor_readings', reading);
  res.status(201).json(reading);
});

router.post('/inspection/:id/analyze', requireAuth(), async (req, res) => {
  const b = req.body || {};
  const sess = db.find('inspection_sessions', (s) => s.id === req.params.id);
  if (!sess) return res.status(404).json({ error: 'Inspection not found' });

  const vision = ai.generateVisionSample(b.scenario || 'random', 100);
  db.update('inspection_sessions', (s) => s.id === sess.id, { visionMode: vision.mode });

  // use provided sensor readings if present, else synthesize a realistic demo reading
  let sr = db.filter('sensor_readings', (r) => r.inspectionId === sess.id);
  let sensor;
  if (sr.length) {
    sensor = sr[sr.length - 1];
  } else {
    sensor = {
      ethane: b.ethane ?? 0.42, methane: b.methane ?? 0.18,
      temperature: b.temperature ?? 25, humidity: b.humidity ?? 61,
    };
  }
  const gas = ai.classifyGas({ ethane: sensor.ethane, methane: sensor.methane, temperature: sensor.temperature, humidity: sensor.humidity });
  const env = ai.scoreEnvironment({ temperature: sensor.temperature, humidity: sensor.humidity });
  const fusion = ai.fuse({ vision, gas, environment: env });

  // persist detections
  for (const det of vision.detections) {
    db.insert('vision_detections', {
      id: db.id('vd'), inspectionId: sess.id, class: det.class,
      confidence: det.confidence, bbox: det.bbox, size: det.size,
    });
  }
  const fusionRec = {
    id: db.id('fus'), inspectionId: sess.id,
    visionScore: fusion.visionScore, gasScore: fusion.gasScore,
    environmentalScore: fusion.environmentalScore, finalScore: fusion.finalScore,
    confidence: fusion.confidence, grade: fusion.grade, riskLevel: fusion.riskLevel,
    earlySpoilageAlert: fusion.earlySpoilageAlert, explanation: fusion.explanation,
  };
  db.insert('fusion_results', fusionRec);
  db.update('inspection_sessions', (s) => s.id === sess.id, { status: 'analyzed', completedAt: db.nowISO() });

  res.json({ vision, gas, environment: env, fusion: fusionRec });
});

router.get('/inspection/:id', requireAuth(), (req, res) => {
  const sess = db.find('inspection_sessions', (s) => s.id === req.params.id);
  if (!sess) return res.status(404).json({ error: 'Inspection not found' });
  const lot = db.find('lots', (l) => l.id === sess.lotId);
  const images = db.filter('inspection_images', (i) => i.inspectionId === sess.id);
  const sensors = db.filter('sensor_readings', (r) => r.inspectionId === sess.id);
  const detections = db.filter('vision_detections', (d) => d.inspectionId === sess.id);
  const fusion = db.find('fusion_results', (f) => f.inspectionId === sess.id);
  const cert = db.find('quality_certificates', (c) => c.inspectionId === sess.id);
  res.json({ session: sess, lot, images, sensors, detections, fusion, certificate: cert });
});

/* ----------------------------------------------------------------- */
/* VISION                                                            */
/* ----------------------------------------------------------------- */

/** Promisified wrapper around forwardToOnionCheck(). */
function callOnionCheck(buffer, filename, fields) {
  return new Promise((resolve, reject) => {
    forwardToOnionCheck(buffer, filename, fields, (err, json) => (err ? reject(err) : resolve(json)));
  });
}

router.post('/vision/analyze', requireAuth(), upload.single('image'), async (req, res) => {
  // A real image was uploaded -> run it through the OnionCheck detector
  // (onioncheck/defect_api.py on :5000, backed by the Roboflow model).
  if (req.file && req.file.buffer) {
    const mime = req.file.mimetype || 'image/jpeg';
    const originalImage = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
    try {
      const ocJson = await callOnionCheck(req.file.buffer, req.file.originalname || 'upload.jpg', {
        return_image: req.body.return_image || 'true',
        pixels_per_cm: String(req.body.pixels_per_cm || 38.0),
      });

      const vision = ai.buildVisionFromOnionCheck(ocJson);
      if (vision) {
        // OnionCheck returns the annotated frame as raw base64 (no data: prefix).
        const b64 = ocJson.annotated_image_base64 || ocJson.annotated_image || null;
        const annotatedImage = b64
          ? (String(b64).startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`)
          : null;
        return res.json({
          ...vision,
          annotatedImage,          // what the frontend renders behind the boxes
          originalImage,           // the untouched upload, so the user always sees their photo
          source: 'onioncheck',
          note: 'Live detection from the OnionCheck Roboflow model.',
        });
      }

      // Service answered but produced nothing usable.
      return res.json({
        ...ai.demoVision(),
        originalImage,
        source: 'demo',
        note: ocJson?.error
          ? `OnionCheck error: ${ocJson.error} — showing simulated result.`
          : 'OnionCheck returned no detections — showing simulated result.',
      });
    } catch (err) {
      console.error('[vision] OnionCheck unavailable:', err.message);
      return res.json({
        ...ai.demoVision(),
        originalImage,
        source: 'demo',
        note: 'OnionCheck service unavailable — showing simulated result.',
      });
    }
  }

  // No image: legacy JSON body (scenario-based DEMO), kept for backwards compat.
  const b = req.body || {};
  res.json({ ...ai.generateVisionSample(b.scenario || 'random', b.total || 100), source: 'demo' });
});

/* ----------------------------------------------------------------- */
/* IOT                                                               */
/* ----------------------------------------------------------------- */

const devices = new Map();

router.post('/iot/readings', requireAuth(), (req, res) => {
  const b = req.body || {};
  const reading = {
    id: db.id('sen'),
    inspectionId: b.inspectionId || null,
    ethane: b.ethane, methane: b.methane, temperature: b.temperature, humidity: b.humidity,
    timestamp: db.nowISO(),
  };
  db.insert('sensor_readings', reading);
  const gas = ai.classifyGas({ ethane: b.ethane, methane: b.methane, temperature: b.temperature, humidity: b.humidity });
  res.status(201).json({ reading, gas });
});

router.get('/iot/:inspectionId', requireAuth(), (req, res) => {
  res.json(db.filter('sensor_readings', (r) => r.inspectionId === req.params.inspectionId));
});

router.get('/iot/device/:deviceId', requireAuth(), (req, res) => {
  const dev = devices.get(req.params.deviceId);
  if (!dev) return res.status(404).json({ error: 'Device not connected' });
  res.json(dev);
});

// Simulation: start a virtual ESP32 pod
router.post('/iot/simulate/start', requireAuth(), (req, res) => {
  const deviceId = `ESP32_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const base = req.body || {};
  const device = {
    deviceId,
    connected: true,
    transport: 'BLE/WiFi',
    battery: 86,
    signal: 'Strong',
    location: 'Procurement Center',
    reading: {
      ethane: base.ethane ?? 0.42,
      methane: base.methane ?? 0.18,
      temperature: base.temperature ?? 24.1,
      humidity: base.humidity ?? 61,
    },
    t: 0,
    mode: 'DEMO', // clearly marked simulated data
  };
  devices.set(deviceId, device);
  res.status(201).json(device);
});

// Simulation tick — returns next drifting reading (realistic sensor noise)
router.post('/iot/simulate/tick', requireAuth(), (req, res) => {
  const { deviceId, scenario } = req.body || {};
  const dev = devices.get(deviceId);
  if (!dev) return res.status(404).json({ error: 'Device not connected. Start simulation first.' });
  dev.t += 1;
  const drift = (v, step, lo, hi) => +Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * step)).toFixed(2);
  if (scenario === 'spoilage') {
    dev.reading.ethane = drift(dev.reading.ethane, 0.05, 0.2, 1.4);
    dev.reading.methane = drift(dev.reading.methane, 0.03, 0.1, 0.8);
  } else {
    dev.reading.ethane = drift(dev.reading.ethane, 0.04, 0.1, 0.9);
    dev.reading.methane = drift(dev.reading.methane, 0.02, 0.05, 0.5);
  }
  dev.reading.temperature = drift(dev.reading.temperature, 0.3, 18, 32);
  dev.reading.humidity = drift(dev.reading.humidity, 1.0, 45, 85);
  dev.battery = Math.max(5, dev.battery - 0.02);
  const gas = ai.classifyGas(dev.reading);
  res.json({ device: dev, gas });
});

router.post('/iot/simulate/stop', requireAuth(), (req, res) => {
  const { deviceId } = req.body || {};
  devices.delete(deviceId);
  res.json({ stopped: true });
});

/* ----------------------------------------------------------------- */
/* FUSION                                                            */
/* ----------------------------------------------------------------- */

router.post('/fusion/calculate', requireAuth(), async (req, res) => {
  const b = req.body || {};
  if (!b.vision || !b.gas || !b.environment)
    return res.status(400).json({ error: 'vision, gas and environment objects required' });
  const result = await ai.fusePython({
    vision: b.vision, gas: b.gas, environment: b.environment,
    weights: b.weights || config.fusion.weights, grading: b.grading || config.grading,
  });
  res.json(result);
});

/* ----------------------------------------------------------------- */
/* CERTIFICATES                                                      */
/* ----------------------------------------------------------------- */

function buildCertificate(inspectionId) {
  const sess = db.find('inspection_sessions', (s) => s.id === inspectionId);
  const fusion = db.find('fusion_results', (f) => f.inspectionId === inspectionId);
  if (!fusion) return null;
  const lot = db.find('lots', (l) => l.id === sess.lotId);
  const vision = db.filter('vision_detections', (d) => d.inspectionId === inspectionId);
  const total = vision.length || 100;
  const pct = (cls) => +(((vision.filter((v) => v.class === cls).length) / total) * 100).toFixed(1);
  const center = db.find('procurement_centers', (c) => c.id === lot.procurementCenterId);
  const cert = {
    id: db.id('cert'),
    inspectionId,
    certificateNumber: `CERT-ON-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`,
    grade: fusion.grade,
    qualityScore: fusion.finalScore,
    grade_a_percentage: pct('healthy'),
    urs_percentage: +(pct('damaged') + pct('sprouted')).toFixed(1),
    rejected_percentage: +(pct('rotten') + pct('undersized')).toFixed(1),
    qrToken: db.id('qr'),
    latitude: center?.latitude || null,
    longitude: center?.longitude || null,
    createdAt: db.nowISO(),
  };
  db.insert('quality_certificates', cert);
  db.insert('qr_verifications', {
    id: db.id('vrf'), certificateId: cert.certificateNumber, token: cert.qrToken, status: 'VERIFIED', verifiedAt: cert.createdAt,
  });
  return cert;
}

router.post('/certificates/generate', requireAuth(), (req, res) => {
  const b = req.body || {};
  if (!b.inspectionId) return res.status(400).json({ error: 'inspectionId required' });
  let cert = db.find('quality_certificates', (c) => c.inspectionId === b.inspectionId);
  if (!cert) cert = buildCertificate(b.inspectionId);
  if (!cert) return res.status(400).json({ error: 'Run analysis before generating a certificate' });
  res.status(201).json(cert);
});

router.get('/certificates', requireAuth(), (req, res) => {
  let certs = db.all('quality_certificates').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (req.user.role === 'farmer') {
    const myLotIds = db.filter('lots', (l) => l.farmerId === req.user.farmerId).map((l) => l.id);
    const myInsp = db.filter('inspection_sessions', (s) => myLotIds.includes(s.lotId)).map((s) => s.id);
    certs = certs.filter((c) => myInsp.includes(c.inspectionId));
  }
  res.json(certs);
});

/**
 * Inspection History — single-call enriched list (cert + lot + fusion) so the
 * frontend doesn't need N+1 detail fetches. Role-scoped like /certificates.
 */
router.get('/inspections', requireAuth(), (req, res) => {
  let certs = db.all('quality_certificates').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (req.user.role === 'farmer') {
    const myLotIds = db.filter('lots', (l) => l.farmerId === req.user.farmerId).map((l) => l.id);
    const myInsp = db.filter('inspection_sessions', (s) => myLotIds.includes(s.lotId)).map((s) => s.id);
    certs = certs.filter((c) => myInsp.includes(c.inspectionId));
  }
  const items = certs.map((c) => {
    const sess = db.find('inspection_sessions', (s) => s.id === c.inspectionId);
    const lot = sess ? db.find('lots', (l) => l.id === sess.lotId) : null;
    const fusion = db.find('fusion_results', (f) => f.inspectionId === c.inspectionId);
    return {
      ...c,
      lotNumber: lot?.lotNumber || '—',
      crop: lot?.crop || null,
      variety: lot?.variety || null,
      centerId: lot?.procurementCenterId || null,
      visionScore: fusion?.visionScore ?? null,
      gasScore: fusion?.gasScore ?? null,
      environmentalScore: fusion?.environmentalScore ?? null,
      finalScore: fusion?.finalScore ?? c.qualityScore,
      riskLevel: fusion?.riskLevel ?? null,
      earlySpoilageAlert: fusion?.earlySpoilageAlert ?? false,
    };
  });
  res.json(items);
});

router.get('/certificates/:id', requireAuth(), (req, res) => {
  const cert = db.find('quality_certificates', (c) => c.id === req.params.id || c.certificateNumber === req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  const sess = db.find('inspection_sessions', (s) => s.id === cert.inspectionId);
  const lot = db.find('lots', (l) => l.id === sess.lotId);
  const fusion = db.find('fusion_results', (f) => f.inspectionId === cert.inspectionId);
  const sensors = db.filter('sensor_readings', (r) => r.inspectionId === cert.inspectionId);
  const center = db.find('procurement_centers', (c) => c.id === lot.procurementCenterId);
  const fpo = db.find('fpos', (f) => f.id === lot.fpoId);
  res.json({ certificate: cert, lot, fusion, sensors, center, fpo });
});

// PDF endpoint — returns printable data; client renders via window.print().
router.get('/certificates/:id/pdf', requireAuth(), (req, res) => {
  const cert = db.find('quality_certificates', (c) => c.id === req.params.id || c.certificateNumber === req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  res.json({ note: 'Render the certificate page and use the browser Print → Save as PDF action.', certificateId: cert.id });
});

/* ----------------------------------------------------------------- */
/* VERIFY (public)                                                   */
/* ----------------------------------------------------------------- */

router.get('/verify/:certificateId', (req, res) => {
  const cert = db.find('quality_certificates', (c) => c.certificateNumber === req.params.certificateId || c.qrToken === req.params.certificateId);
  if (!cert) return res.status(404).json({ error: 'Certificate not found or invalid' });
  const vrf = db.find('qr_verifications', (v) => v.certificateId === cert.certificateNumber);
  const sess = db.find('inspection_sessions', (s) => s.id === cert.inspectionId);
  const lot = db.find('lots', (l) => l.id === sess.lotId);
  const center = db.find('procurement_centers', (c) => c.id === lot.procurementCenterId);
  const fpo = db.find('fpos', (f) => f.id === lot.fpoId);
  // Public view — no private farmer contact details exposed.
  res.json({
    verified: true,
    certificateNumber: cert.certificateNumber,
    lotNumber: lot.lotNumber,
    crop: lot.crop,
    variety: lot.variety,
    grade: cert.grade,
    qualityScore: cert.qualityScore,
    grade_a_percentage: cert.grade_a_percentage,
    urs_percentage: cert.urs_percentage,
    rejected_percentage: cert.rejected_percentage,
    fpo: fpo?.name || null,
    procurementCenter: center?.name || null,
    inspectionDate: sess.completedAt || sess.startedAt,
    status: vrf?.status || 'VERIFIED',
  });
});

/* ----------------------------------------------------------------- */
/* ANALYTICS                                                         */
/* ----------------------------------------------------------------- */

router.get('/analytics/dashboard', requireAuth(), (req, res) => {
  const lots = visibleLots(req.user);
  const inspections = db.all('inspection_sessions');
  const certs = db.all('quality_certificates');
  const fusions = db.all('fusion_results');
  const today = new Date().toISOString().slice(0, 10);
  const todays = inspections.filter((i) => (i.startedAt || '').slice(0, 10) === today).length;
  const pending = lots.filter((l) => l.status === 'registered').length;
  const gradeA = certs.filter((c) => c.grade === 'GRADE A').length;
  const urs = certs.filter((c) => c.grade === 'URS').length;
  const rejected = certs.filter((c) => c.grade === 'REJECTED').length;
  const avg = fusions.length ? Math.round(fusions.reduce((a, f) => a + f.finalScore, 0) / fusions.length) : 0;
  res.json({
    todayInspections: todays,
    pendingInspections: pending,
    gradeALots: gradeA,
    ursLots: urs,
    rejectedLots: rejected,
    totalLots: lots.length,
    totalInspections: inspections.length,
    totalFarmers: db.all('farmers').length,
    totalFPOs: db.all('fpos').length,
    totalBuyers: db.all('buyers').length,
    averageQualityScore: avg,
  });
});

router.get('/analytics/quality', requireAuth(), (req, res) => {
  const certs = db.all('quality_certificates');
  const dist = { 'GRADE A': 0, URS: 0, REJECTED: 0 };
  certs.forEach((c) => { dist[c.grade] = (dist[c.grade] || 0) + 1; });
  // trend by day
  const trend = {};
  certs.forEach((c) => {
    const day = (c.createdAt || '').slice(0, 10);
    if (!trend[day]) trend[day] = { day, avg: 0, n: 0 };
    trend[day].avg += c.qualityScore; trend[day].n += 1;
  });
  const qualityTrend = Object.values(trend).map((t) => ({ day: t.day, avg: Math.round(t.avg / t.n) })).sort((a, b) => a.day < b.day ? -1 : 1);
  // by center
  const byCenter = {};
  certs.forEach((c) => {
    const sess = db.find('inspection_sessions', (s) => s.id === c.inspectionId);
    const lot = sess && db.find('lots', (l) => l.id === sess.lotId);
    const center = lot && db.find('procurement_centers', (x) => x.id === lot.procurementCenterId);
    const key = center?.name || 'Unknown';
    if (!byCenter[key]) byCenter[key] = { center: key, avg: 0, n: 0 };
    byCenter[key].avg += c.qualityScore; byCenter[key].n += 1;
  });
  const qualityByCenter = Object.values(byCenter).map((x) => ({ center: x.center, avg: Math.round(x.avg / x.n) }));
  res.json({ gradeDistribution: dist, qualityTrend, qualityByCenter });
});

router.get('/analytics/defects', requireAuth(), (req, res) => {
  const dets = db.all('vision_detections');
  const dist = { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 };
  dets.forEach((d) => { dist[d.class] = (dist[d.class] || 0) + 1; });
  res.json(dist);
});

/* ----------------------------------------------------------------- */
/* CONFIG (admin)                                                    */
/* ----------------------------------------------------------------- */

router.get('/config/fusion', requireAuth('admin'), (req, res) => {
  res.json({ weights: config.fusion.weights, grading: config.grading });
});

router.patch('/config/fusion', requireAuth('admin'), (req, res) => {
  const b = req.body || {};
  if (b.weights) {
    config.fusion.weights = { ...config.fusion.weights, ...b.weights };
    db.get().config.fusion.weights = config.fusion.weights;
  }
  if (b.grading) {
    config.grading = { ...config.grading, ...b.grading };
    db.get().config.grading = config.grading;
  }
  db.persist();
  res.json({ weights: config.fusion.weights, grading: config.grading });
});

/* ----------------------------------------------------------------- */
/* ONE-CLICK DEMO RUNNER                                             */
/* ----------------------------------------------------------------- */

function runDemo(scenario, inspectorId) {
  const center = db.all('procurement_centers')[0];
  const fpo = db.all('fpos')[0];
  const farmer = db.all('farmers')[0];
  const lot = {
    id: db.id('lot'),
    lotNumber: `ON-${new Date().getFullYear()}-DEMO${Math.floor(Math.random() * 9000 + 1000)}`,
    farmerId: farmer.id, fpoId: fpo.id, crop: 'Onion', variety: 'Nashik Red',
    quantityKg: 1200, procurementCenterId: center.id, inspectorId: inspectorId || null,
    status: 'registered', createdAt: db.nowISO(),
  };
  db.insert('lots', lot);
  const sess = { id: db.id('insp'), lotId: lot.id, sampleWeightKg: 1.5, status: 'in_progress', mode: 'DEMO', startedAt: db.nowISO(), completedAt: null };
  db.insert('inspection_sessions', sess);

  const vision = ai.generateVisionSample('demo', 100);
  // Standard = a clean, obviously healthy batch (all readings below warning
  // thresholds -> gas stage LOW) so the contrast with the spoilage scenario
  // (which forces the EARLY SPOILAGE ALERT) is unmistakable to a judge.
  const sensor = scenario === 'spoilage'
    ? { ethane: 1.1, methane: 0.6, temperature: 29, humidity: 78 }
    : { ethane: 0.22, methane: 0.12, temperature: 24.1, humidity: 61 };
  const gas = ai.classifyGas(sensor);
  const env = ai.scoreEnvironment(sensor);
  const fusion = ai.fuse({ vision, gas, environment: env });
  db.insert('sensor_readings', { id: db.id('sen'), inspectionId: sess.id, ...sensor, timestamp: db.nowISO() });
  for (const det of vision.detections) db.insert('vision_detections', { id: db.id('vd'), inspectionId: sess.id, class: det.class, confidence: det.confidence, bbox: det.bbox, size: det.size });
  db.insert('fusion_results', { id: db.id('fus'), inspectionId: sess.id, visionScore: fusion.visionScore, gasScore: fusion.gasScore, environmentalScore: fusion.environmentalScore, finalScore: fusion.finalScore, confidence: fusion.confidence, grade: fusion.grade, riskLevel: fusion.riskLevel, earlySpoilageAlert: fusion.earlySpoilageAlert, explanation: fusion.explanation });
  db.update('inspection_sessions', (s) => s.id === sess.id, { status: 'analyzed', completedAt: db.nowISO() });
  const cert = buildCertificate(sess.id);
  return { lot, session: sess, vision, gas, environment: env, fusion, certificate: cert };
}

router.post('/demo/run', requireAuth(), async (req, res) => {
  const b = req.body || {};
  res.json(runDemo(b.scenario, req.user.sub));
});

// Public demo — no auth, so a judge can run it straight from the homepage.
router.post('/demo/public', (req, res) => {
  const b = req.body || {};
  res.json(runDemo(b.scenario, null));
});

module.exports = router;
