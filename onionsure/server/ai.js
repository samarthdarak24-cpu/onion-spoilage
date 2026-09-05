/**
 * OnionSure — AI engine.
 *
 * Three branches per the spec:
 *   A) COMPUTER VISION  -> defect detection + size estimation + vision score
 *   B) GAS / ENV        -> spoilage stage + gas score (RF-style demo)
 *   C) FUSION ENGINE    -> confidence-weighted multimodal fusion
 *
 * HONESTY NOTE: vision & gas are DEMO/MOCK implementations with clearly labeled
 * simulated data. No real YOLOv8 weights or trained Random-Forest dataset exist
 * in this build. The Python services (python/*.py) mirror this logic and can be
 * invoked by setting USE_PYTHON=true (see pythonBridge). Real-model integration
 * is documented as the upgrade path.
 */

const { spawn } = require('child_process');
const path = require('path');
const config = require('./config');

const CLASSES = ['healthy', 'damaged', 'rotten', 'sprouted', 'undersized'];

function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function hashJitter(str, range = 7) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return (h % range) - Math.floor(range / 2);
}

/* ------------------------------------------------------------------ */
/* BRANCH A — COMPUTER VISION (DEMO)                                   */
/* ------------------------------------------------------------------ */

/**
 * Generate a plausible onion batch distribution.
 * scenario 'demo' reproduces the brief's section-33 showcase exactly.
 */
function generateVisionSample(scenario = 'random', total = 100) {
  if (scenario === 'demo') {
    const counts = { healthy: 91, damaged: 4, rotten: 1, sprouted: 2, undersized: 2 };
    return finalizeVision(counts, 94, 0.95, 'DEMO');
  }
  // randomized but realistic: mostly healthy
  const damaged = rand(0, 8);
  const rotten = rand(0, 4);
  const sprouted = rand(0, 6);
  const undersized = rand(0, 7);
  const healthy = Math.max(0, total - damaged - rotten - sprouted - undersized);
  const counts = { healthy, damaged, rotten, sprouted, undersized };
  const visionScore = clamp(
    100 - (rotten * 2.5 + damaged * 1.0 + sprouted * 1.0 + undersized * 0.5)
  );
  return finalizeVision(counts, Math.round(visionScore), 0.9 + Math.random() * 0.08, 'DEMO');
}

function rand(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function finalizeVision(counts, visionScore, confidence, mode) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const detections = [];
  let _id = 0;
  for (const cls of CLASSES) {
    for (let i = 0; i < counts[cls]; i++) {
      detections.push({
        id: `det_${_id++}`,
        class: cls,
        confidence: cls === 'healthy' ? 0.9 + Math.random() * 0.09 : 0.7 + Math.random() * 0.25,
        bbox: randomBbox(),
        size: estimateSize(cls),
      });
    }
  }
  const percentages = {};
  for (const cls of CLASSES) percentages[cls] = +((counts[cls] / total) * 100).toFixed(1);
  return {
    mode, // DEMO — clearly labeled
    total,
    counts,
    percentages,
    visionScore,
    confidence: +confidence.toFixed(2),
    detections,
  };
}

function randomBbox() {
  const x = Math.round(Math.random() * 60) + 10;
  const y = Math.round(Math.random() * 60) + 10;
  const w = Math.round(Math.random() * 25) + 18;
  const h = Math.round(Math.random() * 25) + 18;
  return { x, y, width: w, height: h };
}

function estimateSize(cls) {
  // diameter in mm; undersized flagged below threshold
  const base = cls === 'undersized' ? 30 + Math.random() * 8 : 45 + Math.random() * 25;
  return Math.round(base);
}

/* ------------------------------------------------------------------ */
/* BRANCH B — GAS / ENVIRONMENTAL (RF-style DEMO)                      */
/* ------------------------------------------------------------------ */

function classifyGas({ ethane, methane, temperature, humidity }) {
  const g = config.gas;
  const flags = {
    ethaneHigh: ethane >= g.ethaneElevated,
    methaneHigh: methane >= g.methaneElevated,
    tempHigh: temperature >= g.tempWarn,
    humidityHigh: humidity >= g.humidityWarn,
  };
  const riskRaw =
    (flags.ethaneHigh ? 0.35 : 0) +
    (flags.methaneHigh ? 0.3 : 0) +
    (flags.tempHigh ? 0.2 : 0) +
    (flags.humidityHigh ? 0.15 : 0);

  let stage = 'LOW';
  if (riskRaw >= 0.6) stage = 'HIGH';
  else if (riskRaw >= 0.3) stage = 'MEDIUM';

  const baseByStage = { LOW: 90, MEDIUM: 76, HIGH: 46 };
  const gasScore = clamp(baseByStage[stage] + hashJitter(`${ethane}${methane}${temperature}`, 7), 0, 100);
  const confidence = +(0.8 + (stage === 'LOW' ? 0.15 : 0.1) + Math.random() * 0.05).toFixed(2);

  return {
    mode: 'DEMO', // RF-style threshold demo — no trained dataset
    stage, // LOW | MEDIUM | HIGH
    gasScore: Math.round(gasScore),
    confidence,
    flags,
    readings: { ethane, methane, temperature, humidity },
  };
}

