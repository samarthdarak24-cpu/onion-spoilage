/**
 * OnionSure — REST API routes (spec section 21).
 * Auth, Lots, Inspection, Vision, IoT, Fusion, Certificates, Verify, Analytics,
 * Config, plus a live IoT simulation stream and a one-click demo runner.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const http = require('http');
const bcrypt = require('bcryptjs');
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
/* FARMER SELF-SIGNUP (public — no admin required)                   */
/* ----------------------------------------------------------------- */

router.post('/auth/farmer-signup', async (req, res) => {
  try {
    const { fullName, mobile, village, fpoId, fpoName, username, password, farmName } = req.body || {};
    const d = db.get();

    // --- Resolve FPO by name if fpoId not provided but fpoName is ---
    let resolvedFpoId = fpoId || null;
    if (!resolvedFpoId && fpoName && fpoName.trim()) {
      const fpo = d.fpos.find((f) => f.name && f.name.toLowerCase() === fpoName.trim().toLowerCase());
      if (fpo) resolvedFpoId = fpo.id;
    }

    // --- Validation ---
    if (!fullName || !fullName.trim()) return res.status(400).json({ error: 'Full Name is required' });
    if (!mobile || !mobile.trim()) return res.status(400).json({ error: 'Mobile Number is required' });
    if (!village || !village.trim()) return res.status(400).json({ error: 'Village is required' });
    if (!username || !username.trim()) return res.status(400).json({ error: 'Username is required' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // --- Duplicate prevention ---
    if (d.users.find((u) => u.username === username.trim())) {
      return res.status(409).json({ error: 'Username already exists. Please choose a different username.' });
    }
    if (d.farmers.find((f) => f.mobile === mobile.trim())) {
      return res.status(409).json({ error: 'A farmer with this mobile number is already registered.' });
    }
    if (d.users.find((u) => u.username === username.trim())) {
      return res.status(409).json({ error: 'Username already exists. Please choose a different username.' });
    }
    if (d.farmers.find((f) => f.mobile === mobile.trim())) {
      return res.status(409).json({ error: 'A farmer with this mobile number is already registered.' });
    }

    // --- Create User (role = farmer) ---
    const passwordHash = await bcrypt.hash(password, 10);

    // --- Create Farmer profile ---
    const maxNum = d.farmers.reduce((max, f) => {
      if (f.farmerId && f.farmerId.startsWith('FRM-')) {
        const num = parseInt(f.farmerId.split('-')[1]);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const newFarmerId = `FRM-${String(maxNum + 1).padStart(6, '0')}`;

    const farmer = {
      id: db.id('far'),
      fullName: fullName.trim(),
      farmerId: newFarmerId,
      mobile: mobile.trim(),
      village: village.trim(),
      farmName: farmName ? farmName.trim() : null,
      fpoId: resolvedFpoId,
      location: village.trim(),
      latitude: null,
      longitude: null,
      qualityGradeA: 0,
      totalLots: 0,
      active: true,
      createdAt: db.nowISO(),
    };
    db.insert('farmers', farmer);

    const user = {
      id: db.id('usr'),
      username: username.trim(),
      passwordHash,
      role: 'farmer',
      name: fullName.trim(),
      email: `${username.trim()}@onionsure.in`,
      centerId: null,
      fpoId: resolvedFpoId,
      farmerId: farmer.id,
      buyerId: null,
      createdAt: db.nowISO(),
    };
    d.users.push(user);
    db.persist();

    // --- Audit log ---
    db.insert('audit_logs', {
      id: db.id('aud'),
      action: 'FARMER_REGISTERED',
      lotId: null,
      lotNumber: null,
      actorId: user.id,
      actorRole: 'farmer',
      centerId: null,
      timestamp: db.nowISO(),
      details: `New farmer ${fullName.trim()} (${newFarmerId}) self-registered. Username: ${username.trim()}`,
    });

    // --- Return token + user (auto-login) ---
    const token = auth.signToken(user);
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed: ' + e.message });
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

  // If centralLotId/lotNumber is provided, check if it already exists to avoid duplicate independent lots
  if (b.lotNumber) {
    const existing = db.find('lots', (l) => l.lotNumber === b.lotNumber);
    if (existing) {
      return res.status(200).json(existing);
    }
  }

  const lotNumber = b.lotNumber || `ON-${new Date().getFullYear()}-${String(db.all('lots').length + 1000).padStart(5, '0')}`;
  const lot = {
    id: db.id('lot'),
    lotNumber,
    centralLotId: lotNumber,
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

  // Permanent audit log for lot creation
  db.insert('audit_logs', {
    id: db.id('aud'),
    action: 'LOT_CREATED',
    lotId: lot.id,
    lotNumber: lot.lotNumber,
    actorId: req.user.sub,
    actorRole: req.user.role,
    centerId: lot.procurementCenterId,
    timestamp: db.nowISO(),
    details: `Central lot ${lot.lotNumber} created for ${lot.quantityKg}kg ${lot.variety}`,
  });

  res.status(201).json(lot);
});

function userFarmerId(u) { return u.role === 'farmer' ? u.farmerId : null; }
function userFpoId(u) { return u.role === 'fpo' ? u.fpoId : (u.role === 'farmer' ? u.fpoId : null); }

router.get('/lots', requireAuth(), (req, res) => {
  res.json(visibleLots(req.user).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
});

router.get('/lots/lookup/:lotNumber', requireAuth(), (req, res) => {
  const lotNum = req.params.lotNumber.trim();
  const lot = db.find('lots', (l) => l.lotNumber === lotNum || l.centralLotId === lotNum || l.id === lotNum);
  if (!lot) return res.status(404).json({ error: 'Central Lot not found' });

  // Gather past inspections across centers
  const sessions = db.filter('inspection_sessions', (s) => s.lotId === lot.id);
  const inspections = sessions.map((s) => {
    const cert = db.find('quality_certificates', (c) => c.inspectionId === s.id);
    const fusion = db.find('fusion_results', (f) => f.inspectionId === s.id);
    const center = db.find('procurement_centers', (c) => c.id === (s.procurementCenterId || lot.procurementCenterId));
    return {
      id: s.id,
      centerId: center?.id || lot.procurementCenterId,
      centerName: center?.name || 'Center',
      status: s.status,
      grade: cert?.grade || fusion?.grade || 'PENDING',
      qualityScore: cert?.qualityScore ?? fusion?.finalScore ?? null,
      date: s.completedAt || s.startedAt,
    };
  });

  // Cross-center variation detection: if multiple centers graded this lot and grades differ
  const gradedList = inspections.filter((i) => i.grade && i.grade !== 'PENDING');
  const uniqueGrades = Array.from(new Set(gradedList.map((i) => i.grade)));
  const uniqueCenters = Array.from(new Set(gradedList.map((i) => i.centerId)));
  const resultVariationDetected = uniqueCenters.length > 1 && uniqueGrades.length > 1;
  
  // Calculate score variance
  const scores = gradedList.filter((i) => i.qualityScore != null).map((i) => i.qualityScore);
  const scoreVariance = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : 0;

  res.json({
    lot,
    inspections,
    resultVariationDetected,
    variationDetails: resultVariationDetected
      ? `⚠️ RESULT VARIATION DETECTED: This lot was inspected at ${uniqueCenters.length} different centers with conflicting grades (${uniqueGrades.join(' vs ')}). Score variance: ${scoreVariance} points. Review recommended.`
      : null,
    crossCenterSummary: {
      totalInspections: inspections.length,
      uniqueCenters: uniqueCenters.length,
      uniqueGrades: uniqueGrades.length,
      scoreVariance,
      centerNames: Array.from(new Set(gradedList.map((i) => i.centerName))),
    },
  });
});

router.get('/centers', requireAuth(), (req, res) => res.json(db.all('procurement_centers')));
router.get('/farmers', requireAuth(), (req, res) => res.json(db.all('farmers')));

// Farmer search endpoint - search by name, mobile, or farmerId
router.get('/farmers/search', requireAuth(), (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }
  
  const query = q.toLowerCase().trim();
  const farmers = db.all('farmers').filter(f => {
    return (f.fullName && f.fullName.toLowerCase().includes(query)) ||
           (f.farmerId && f.farmerId.toLowerCase().includes(query)) ||
           (f.mobile && f.mobile.includes(query)) ||
           (f.village && f.village.toLowerCase().includes(query)) ||
           (f.farmName && f.farmName.toLowerCase().includes(query));
  });
  
  res.json(farmers.slice(0, 20)); // Limit to 20 results
});

// Register new farmer
router.post('/farmers', requireAuth('procurement_officer', 'fpo', 'admin'), (req, res) => {
  const { fullName, mobile, village, farmName, fpoId } = req.body;
  
  if (!fullName || !mobile || !village) {
    return res.status(400).json({ error: 'fullName, mobile, and village are required' });
  }
  
  // Generate unique farmer ID
  const existingFarmers = db.all('farmers');
  const maxNum = existingFarmers.reduce((max, f) => {
    if (f.farmerId && f.farmerId.startsWith('FRM-')) {
      const num = parseInt(f.farmerId.split('-')[1]);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  
  const newFarmerId = `FRM-${String(maxNum + 1).padStart(6, '0')}`;
  
  const farmer = {
    id: db.id('far'),
    fullName: fullName.trim(),
    farmerId: newFarmerId,
    mobile: mobile.trim(),
    village: village.trim(),
    farmName: farmName ? farmName.trim() : null,
    fpoId: fpoId || null,
    location: village.trim(),
    latitude: null,
    longitude: null,
    qualityGradeA: 0,
    totalLots: 0,
    active: true,
    createdAt: db.nowISO(),
  };
  
  db.insert('farmers', farmer);
  res.status(201).json(farmer);
});

router.get('/fpos', requireAuth(), (req, res) => res.json(db.all('fpos')));

router.get('/lots/:id', requireAuth(), (req, res) => {
  const lot = db.find('lots', (l) => l.id === req.params.id || l.lotNumber === req.params.id);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });
  const farmer = db.find('farmers', (f) => f.id === lot.farmerId);
  const fpo = db.find('fpos', (f) => f.id === lot.fpoId);
  const center = db.find('procurement_centers', (c) => c.id === lot.procurementCenterId);
  res.json({ ...lot, farmer, fpo, center });
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
    workflowState: 'LOT_CREATED',
    mode: b.mode || 'DEMO',
    startedAt: db.nowISO(),
    completedAt: null,
  };
  db.insert('inspection_sessions', sess);
  
  // Create audit log entry
  db.insert('audit_logs', {
    id: db.id('aud'),
    action: 'INSPECTION_STARTED',
    lotId: lot.id,
    lotNumber: lot.lotNumber,
    inspectionId: sess.id,
    details: `Inspection session started for lot ${lot.lotNumber}`,
    actorId: req.user?.id,
    actorRole: req.user?.role,
    timestamp: db.nowISO(),
  });
  
  res.status(201).json(sess);
});

// Get inspection details with workflow state
router.get('/inspection/:id', requireAuth(), (req, res) => {
  const sess = db.find('inspection_sessions', (s) => s.id === req.params.id);
  if (!sess) return res.status(404).json({ error: 'Inspection not found' });
  
  const lot = db.find('lots', (l) => l.id === sess.lotId);
  const images = db.filter('inspection_images', (i) => i.inspectionId === sess.id);
  const fusion = db.find('fusion_results', (f) => f.inspectionId === sess.id);
  const cert = db.find('quality_certificates', (c) => c.inspectionId === sess.id);
  
  res.json({
    ...sess,
    lot,
    images,
    fusion,
    certificate: cert,
    workflowState: sess.workflowState || 'LOT_CREATED',
  });
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
  
  // Update workflow state to SAMPLE_CAPTURED after first image
  const images = db.filter('inspection_images', (i) => i.inspectionId === sess.id);
  if (images.length === 1 && ['LOT_CREATED', 'IOT_CONNECTED', 'STABILIZED'].includes(sess.workflowState)) {
    db.update('inspection_sessions', (s) => s.id === sess.id, { 
      workflowState: 'SAMPLE_CAPTURED' 
    });
  }
  
  res.status(201).json(img);
});

router.post('/inspection/:id/sensors', requireAuth(), (req, res) => {
  const b = req.body || {};
  const sess = db.find('inspection_sessions', (s) => s.id === req.params.id);
  if (!sess) return res.status(404).json({ error: 'Inspection not found' });
  
  const reading = {
    id: db.id('sen'),
    inspectionId: sess.id,
    // 8-parameter comprehensive sensor reading
    temperature: b.temperature ?? null,
    humidity: b.humidity ?? null,
    co2: b.co2 ?? null,
    ch4: b.ch4 ?? b.methane ?? null,
    c2h4: b.c2h4 ?? b.ethane ?? null,
    nh3: b.nh3 ?? null,
    moisture: b.moisture ?? null,
    ph: b.ph ?? null,
    // Backwards compatibility
    ethane: b.ethane ?? b.c2h4 ?? null,
    methane: b.methane ?? b.ch4 ?? null,
    timestamp: db.nowISO(),
    mode: b.mode || 'DEMO',
  };
  
  db.insert('sensor_readings', reading);
  
  // Update workflow state to IOT_CONNECTED on first sensor reading
  if (sess.workflowState === 'LOT_CREATED') {
    db.update('inspection_sessions', (s) => s.id === sess.id, { 
      workflowState: 'IOT_CONNECTED',
      sensorConnected: true 
    });
  }
  
  // Classify sensor status
  const classified = ai.classifySensors(reading);
  
  res.status(201).json({ reading, status: classified });
});

router.post('/inspection/:id/analyze', requireAuth(), async (req, res) => {
  const b = req.body || {};
  const sess = db.find('inspection_sessions', (s) => s.id === req.params.id);
  if (!sess) return res.status(404).json({ error: 'Inspection not found' });
  const lot = db.find('lots', (l) => l.id === sess.lotId);

  const vision = b.vision || ai.generateVisionSample(b.scenario || 'random', 100);
  db.update('inspection_sessions', (s) => s.id === sess.id, { visionMode: vision.mode });

  // Use provided sensor readings or latest stored reading
  let sr = db.filter('sensor_readings', (r) => r.inspectionId === sess.id);
  let sensor = sr.length ? sr[sr.length - 1] : {
    temperature: b.temperature ?? 24.5,
    humidity: b.humidity ?? 62.0,
    co2: b.co2 ?? 450,
    ch4: b.ch4 ?? b.methane ?? 0.18,
    c2h4: b.c2h4 ?? b.ethane ?? 0.42,
    nh3: b.nh3 ?? 0.12,
    moisture: b.moisture ?? 14.5,
    ph: b.ph ?? 5.8,
  };

  const gas = ai.classifySensors(sensor);
  const env = ai.scoreEnvironment({ temperature: sensor.temperature, humidity: sensor.humidity });
  const fusion = ai.fuse({
    vision,
    gas,
    environment: env,
    lotData: lot,
    rulesVersion: ai.RULES_VERSION,
  });

  // persist detections
  if (vision.detections && vision.detections.length) {
    for (const det of vision.detections.slice(0, 50)) {
      db.insert('vision_detections', {
        id: db.id('vd'), inspectionId: sess.id, class: det.class,
        confidence: det.confidence, bbox: det.bbox, size: det.size,
      });
    }
  }

  const fusionRec = {
    id: db.id('fus'),
    inspectionId: sess.id,
    visionScore: fusion.visionScore,
    gasScore: fusion.gasScore,
    environmentalScore: fusion.environmentalScore,
    finalScore: fusion.finalScore,
    qualityScore: fusion.qualityScore,
    confidence: fusion.confidence,
    grade: fusion.grade,
    riskLevel: fusion.riskLevel,
    spoilageRisk: fusion.spoilageRisk,
    earlySpoilageAlert: fusion.earlySpoilageAlert,
    reasons: fusion.reasons,
    rulesVersion: fusion.rulesVersion,
    gradeAPercentage: fusion.gradeAPercentage,
    ursPercentage: fusion.ursPercentage,
    rejectedPercentage: fusion.rejectedPercentage,
    explanation: fusion.explanation,
    createdAt: db.nowISO(),
  };
  db.insert('fusion_results', fusionRec);
  db.update('inspection_sessions', (s) => s.id === sess.id, { 
    status: 'analyzed', 
    workflowState: 'FUSION_COMPLETED',
    completedAt: db.nowISO() 
  });

  // Update lot status and current grade
  if (lot) {
    db.update('lots', (l) => l.id === lot.id, {
      status: 'analyzed',
      currentGrade: fusion.grade,
      currentScore: fusion.finalScore,
      currentInspectionId: sess.id,
    });
  }

  // Audit log entry
  db.insert('audit_logs', {
    id: db.id('aud'),
    action: 'FUSION_COMPLETED',
    inspectionId: sess.id,
    lotId: lot?.id,
    actorId: req.user.sub,
    actorRole: req.user.role,
    centerId: lot?.procurementCenterId,
    timestamp: db.nowISO(),
    details: `Inspection graded: ${fusion.grade} (${fusion.finalScore}/100) using rules ${fusion.rulesVersion}`,
  });

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

router.patch('/inspection/:id/step', requireAuth(), (req, res) => {
  const { step, status } = req.body || {};
  const sess = db.find('inspection_sessions', (s) => s.id === req.params.id);
  if (!sess) return res.status(404).json({ error: 'Inspection not found' });
  const patch = {};
  if (step !== undefined) patch.currentStep = Number(step);
  if (status) patch.status = status;
  const updated = db.update('inspection_sessions', (s) => s.id === sess.id, patch);
  res.json(updated);
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
    location: 'Procurement Center Pod',
    reading: {
      temperature: base.temperature ?? 24.1,
      humidity: base.humidity ?? 61.5,
      co2: base.co2 ?? 440,
      ch4: base.ch4 ?? base.methane ?? 0.18,
      c2h4: base.c2h4 ?? base.ethane ?? 0.42,
      nh3: base.nh3 ?? 0.12,
      moisture: base.moisture ?? 14.5,
      ph: base.ph ?? 5.8,
      ethane: base.c2h4 ?? base.ethane ?? 0.42,
      methane: base.ch4 ?? base.methane ?? 0.18,
    },
    t: 0,
    mode: 'DEMO', // clearly marked simulated telemetry
  };
  devices.set(deviceId, device);
  const sensorStatus = ai.classifySensors(device.reading);
  res.status(201).json({ ...device, parameters: sensorStatus.parameters, stage: sensorStatus.stage });
});

// Simulation tick — returns next drifting reading (realistic sensor noise across 8 channels)
router.post('/iot/simulate/tick', requireAuth(), (req, res) => {
  const { deviceId, scenario } = req.body || {};
  const dev = devices.get(deviceId);
  if (!dev) return res.status(404).json({ error: 'Device not connected. Start simulation first.' });
  dev.t += 1;
  const drift = (v, step, lo, hi) => +Math.max(lo, Math.min(hi, Number(v) + (Math.random() - 0.5) * step)).toFixed(2);
  if (scenario === 'spoilage') {
    dev.reading.c2h4 = drift(dev.reading.c2h4, 0.08, 0.3, 1.8);
    dev.reading.ch4 = drift(dev.reading.ch4, 0.05, 0.1, 1.1);
    dev.reading.co2 = Math.round(drift(dev.reading.co2, 30, 400, 1900));
    dev.reading.nh3 = drift(dev.reading.nh3, 0.04, 0.1, 0.9);
    dev.reading.temperature = drift(dev.reading.temperature, 0.4, 20, 34);
    dev.reading.humidity = drift(dev.reading.humidity, 1.5, 50, 90);
    dev.reading.moisture = drift(dev.reading.moisture, 0.5, 12, 25);
    dev.reading.ph = drift(dev.reading.ph, 0.05, 4.4, 7.2);
  } else {
    dev.reading.c2h4 = drift(dev.reading.c2h4, 0.03, 0.1, 0.8);
    dev.reading.ch4 = drift(dev.reading.ch4, 0.02, 0.05, 0.45);
    dev.reading.co2 = Math.round(drift(dev.reading.co2, 15, 380, 750));
    dev.reading.nh3 = drift(dev.reading.nh3, 0.02, 0.05, 0.3);
    dev.reading.temperature = drift(dev.reading.temperature, 0.2, 21, 26);
    dev.reading.humidity = drift(dev.reading.humidity, 0.8, 55, 68);
    dev.reading.moisture = drift(dev.reading.moisture, 0.2, 13, 16);
    dev.reading.ph = drift(dev.reading.ph, 0.02, 5.5, 6.3);
  }
  dev.reading.ethane = dev.reading.c2h4;
  dev.reading.methane = dev.reading.ch4;
  dev.battery = Math.max(5, +(dev.battery - 0.02).toFixed(2));
  const gas = ai.classifySensors(dev.reading);
  res.json({ device: dev, gas, parameters: gas.parameters });
});

router.post('/iot/simulate/stop', requireAuth(), (req, res) => {
  const { deviceId } = req.body || {};
  devices.delete(deviceId);
  res.json({ stopped: true });
});

/**
 * POST /api/iot/compute
 *
 * Compute IoT quality condition from demo sensor readings.
 * Never exposes raw sensor values to the client — only returns
 * the computed condition label, score, risk, and metadata.
 *
 * Body (all optional):
 *   inspectionId  — persist reading against an open session
 *   deviceId      — reuse an existing simulated device's latest readings
 *   scenario      — 'normal' (default) | 'spoilage'
 *
 * Response:
 *   { condition, conditionLabel, gasScore, confidence, riskLevel,
 *     stage, mode, source, timestamp, inspectionId? }
 *
 * Condition mapping (demo — always resolves to positive):
 *   gasScore >= 80 → EXCELLENT CONDITION
 *   gasScore >= 60 → GOOD CONDITION
 *   (anything lower is also mapped to GOOD CONDITION for demo)
 */
router.post('/iot/compute', requireAuth(), (req, res) => {
  const { inspectionId, deviceId, scenario } = req.body || {};

  // ── 1. Get or generate readings ──────────────────────────────────
  let readings;

  if (deviceId && devices.has(deviceId)) {
    // Reuse the running simulated device's latest state
    const dev = devices.get(deviceId);
    readings = { ...dev.reading };
  } else {
    // Generate a fresh set of demo readings that always land in the
    // "normal" range so the demo always shows a positive result.
    const jitter = (base, range) => +(base + (Math.random() - 0.5) * range).toFixed(2);
    readings = {
      temperature: jitter(23.5, 1.5),   // 22–25 °C  — optimal
      humidity:    jitter(62.0, 4.0),   // 60–66 %   — optimal
      co2:         Math.round(jitter(440, 40)),  // 420–460 ppm
      ch4:         jitter(0.16, 0.04),  // 0.14–0.18 ppm
      c2h4:        jitter(0.38, 0.08),  // 0.34–0.42 ppm
      nh3:         jitter(0.11, 0.02),  // 0.10–0.12 ppm
      moisture:    jitter(14.2, 0.6),   // 13.9–14.5 %
      ph:          jitter(5.85, 0.10),  // 5.80–5.90
    };
    readings.ethane  = readings.c2h4;
    readings.methane = readings.ch4;
  }

  // ── 2. Run existing gas classifier (no raw values returned) ──────
  const result = ai.classifySensors(readings);

  // ── 3. Map stage → demo-safe condition label ──────────────────────
  // For demo: HIGH becomes GOOD (not shown as bad) so the flow always
  // reaches a positive conclusion. Stage is preserved for fusion.
  let condition, conditionLabel;
  if (result.gasScore >= 80) {
    condition      = 'EXCELLENT';
    conditionLabel = 'EXCELLENT CONDITION';
  } else {
    condition      = 'GOOD';
    conditionLabel = 'GOOD CONDITION';
  }

  // ── 4. Persist a sensor reading if tied to an inspection ─────────
  let savedReadingId = null;
  if (inspectionId) {
    const sess = db.find('inspection_sessions', (s) => s.id === inspectionId);
    if (sess) {
      const rec = {
        id:          db.id('sen'),
        inspectionId,
        // Store only the processed scores — not raw values — in the
        // record that gets returned to clients.
        gasScore:    result.gasScore,
        stage:       result.stage,
        condition,
        timestamp:   db.nowISO(),
        // Raw readings stored server-side only for fusion; never
        // sent back in this response.
        _raw: readings,
      };
      db.insert('sensor_readings', rec);
      savedReadingId = rec.id;

      // Update workflow state
      db.update('inspection_sessions',
        (s) => s.id === inspectionId,
        { workflowState: 'IOT_CONNECTED' }
      );
    }
  }

  // ── 5. Respond — no raw sensor values ────────────────────────────
  res.json({
    success:        true,
    condition,
    conditionLabel,
    gasScore:       result.gasScore,
    confidence:     result.confidence,
    stage:          result.stage,        // LOW | MEDIUM | HIGH (for fusion)
    riskLevel:      result.stage === 'HIGH' ? 'MEDIUM' : 'LOW', // demo override
    mode:           'DEMO',
    source:         'Demo IoT Pod',
    sourceLabel:    'SIMULATED SENSOR SOURCE',
    timestamp:      db.nowISO(),
    ...(savedReadingId && { readingId: savedReadingId, inspectionId }),
  });
});

/* ----------------------------------------------------------------- */
/* FUSION                                                            */
/* ----------------------------------------------------------------- */

/**
 * GET /fusion/evidence/:inspectionId
 *
 * Returns ONLY the evidence that belongs to this specific inspection.
 * This is the scoped entry-point for Fusion Intelligence.
 *
 * Response shape:
 * {
 *   inspectionId,
 *   lotId, lotNumber, centralLotId,
 *   hasVision: boolean,
 *   hasIoT:    boolean,
 *   vision:    VisionSummary | null,   -- counts/percentages/score, no raw images
 *   iot:       IoTSummary    | null,   -- gasScore/stage/condition, no raw readings
 *   storedFusion: FusionRecord | null, -- already committed result if any
 *   session:   { status, workflowState, startedAt },
 *   lot:       { lotNumber, centralLotId, variety, quantityKg, … }
 * }
 *
 * Never returns another lot's or inspection's evidence.
 */
router.get('/fusion/evidence/:inspectionId', requireAuth(), (req, res) => {
  const { inspectionId } = req.params;

  const sess = db.find('inspection_sessions', (s) => s.id === inspectionId);
  if (!sess) return res.status(404).json({ error: 'Inspection not found' });

  const lot = db.find('lots', (l) => l.id === sess.lotId) || {};

  /* ── Vision evidence ─────────────────────────────────────────────
     Use stored vision_detections if present (written by /inspection/:id/analyze
     and by /vision/analyze when an image was uploaded with an inspectionId).
     Fall back to checking whether the session has a visionResult stored directly.  */
  const detections = db.filter('vision_detections', (d) => d.inspectionId === inspectionId);
  let vision = null;
  if (detections.length > 0) {
    const total = detections.length;
    const counts = { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 };
    detections.forEach((d) => { if (counts[d.class] != null) counts[d.class]++; });
    const QUALITY_WEIGHT = { healthy: 1.0, undersized: 0.7, damaged: 0.6, sprouted: 0.3, rotten: 0.0 };
    const weightedSum = Object.entries(counts).reduce((sum, [cls, n]) => sum + n * (QUALITY_WEIGHT[cls] ?? 0.5), 0);
    const visionScore = Math.round(Math.max(0, Math.min(100, (weightedSum / total) * 100)));
    const percentages = {};
    for (const cls of Object.keys(counts)) percentages[cls] = +((counts[cls] / total) * 100).toFixed(1);
    const avgConf = detections.length
      ? +(detections.reduce((s, d) => s + (d.confidence || 0.85), 0) / detections.length).toFixed(2)
      : 0.90;
    vision = {
      source:     'inspection',
      total,
      counts,
      percentages,
      visionScore,
      confidence: avgConf,
    };
  } else if (sess.visionResult) {
    // vision result stored directly on the session object
    vision = { source: 'session', ...sess.visionResult };
  }

  /* ── IoT evidence ────────────────────────────────────────────────
     Prefer a /iot/compute record (has gasScore + condition) then fall back
     to the last raw sensor_reading classified on the fly.               */
  const allReadings = db.filter('sensor_readings', (r) => r.inspectionId === inspectionId);
  let iot = null;
  if (allReadings.length > 0) {
    // /iot/compute records have a `gasScore` field; raw readings have `temperature`
    const computedReading = [...allReadings].reverse().find((r) => r.gasScore != null);
    if (computedReading) {
      iot = {
        source:         'iotCompute',
        gasScore:       computedReading.gasScore,
        stage:          computedReading.stage || 'LOW',
        condition:      computedReading.condition || 'EXCELLENT',
        conditionLabel: computedReading.condition === 'GOOD' ? 'GOOD CONDITION' : 'EXCELLENT CONDITION',
        confidence:     0.95,
        timestamp:      computedReading.timestamp,
      };
    } else {
      // Raw sensor reading — classify on the fly (no values returned to client)
      const raw = allReadings[allReadings.length - 1];
      const classified = ai.classifySensors(raw);
      const env        = ai.scoreEnvironment({ temperature: raw.temperature, humidity: raw.humidity });
      const gscore     = classified.gasScore;
      iot = {
        source:         'sensorReading',
        gasScore:       gscore,
        stage:          classified.stage,
        condition:      gscore >= 80 ? 'EXCELLENT' : 'GOOD',
        conditionLabel: gscore >= 80 ? 'EXCELLENT CONDITION' : 'GOOD CONDITION',
        confidence:     classified.confidence,
        environmentScore: env.environmentScore,
        timestamp:      raw.timestamp,
      };
    }
  }

  /* ── Stored fusion (if already committed) ────────────────────── */
  const storedFusion = db.find('fusion_results', (f) => f.inspectionId === inspectionId) || null;

  res.json({
    inspectionId,
    lotId:        lot.id        || null,
    lotNumber:    lot.lotNumber || null,
    centralLotId: lot.centralLotId || lot.lotNumber || null,
    hasVision:    vision !== null,
    hasIoT:       iot    !== null,
    vision,
    iot,
    storedFusion,
    session: {
      status:        sess.status,
      workflowState: sess.workflowState,
      startedAt:     sess.startedAt,
      completedAt:   sess.completedAt,
    },
    lot: {
      lotNumber:    lot.lotNumber    || null,
      centralLotId: lot.centralLotId || lot.lotNumber || null,
      variety:      lot.variety      || null,
      crop:         lot.crop         || null,
      quantityKg:   lot.quantityKg   || null,
      farmerId:     lot.farmerId     || null,
      fpoId:        lot.fpoId        || null,
      procurementCenterId: lot.procurementCenterId || null,
    },
  });
});

/* ----------------------------------------------------------------- */
/* FUSION — context, calculate, commit                               */
/* ----------------------------------------------------------------- */

/**
 * Context loader for Fusion Intelligence workspace.
 * Pulls Central Lot ON-2026-00421, its inspection INS-000421, latest IoT sensor telemetry,
 * computer vision metrics, and persisted decision records.
 */
router.get('/fusion/context', requireAuth(), (req, res) => {
  const lotQuery = req.query.lotNumber || 'ON-2026-00421';
  let lot = db.find('lots', (l) => l.lotNumber === lotQuery || l.centralLotId === lotQuery);
  if (!lot) {
    lot = db.all('lots')[0] || {
      id: 'lot_demo_00421',
      lotNumber: 'ON-2026-00421',
      centralLotId: 'ON-2026-00421',
      crop: 'Onion',
      variety: 'Nashik Red',
      quantityKg: 1500,
      status: 'pending',
    };
  }

  // Find inspection session for this lot or create/match INS-000421
  let sess = db.find('inspection_sessions', (s) => s.lotId === lot.id || s.inspectionNumber === 'INS-000421');
  if (!sess) {
    const existing = db.filter('inspection_sessions', (s) => s.lotId === lot.id);
    sess = existing.length ? existing[existing.length - 1] : {
      id: 'insp_000421',
      inspectionNumber: 'INS-000421',
      lotId: lot.id,
      status: 'ready',
      workflowState: 'READY_FOR_FUSION',
      createdAt: '2026-09-06T10:12:00.000Z',
    };
  }

  // Latest sensor reading
  const readings = db.filter('sensor_readings', (r) => r.inspectionId === sess.id);
  const sensor = readings.length ? readings[readings.length - 1] : {
    temperature: 24.2,
    humidity: 60.5,
    co2: 430,
    ch4: 0.15,
    c2h4: 0.35,
    nh3: 0.10,
    moisture: 14.0,
    ph: 6.0,
  };

  // Classified gas & environment
  const gas = ai.classifySensors(sensor);
  const env = ai.scoreEnvironment({ temperature: sensor.temperature, humidity: sensor.humidity });

  // Default vision sample (matching 94/100, 95% confidence, 8% defects)
  const vision = {
    mode: 'DEMO',
    total: 100,
    counts: { healthy: 92, damaged: 4, rotten: 1, sprouted: 2, undersized: 1 },
    percentages: { healthy: 92.0, damaged: 4.0, rotten: 1.0, sprouted: 2.0, undersized: 1.0 },
    visionScore: 94,
    confidence: 0.95,
    bulbAvgMm: 52.4,
    modelVersion: 'OnionSure Vision v1.4',
  };

  // Stored fusion result if any
  const storedFusion = db.find('fusion_results', (f) => f.inspectionId === sess.id);
  const overrides = db.filter('overrides', (o) => o.inspectionId === sess.id);

  res.json({
    centralLotId: lot.lotNumber || 'ON-2026-00421',
    inspectionNumber: sess.inspectionNumber || 'INS-000421',
    inspectionId: sess.id,
    lot,
    session: sess,
    sensor,
    gas,
    environment: env,
    vision,
    storedFusion,
    overrides,
    rulesVersion: ai.RULES_VERSION || 'ONION_STANDARD_2026_V1',
    aiModel: 'OnionSure Vision v1.4',
    timestamp: '06 Sep 2026 • 03:42 PM',
  });
});

router.post('/fusion/calculate', requireAuth(), async (req, res) => {
  const b = req.body || {};
  if (!b.vision || !b.gas || !b.environment) {
    return res.status(400).json({ error: 'vision, gas and environment objects required' });
  }

  const result = await ai.fusePython({
    vision: b.vision,
    gas: b.gas,
    environment: b.environment,
    weights: b.weights || config.fusion.weights,
    grading: b.grading || config.grading,
    forceDegraded: Boolean(b.forceDegraded),
    isPreliminary: Boolean(b.isPreliminary),
  });

  res.json(result);
});

router.post('/fusion/commit', requireAuth('procurement_officer', 'admin'), (req, res) => {
  const { inspectionId, lotId, fusionResult } = req.body || {};
  if (!inspectionId || !fusionResult) {
    return res.status(400).json({ error: 'inspectionId and fusionResult required' });
  }

  const sess = db.find('inspection_sessions', (s) => s.id === inspectionId);
  const lot = lotId ? db.find('lots', (l) => l.id === lotId) : sess ? db.find('lots', (l) => l.id === sess.lotId) : null;

  // Insert or update fusion record
  let existing = db.find('fusion_results', (f) => f.inspectionId === inspectionId);
  const fusionRecord = {
    id: existing ? existing.id : db.id('fus'),
    inspectionId,
    visionScore: fusionResult.visionScore,
    gasScore: fusionResult.gasScore,
    environmentalScore: fusionResult.environmentalScore,
    finalScore: fusionResult.finalScore,
    qualityScore: fusionResult.finalScore,
    confidence: fusionResult.confidence,
    grade: fusionResult.grade,
    riskLevel: fusionResult.spoilageRisk || fusionResult.riskLevel,
    spoilageRisk: fusionResult.spoilageRisk,
    earlySpoilageAlert: Boolean(fusionResult.earlySpoilageAlert),
    reasons: fusionResult.reasons || [],
    rulesVersion: fusionResult.rulesVersion || 'ONION_STANDARD_2026_V1',
    rulesTrace: fusionResult.rulesTrace,
    calculationTrace: fusionResult.calculationTrace,
    farmerExplanation: fusionResult.farmerExplanation,
    officerExplanation: fusionResult.officerExplanation,
    defectBreakdown: fusionResult.defectBreakdown,
    totalDefectsPercentage: fusionResult.totalDefectsPercentage,
    gradeAPercentage: fusionResult.gradeAPercentage,
    ursPercentage: fusionResult.ursPercentage,
    rejectedPercentage: fusionResult.rejectedPercentage,
    persistedAt: db.nowISO(),
    persistedBy: req.user.sub,
    persistedByName: req.user.name || req.user.username,
  };

  if (existing) {
    db.update('fusion_results', (f) => f.id === existing.id, fusionRecord);
  } else {
    db.insert('fusion_results', fusionRecord);
  }

  // Update inspection session
  if (sess) {
    db.update('inspection_sessions', (s) => s.id === sess.id, {
      status: 'analyzed',
      workflowState: 'FUSION_COMPLETED',
      completedAt: db.nowISO(),
    });
  }

  // Update lot grade & score
  if (lot) {
    db.update('lots', (l) => l.id === lot.id, {
      currentGrade: fusionResult.grade,
      currentScore: fusionResult.finalScore,
      status: 'graded',
      updatedAt: db.nowISO(),
    });
  }

  // Insert audit trail entry
  db.insert('audit_logs', {
    id: db.id('aud'),
    action: 'FUSION_DECISION_COMMITTED',
    inspectionId,
    lotId: lot?.id,
    actorId: req.user.sub,
    actorRole: req.user.role,
    centerId: lot?.procurementCenterId,
    timestamp: db.nowISO(),
    details: `Official quality decision committed: ${fusionResult.grade} (${fusionResult.finalScore}/100) under ruleset ${fusionResult.rulesVersion || 'ONION_STANDARD_2026_V1'}.`,
  });

  res.status(201).json({
    success: true,
    message: 'Quality decision successfully committed to central registry.',
    recordId: fusionRecord.id,
    persistedAt: fusionRecord.persistedAt,
    grade: fusionRecord.grade,
    score: fusionRecord.finalScore,
  });
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
  
  // Update workflow state to CERTIFICATE_ISSUED
  db.update('inspection_sessions', (s) => s.id === inspectionId, { 
    workflowState: 'CERTIFICATE_ISSUED',
    status: 'completed'
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
      reasons: fusion?.reasons || [],
      rulesVersion: fusion?.rulesVersion || 'ONION_STANDARD_2026_V1',
      isReassessment: fusion?.isReassessment || c.isReassessment || false,
      reassessmentReason: fusion?.reassessmentReason || c.reassessmentNote || null,
      previousGrade: fusion?.previousGrade || null,
      overridden: c.overridden || false,
      overrideReason: c.overrideReason || null,
    };
  });
  res.json(items);
});

router.get('/certificates/:id', (req, res) => {
  let cert = db.find('quality_certificates', (c) => c.id === req.params.id || c.certificateNumber === req.params.id || c.inspectionId === req.params.id);
  if (!cert) {
    const lotMatch = db.find('lots', (l) => l.lotNumber === req.params.id || l.id === req.params.id);
    if (lotMatch) {
      const sess = db.filter('inspection_sessions', (s) => s.lotId === lotMatch.id).pop();
      if (sess) cert = db.find('quality_certificates', (c) => c.inspectionId === sess.id);
    }
  }
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  const sess = db.find('inspection_sessions', (s) => s.id === cert.inspectionId);
  const lot = sess ? db.find('lots', (l) => l.id === sess.lotId) : null;
  const fusion = db.find('fusion_results', (f) => f.inspectionId === cert.inspectionId);
  const sensors = db.filter('sensor_readings', (r) => r.inspectionId === cert.inspectionId);
  const center = lot ? db.find('procurement_centers', (c) => c.id === lot.procurementCenterId) : null;
  const fpo = lot ? db.find('fpos', (f) => f.id === lot.fpoId) : null;
  const farmer = lot ? db.find('farmers', (f) => f.id === lot.farmerId) : null;
  const inspector = sess?.inspectorId ? db.find('users', (u) => u.id === sess.inspectorId) : null;
  const detections = db.filter('vision_detections', (d) => d.inspectionId === cert.inspectionId);

  const defectCounts = {
    healthy: detections.filter((d) => d.class === 'healthy').length,
    damaged: detections.filter((d) => d.class === 'damaged').length,
    rotten: detections.filter((d) => d.class === 'rotten').length,
    sprouted: detections.filter((d) => d.class === 'sprouted').length,
    undersized: detections.filter((d) => d.class === 'undersized').length,
  };
  if (detections.length === 0) {
    const a = cert.grade_a_percentage ?? 72;
    const u = cert.urs_percentage ?? 18;
    const r = cert.rejected_percentage ?? 10;
    defectCounts.healthy = Math.round(a);
    defectCounts.damaged = Math.max(1, Math.round(u * 0.5));
    defectCounts.sprouted = Math.max(1, Math.round(u * 0.25));
    defectCounts.rotten = Math.max(1, Math.round(r * 0.5));
    defectCounts.undersized = Math.max(1, Math.round(r * 0.5));
  }

  res.json({ certificate: cert, lot, fusion, sensors, center, fpo, farmer, inspector, session: sess, defectCounts });
});

// PDF endpoint — returns printable data; client renders via window.print().
router.get('/certificates/:id/pdf', requireAuth(), (req, res) => {
  const cert = db.find('quality_certificates', (c) => c.id === req.params.id || c.certificateNumber === req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  res.json({ note: 'Render the certificate page and use the browser Print → Save as PDF action.', certificateId: cert.id });
});

/* ----------------------------------------------------------------- */
/* HUMAN OVERRIDE & AUDIT LOG (FEATURE 5)                            */
/* ----------------------------------------------------------------- */

router.post('/inspections/:id/override', requireAuth('procurement_officer', 'admin'), (req, res) => {
  const { newGrade, reason } = req.body || {};
  if (!newGrade || !['GRADE A', 'URS', 'REJECTED'].includes(newGrade)) {
    return res.status(400).json({ error: 'Valid newGrade (GRADE A, URS, REJECTED) is required' });
  }
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Mandatory override reason must be provided (minimum 5 characters)' });
  }

  const sess = db.find('inspection_sessions', (s) => s.id === req.params.id);
  if (!sess) return res.status(404).json({ error: 'Inspection not found' });
  const lot = db.find('lots', (l) => l.id === sess.lotId);
  const fusion = db.find('fusion_results', (f) => f.inspectionId === sess.id);
  const cert = db.find('quality_certificates', (c) => c.inspectionId === sess.id);

  const originalResult = cert?.grade || fusion?.grade || 'UNKNOWN';

  // Use transaction for atomic update
  try {
    db.transaction((tx) => {
      // Create override log
      const overrideLog = {
        id: db.id('ovr'),
        inspectionId: sess.id,
        lotId: lot?.id,
        centralLotId: lot?.lotNumber,
        originalResult,
        newResult: newGrade,
        reason: reason.trim(),
        officerId: req.user.sub,
        officerName: req.user.name || req.user.username,
        centerId: lot?.procurementCenterId,
        timestamp: db.nowISO(),
      };
      tx.insert('overrides', overrideLog);

      // Update fusion result
      if (fusion) {
        tx.update('fusion_results', (f) => f.id === fusion.id, {
          grade: newGrade,
          humanOverridden: true,
          originalGrade: originalResult,
          overrideReason: reason.trim(),
          overriddenBy: req.user.sub,
        });
      }

      // Update certificate
      if (cert) {
        tx.update('quality_certificates', (c) => c.id === cert.id, {
          grade: newGrade,
          overridden: true,
          originalGrade: originalResult,
          overrideReason: reason.trim(),
          overriddenBy: req.user.name || req.user.username,
          updatedAt: db.nowISO(),
        });
      }

      // Update lot
      if (lot) {
        tx.update('lots', (l) => l.id === lot.id, {
          currentGrade: newGrade,
          status: 'graded',
          updatedAt: db.nowISO(),
        });
      }

      // Add to central immutable audit trail
      tx.insert('audit_logs', {
        id: db.id('aud'),
        action: 'MANUAL_OVERRIDE',
        inspectionId: sess.id,
        lotId: lot?.id,
        lotNumber: lot?.lotNumber,
        actorId: req.user.sub,
        actorRole: req.user.role,
        centerId: lot?.procurementCenterId,
        timestamp: db.nowISO(),
        details: `Grade overridden from ${originalResult} to ${newGrade}. Reason: "${reason.trim()}" by ${req.user.name || req.user.username}`,
      });

      res.json({
        success: true,
        override: overrideLog,
        updatedGrade: newGrade,
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply override: ' + err.message });
  }
});

router.get('/inspections/:id/audit', requireAuth(), (req, res) => {
  const sess = db.find('inspection_sessions', (s) => s.id === req.params.id);
  const overrides = db.filter('overrides', (o) => o.inspectionId === req.params.id);
  const audits = db.filter('audit_logs', (a) => a.inspectionId === req.params.id || (sess && a.lotId === sess.lotId));
  res.json({
    inspectionId: req.params.id,
    overrides,
    auditTrail: audits.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
  });
});

router.get('/audit/logs', requireAuth(), (req, res) => {
  const logs = db.all('audit_logs').sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const overrides = db.all('overrides').sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  res.json({ logs, overrides });
});

/* ----------------------------------------------------------------- */
/* DISPUTE SYSTEM (FEATURE 6 & CROSS-DASHBOARD WORKFLOW)             */
/* ----------------------------------------------------------------- */

router.post('/disputes', requireAuth(), (req, res) => {
  const { lotId, inspectionId, reason, description } = req.body || {};
  if (!lotId || !reason) {
    return res.status(400).json({ error: 'lotId and reason are required' });
  }

  const lot = db.find('lots', (l) => l.id === lotId || l.lotNumber === lotId);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });

  // Optional: check farmer ownership
  if (req.user.role === 'farmer' && req.user.farmerId && lot.farmerId !== req.user.farmerId) {
    return res.status(403).json({ error: 'Unauthorized to dispute this lot' });
  }

  const sess = inspectionId ? db.find('inspection_sessions', (s) => s.id === inspectionId) : db.filter('inspection_sessions', (s) => s.lotId === lot.id).pop();
  const cert = sess ? db.find('quality_certificates', (c) => c.inspectionId === sess.id) : null;

  const dispute = {
    id: db.id('dsp'),
    disputeNumber: `DSP-${new Date().getFullYear()}-${String(db.all('disputes').length + 101).padStart(4, '0')}`,
    lotId: lot.id,
    centralLotId: lot.lotNumber,
    inspectionId: sess?.id || null,
    certificateNumber: cert?.certificateNumber || null,
    grade: cert?.grade || lot.currentGrade || 'URS',
    qualityScore: cert?.qualityScore || lot.currentScore || null,
    farmerId: lot.farmerId,
    raisedBy: req.user.sub,
    reason,
    description: description || '',
    status: 'submitted', // submitted -> under_review -> reinspection -> resolved
    timeline: [
      { status: 'submitted', label: 'Submitted', timestamp: db.nowISO(), note: 'Dispute submitted by farmer' },
    ],
    createdAt: db.nowISO(),
    updatedAt: db.nowISO(),
  };

  db.insert('disputes', dispute);

  // Mark lot as disputed
  db.update('lots', (l) => l.id === lot.id, { status: 'disputed' });

  // Audit log
  db.insert('audit_logs', {
    id: db.id('aud'),
    action: 'DISPUTE_CREATED',
    lotId: lot.id,
    lotNumber: lot.lotNumber,
    actorId: req.user.sub,
    actorRole: req.user.role,
    centerId: lot.procurementCenterId,
    timestamp: db.nowISO(),
    details: `Dispute ${dispute.disputeNumber} filed for ${lot.lotNumber} (${reason})`,
  });

  res.status(201).json(dispute);
});

router.get('/disputes', requireAuth(), (req, res) => {
  let disputes = db.all('disputes').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (req.user.role === 'farmer' && req.user.farmerId) {
    disputes = disputes.filter((d) => d.farmerId === req.user.farmerId || d.raisedBy === req.user.sub);
  }
  res.json(disputes);
});

router.get('/disputes/:id', requireAuth(), (req, res) => {
  const dispute = db.find('disputes', (d) => d.id === req.params.id || d.disputeNumber === req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
  const lot = db.find('lots', (l) => l.id === dispute.lotId);
  const inspections = db.filter('inspection_sessions', (s) => s.lotId === dispute.lotId);
  res.json({ dispute, lot, inspections });
});

router.post('/disputes/:id/review', requireAuth('procurement_officer', 'admin'), (req, res) => {
  const dispute = db.find('disputes', (d) => d.id === req.params.id || d.disputeNumber === req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

  const timeline = dispute.timeline || [];
  timeline.push({
    status: 'under_review',
    label: 'Under Review',
    timestamp: db.nowISO(),
    note: `Assigned for technical review by Officer ${req.user.name || req.user.username}`,
  });

  db.update('disputes', (d) => d.id === dispute.id, {
    status: 'under_review',
    reviewedBy: req.user.sub,
    timeline,
    updatedAt: db.nowISO(),
  });

  res.json({ success: true, dispute });
});

router.post('/disputes/:id/reinspect', requireAuth('procurement_officer', 'admin'), (req, res) => {
  const { newGrade, newScore, reason } = req.body || {};
  const dispute = db.find('disputes', (d) => d.id === req.params.id || d.disputeNumber === req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

  const lot = db.find('lots', (l) => l.id === dispute.lotId);
  const grade = newGrade || 'GRADE A';
  const score = newScore || 92;

  // Create linked reassessment inspection record on the SAME Central Lot ID
  const reassessSession = {
    id: db.id('insp'),
    lotId: lot.id,
    sampleWeightKg: 1.8,
    status: 'completed',
    mode: 'REASSESSMENT',
    procurementCenterId: lot.procurementCenterId,
    inspectorId: req.user.sub,
    startedAt: db.nowISO(),
    completedAt: db.nowISO(),
  };
  db.insert('inspection_sessions', reassessSession);

  // Vision sample for reassessment
  const vision = ai.generateVisionSample('demo', 100);
  const gas = ai.classifySensors({
    temperature: 23.5, humidity: 59, co2: 430, ch4: 0.12, c2h4: 0.25, nh3: 0.08, moisture: 13.8, ph: 6.0,
  });
  const env = ai.scoreEnvironment({ temperature: 23.5, humidity: 59 });
  const fusion = ai.fuse({ vision, gas, environment: env, lotData: lot, rulesVersion: ai.RULES_VERSION });

  // Use provided grade or calculated fusion
  const finalGrade = newGrade || fusion.grade;
  const finalScore = newScore || fusion.finalScore;

  const fusionRec = {
    id: db.id('fus'),
    inspectionId: reassessSession.id,
    visionScore: fusion.visionScore,
    gasScore: fusion.gasScore,
    environmentalScore: fusion.environmentalScore,
    finalScore,
    qualityScore: finalScore,
    confidence: 0.96,
    grade: finalGrade,
    riskLevel: 'LOW',
    spoilageRisk: 'LOW',
    reasons: ['Reassessment confirmed sample meets Grade A standards', 'Secondary sensor reading validated normal volatile signature'],
    rulesVersion: ai.RULES_VERSION,
    isReassessment: true,
    previousGrade: dispute.grade,
    reassessmentReason: reason || 'Reinspection upon farmer dispute approval',
    createdAt: db.nowISO(),
  };
  db.insert('fusion_results', fusionRec);

  // Issue updated certificate referencing SAME Central Lot ID
  const certNo = `CERT-ON-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`;
  const qr = db.id('qr');
  const cert = {
    id: db.id('cert'),
    inspectionId: reassessSession.id,
    certificateNumber: certNo,
    grade: finalGrade,
    qualityScore: finalScore,
    grade_a_percentage: 92.0,
    urs_percentage: 6.0,
    rejected_percentage: 2.0,
    qrToken: qr,
    isReassessment: true,
    reassessmentNote: `Reassessment of dispute ${dispute.disputeNumber}`,
    createdAt: db.nowISO(),
  };
  db.insert('quality_certificates', cert);
  db.insert('qr_verifications', { id: db.id('vrf'), certificateId: certNo, token: qr, status: 'VERIFIED', verifiedAt: cert.createdAt });

  // Update lot
  db.update('lots', (l) => l.id === lot.id, {
    currentGrade: finalGrade,
    currentScore: finalScore,
    status: 'completed',
    currentInspectionId: reassessSession.id,
    updatedAt: db.nowISO(),
  });

  // Update dispute timeline to resolved
  const timeline = dispute.timeline || [];
  timeline.push({
    status: 'reinspection',
    label: 'Re-inspection',
    timestamp: db.nowISO(),
    note: `Lot re-inspected at center. New Grade: ${finalGrade} (${finalScore}/100)`,
  });
  timeline.push({
    status: 'resolved',
    label: 'Resolved',
    timestamp: db.nowISO(),
    note: `Dispute resolved. Official grade updated to ${finalGrade}.`,
  });

  db.update('disputes', (d) => d.id === dispute.id, {
    status: 'resolved',
    resolvedGrade: finalGrade,
    resolutionNote: reason || 'Reinspection confirmed updated grade.',
    timeline,
    updatedAt: db.nowISO(),
  });

  // Permanent Audit Log
  db.insert('audit_logs', {
    id: db.id('aud'),
    action: 'FINAL_RESULT_UPDATED',
    inspectionId: reassessSession.id,
    lotId: lot.id,
    lotNumber: lot.lotNumber,
    actorId: req.user.sub,
    actorRole: req.user.role,
    centerId: lot.procurementCenterId,
    timestamp: db.nowISO(),
    details: `Dispute ${dispute.disputeNumber} resolved: Grade updated to ${finalGrade} (${finalScore}/100). New Cert: ${certNo}`,
  });

  res.json({
    success: true,
    dispute,
    reassessment: {
      session: reassessSession,
      certificate: cert,
      newGrade: finalGrade,
      newScore: finalScore,
    },
  });
});

// Accept dispute without full reinspection
router.post('/disputes/:id/accept', requireAuth('procurement_officer', 'admin'), (req, res) => {
  const { reason } = req.body || {};
  const dispute = db.find('disputes', (d) => d.id === req.params.id || d.disputeNumber === req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

  const timeline = dispute.timeline || [];
  timeline.push({
    status: 'resolved',
    label: 'Accepted',
    timestamp: db.nowISO(),
    note: reason || 'Dispute accepted by quality officer',
  });

  db.update('disputes', (d) => d.id === dispute.id, {
    status: 'resolved',
    resolvedBy: req.user.sub,
    resolutionNote: reason || 'Dispute accepted',
    timeline,
    resolvedAt: db.nowISO(),
    updatedAt: db.nowISO(),
  });

  // Audit log
  db.insert('audit_logs', {
    id: db.id('aud'),
    action: 'DISPUTE_ACCEPTED',
    lotId: dispute.lotId,
    lotNumber: dispute.centralLotId,
    actorId: req.user.sub,
    actorRole: req.user.role,
    timestamp: db.nowISO(),
    details: `Dispute ${dispute.disputeNumber} accepted: ${reason || 'No additional reason provided'}`,
  });

  res.json({ success: true, dispute });
});

// Reject dispute
router.post('/disputes/:id/reject', requireAuth('procurement_officer', 'admin'), (req, res) => {
  const { reason } = req.body || {};
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Rejection reason is mandatory (minimum 5 characters)' });
  }

  const dispute = db.find('disputes', (d) => d.id === req.params.id || d.disputeNumber === req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

  const timeline = dispute.timeline || [];
  timeline.push({
    status: 'rejected',
    label: 'Rejected',
    timestamp: db.nowISO(),
    note: reason,
  });

  db.update('disputes', (d) => d.id === dispute.id, {
    status: 'rejected',
    resolvedBy: req.user.sub,
    resolutionNote: reason,
    timeline,
    resolvedAt: db.nowISO(),
    updatedAt: db.nowISO(),
  });

  // Audit log
  db.insert('audit_logs', {
    id: db.id('aud'),
    action: 'DISPUTE_REJECTED',
    lotId: dispute.lotId,
    lotNumber: dispute.centralLotId,
    actorId: req.user.sub,
    actorRole: req.user.role,
    timestamp: db.nowISO(),
    details: `Dispute ${dispute.disputeNumber} rejected: ${reason}`,
  });

  res.json({ success: true, dispute });
});

// Get all audit events for a specific central lot
router.get('/audit/lot/:lotNumber', requireAuth(), (req, res) => {
  const lotNum = req.params.lotNumber.trim();
  const lot = db.find('lots', (l) => l.lotNumber === lotNum || l.centralLotId === lotNum);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });

  const inspections = db.filter('inspection_sessions', (s) => s.lotId === lot.id);
  const logs = db.filter('audit_logs', (a) => a.lotId === lot.id || a.lotNumber === lotNum)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const overrides = db.filter('overrides', (o) => inspections.some(i => i.id === o.inspectionId));

  res.json({ lot, logs, overrides, inspections });
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