function scoreEnvironment({ temperature, humidity }) {
  // Ideal onion storage ~ 20-25°C, 55-70% RH
  const tempPenalty = Math.max(0, Math.abs(temperature - 22.5) - 2.5) * 4;
  const humPenalty = Math.max(0, Math.abs(humidity - 62.5) - 7.5) * 1.2;
  const environmentScore = clamp(100 - tempPenalty - humPenalty);
  return {
    environmentScore: Math.round(environmentScore),
    confidence: 0.95,
    temperature,
    humidity,
  };
}

/* ------------------------------------------------------------------ */
/* FUSION ENGINE — confidence-weighted multimodal fusion              */
/* ------------------------------------------------------------------ */

function fuse({ vision, gas, environment, weights, grading }) {
  weights = weights || config.fusion.weights;
  grading = grading || config.grading;

  const vQ = vision.visionScore;
  const gQ = gas.gasScore;
  const eQ = environment.environmentScore;

  const vC = vision.confidence ?? 1;
  const gC = gas.confidence ?? 1;
  const eC = environment.confidence ?? 1;

  const wSum = weights.vision + weights.gas + weights.environment || 1;
  const num =
    weights.vision * vC * vQ + weights.gas * gC * gQ + weights.environment * eC * eQ;
  const den =
    weights.vision * vC + weights.gas * gC + weights.environment * eC || 1;
  const finalScore = Math.round(clamp((num / den)));
  const confidence = +(
    (weights.vision * vC + weights.gas * gC + weights.environment * eC) / wSum
  ).toFixed(2);

  // Grading
  let grade = 'REJECTED';
  if (finalScore >= grading.gradeA) grade = 'GRADE A';
  else if (finalScore >= grading.urs) grade = 'URS';

  // Early-spoilage conflict detection (core innovation)
  const es = config.fusion.earlySpoilage;
  const visionHealthy = vQ >= es.visionHealthyAbove;
  const gasRisky = gas.stage === 'HIGH' || gas.stage === 'MEDIUM';
  const earlySpoilageAlert = visionHealthy && gasRisky;

  let riskLevel = 'LOW';
  if (earlySpoilageAlert) riskLevel = 'HIGH';
  else if (gas.stage === 'HIGH') riskLevel = 'HIGH';
  else if (gas.stage === 'MEDIUM') riskLevel = 'MEDIUM';

  let explanation = `Vision score ${vQ}/100, gas (${gas.stage}) ${gQ}/100, environment ${eQ}/100 fused to ${finalScore}/100.`;
  if (earlySpoilageAlert) {
    explanation =
      'Most onions appear visually healthy, but the gas signature indicates possible early-stage spoilage. ' +
      'Multimodal fusion overrides the camera-only result to flag hidden risk.';
  }

  return {
    visionScore: vQ,
    gasScore: gQ,
    environmentalScore: eQ,
    visionConfidence: +vC.toFixed(2),
    gasConfidence: +gC.toFixed(2),
    environmentalConfidence: +eC.toFixed(2),
    weights,
    finalScore,
    confidence,
    grade,
    riskLevel,
    earlySpoilageAlert,
    explanation,
  };
}

/* ------------------------------------------------------------------ */
/* Optional Python bridge (USE_PYTHON=true)                            */
/* ------------------------------------------------------------------ */

function callPython(script, payload) {
  return new Promise((resolve, reject) => {
    const p = spawn(config.pythonBin, [path.join(__dirname, '..', 'python', script), JSON.stringify(payload)]);
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `python ${script} exited ${code}`));
      try {
        resolve(JSON.parse(out.trim()));
      } catch (e) {
        reject(new Error('Invalid JSON from python: ' + out));
      }
    });
  });
}

async function analyzeGasPython(readings) {
  if (!config.usePython) return classifyGas(readings);
  try {
    return await callPython('gas_quality_detector.py', readings);
  } catch (e) {
    return classifyGas(readings); // graceful fallback
  }
}

async function fusePython(payload) {
  if (!config.usePython) return fuse(payload);
  try {
    return await callPython('fusion_service.py', payload);
  } catch (e) {
    return fuse(payload);
  }
}

/**
 * Build an OnionSure VisionResult from a parsed OnionCheck detector response.
 * `onioncheckJson` is the JSON returned by `http://localhost:5000/api/detect`.
 * Returns null when the service reported failure (caller should fall back to DEMO).
 */
function buildVisionFromOnionCheck(d) {
  if (!d || d.success === false || !d.detections) return null;
  return mapOnionCheckToVision(d);
}

function demoVision() {
  return generateVisionSample('random', 100);
}

/**
 * Map OnionCheck detections -> OnionSure VisionResult.
 * OnionCheck defect_summary keys vary; normalize to our 5-class model.
 */
function mapOnionCheckToVision(d) {
  const dets = Array.isArray(d.detections) ? d.detections : [];
  const counts = { healthy: 0, damaged: 0, rotten: 0, sprouted: 0, undersized: 0 };
  const norm = (c) => String(c || '').toLowerCase();

  // OnionCheck returns pixel-based boxes; convert to % of image for the frontend overlay.
  const dims = d.image_dimensions || d.image_size || {};
  const W = Number(dims.width || 0);
  const H = Number(dims.height || 0);

  /**
   * Map an OnionCheck detection to one of our 5 grading classes.
   * Prefers the detector's own `category` (healthy/defective), then the class name.
   */
  const toKey = (det) => {
    const cls = norm(det.class || det.label || '');
    const cat = norm(det.category || '');
    const sev = Number(det.severity ?? -1);
    if (cat === 'healthy' || cls.includes('healthy')) return 'healthy';
    if (cls.includes('rot') || cls.includes('decay')) return 'rotten';
    if (cls.includes('sprout')) return 'sprouted';
    if (cls.includes('undersize') || cls.includes('small')) return 'undersized';
    if (cls.includes('split') || cls.includes('double') || cls.includes('stain') ||
        cls.includes('smut') || cls.includes('damag') || cls.includes('bruise') ||
        cls.includes('blemish') || cls.includes('mold') || cls.includes('neck')) {
      // Severe defects read as rotten; moderate/minor as damaged.
      return sev >= 3 ? 'rotten' : 'damaged';
    }
    // Unknown defect name -> use severity as the signal
    if (sev >= 3) return 'rotten';
    if (sev >= 1) return 'damaged';
    if (sev === 0) return 'healthy';
    return 'damaged';
  };

  dets.forEach((det) => { counts[toKey(det)]++; });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const percentages = {};
  for (const cls of CLASSES) percentages[cls] = +((counts[cls] / total) * 100).toFixed(1);

  // Prefer a real quality signal from statistics when available.
  const st = d.statistics || {};
  const defectRate = typeof st.defect_rate === 'number'
    ? st.defect_rate
    : (total > 0 ? +(100 * ((total - counts.healthy) / total)).toFixed(1) : 0);

  // Per-class quality weights — scale-invariant, so a 3-onion photo and a
  // 300-onion batch score on the same 0-100 rubric.
  const QUALITY_WEIGHT = { healthy: 1.0, undersized: 0.7, damaged: 0.6, sprouted: 0.3, rotten: 0.0 };
  const visionScore = (() => {
    if (d.statistics?.vision_score != null) return d.statistics.vision_score;
    if (total > 0) {
      const weighted = CLASSES.reduce((sum, cls) => sum + counts[cls] * QUALITY_WEIGHT[cls], 0);
      return clamp(Math.round(100 * (weighted / total)));
    }
    return clamp(100 - (counts.rotten * 2.5 + counts.damaged * 1.0 + counts.sprouted * 1.0 + counts.undersized * 0.5));
  })();

  const detections = dets.map((det, i) => {
    const key = toKey(det);
    const bb = det.bounding_box || det.bbox || det.box || {};
    // Pixel corners (x1,y1,x2,y2) -> percentage box for CSS overlay.
    let box;
    if (W > 0 && H > 0 && bb.x1 != null && bb.x2 != null) {
      box = {
        x: +((bb.x1 / W) * 100).toFixed(2),
        y: +((bb.y1 / H) * 100).toFixed(2),
        width: +(((bb.x2 - bb.x1) / W) * 100).toFixed(2),
        height: +(((bb.y2 - bb.y1) / H) * 100).toFixed(2),
      };
    } else {
      // Already normalized (0-100) or unknown — pass through with sane defaults.
      box = {
        x: Number(bb.x ?? bb.x1 ?? 10),
        y: Number(bb.y ?? bb.y1 ?? 10),
        width: Number(bb.width ?? bb.w ?? (bb.x2 - bb.x1) ?? 12),
        height: Number(bb.height ?? bb.h ?? (bb.y2 - bb.y1) ?? 12),
      };
    }
    const se = det.size_estimation || {};
    const diameterCm = se.diameter_cm ?? det.diameter_cm ?? null;
    return {
      id: `oc_${i}`,
      class: key,
      label: det.class, // original detector class (e.g. "black smut")
      severity: det.severity ?? null,
      confidence: typeof det.confidence === 'number' ? +det.confidence.toFixed(2) : 0.85,
      bbox: box,
      size: diameterCm != null ? Math.round(diameterCm * 10) : (det.size ?? 50), // mm
      diameterCm,
      weightG: se.estimated_weight_g ?? null,
      sizeCategory: se.size_category ?? null,
    };
  });

  return {
    mode: 'ONIONCHECK',
    total,
    counts,
    percentages,
    visionScore: Math.round(visionScore),
    defectRate,
    confidence: +(d.statistics?.confidence ?? 0.9).toFixed(2),
    detections,
    statistics: st,
    raw: d, // keep original for advanced panels
  };
}

module.exports = {
  CLASSES,
  generateVisionSample,
  classifyGas,
  scoreEnvironment,
  fuse,
  analyzeGasPython,
  fusePython,
  callPython,
  buildVisionFromOnionCheck,
  demoVision,
};
