/**
 * OnionSure — Idempotent seed.
 * Creates role users, procurement centers, FPOs, farmers, buyers and a set of
 * realistic demo inspections/certificates so dashboards & analytics are populated
 * on first run. Safe to call repeatedly (no duplicates).
 */

const bcrypt = require('bcryptjs');
const db = require('./db');
const ai = require('./ai');
const config = require('./config');

async function seed() {
  const d = db.get();
  if (d.users.length > 0) return; // already seeded

  // --- Centers / FPOs / Farmers / Buyers ---
  const c1 = { id: db.id('ctr'), name: 'Nashik Central Procurement Center', location: 'Nashik, Maharashtra', latitude: 19.9975, longitude: 73.7898 };
  const c2 = { id: db.id('ctr'), name: 'Pune FPO Quality Hub', location: 'Pune, Maharashtra', latitude: 18.5204, longitude: 73.8567 };
  const c3 = { id: db.id('ctr'), name: 'Indore Agri Mandi', location: 'Indore, MP', latitude: 22.7196, longitude: 75.8577 };
  d.procurement_centers.push(c1, c2, c3);

  const fpo1 = { id: db.id('fpo'), name: 'Nashik Onion Growers FPO', centerId: c1.id, registeredFarmers: 0 };
  const fpo2 = { id: db.id('fpo'), name: 'Malwa FPO Collective', centerId: c3.id, registeredFarmers: 0 };
  d.fpos.push(fpo1, fpo2);

  const farmerDefs = [
    { name: 'Ram Agro Farms', fpoId: fpo1.id, location: 'Nashik', lat: 20.01, lng: 73.8 },
    { name: 'Sai Kisan Produce', fpoId: fpo1.id, location: 'Nashik', lat: 19.95, lng: 73.7 },
    { name: 'Malwa Naturals', fpoId: fpo2.id, location: 'Indore', lat: 22.7, lng: 75.9 },
  ];
  const farmers = farmerDefs.map((f) => {
    const obj = { id: db.id('far'), ...f, qualityGradeA: 0, totalLots: 0, createdAt: db.nowISO() };
    d.farmers.push(obj);
    return obj;
  });

  const buyer1 = { id: db.id('buy'), name: 'Reliance Fresh Procurement', location: 'Mumbai', createdAt: db.nowISO() };
  d.buyers.push(buyer1);

  // --- Users ---
  const users = [
    { username: 'officer1', password: 'password123', role: 'procurement_officer', name: 'Inspector Anjali', centerId: c1.id },
    { username: 'officer2', password: 'password123', role: 'procurement_officer', name: 'Inspector Vikram', centerId: c2.id },
    { username: 'fpo1', password: 'password123', role: 'fpo', name: 'FPO Manager Nashik', fpoId: fpo1.id },
    { username: 'farmer1', password: 'password123', role: 'farmer', name: 'Ram (Ram Agro Farms)', farmerId: farmers[0].id, fpoId: fpo1.id },
    { username: 'buyer1', password: 'password123', role: 'buyer', name: 'Reliance Buyer Desk', buyerId: buyer1.id },
    { username: 'admin', password: 'password123', role: 'admin', name: 'Platform Administrator' },
  ];
  for (const u of users) {
    const obj = {
      id: db.id('usr'),
      username: u.username,
      passwordHash: bcrypt.hashSync(u.password, 10),
      role: u.role,
      name: u.name,
      email: `${u.username}@onionsure.in`,
      centerId: u.centerId || null,
      fpoId: u.fpoId || null,
      farmerId: u.farmerId || null,
      buyerId: u.buyerId || null,
      createdAt: db.nowISO(),
    };
    d.users.push(obj);
  }

  // --- Demo inspections across last ~30 days ---
  const varieties = ['Nashik Red', 'Bhima', 'Pusa Red', 'Aggrifound Light Red'];
  const centers = [c1, c2, c3];
  const scenarios = ['random', 'random', 'random', 'demo', 'random', 'random', 'random', 'demo'];
  for (let i = 0; i < 8; i++) {
    const farmer = farmers[i % farmers.length];
    const center = centers[i % centers.length];
    const daysAgo = i * 3 + 1;
    const created = new Date(Date.now() - daysAgo * 86400000).toISOString();

    const lot = {
      id: db.id('lot'),
      lotNumber: `ON-${new Date(created).getFullYear()}-${String(1000 + i).padStart(4, '0')}`,
      farmerId: farmer.id,
      fpoId: farmer.fpoId,
      crop: 'Onion',
      variety: varieties[i % varieties.length],
      quantityKg: 500 + i * 120,
      procurementCenterId: center.id,
      inspectorId: d.users.find((u) => u.role === 'procurement_officer' && u.centerId === center.id)?.id || d.users[0].id,
      createdAt: created,
    };
    d.lots.push(lot);

    const sess = {
      id: db.id('insp'),
      lotId: lot.id,
      sampleWeightKg: 1.5,
      status: 'completed',
      mode: 'DEMO',
      startedAt: created,
      completedAt: created,
    };
    d.inspection_sessions.push(sess);

    const vision = ai.generateVisionSample(scenarios[i] === 'demo' ? 'demo' : 'random', 100);
    const ethane = +(0.18 + Math.random() * 0.5).toFixed(2);
    const methane = +(0.08 + Math.random() * 0.25).toFixed(2);
    const temperature = +(22 + Math.random() * 7).toFixed(1);
    const humidity = +(55 + Math.random() * 18).toFixed(1);

    const gas = ai.classifyGas({ ethane, methane, temperature, humidity });
    const env = ai.scoreEnvironment({ temperature, humidity });
    const fusion = ai.fuse({ vision, gas, environment: env });

    d.sensor_readings.push({
      id: db.id('sen'),
      inspectionId: sess.id,
      ethane, methane, temperature, humidity,
      stage: gas.stage, gasScore: gas.gasScore,
      timestamp: created,
    });

    for (const det of vision.detections.slice(0, 12)) {
      d.vision_detections.push({
        id: db.id('vd'),
        inspectionId: sess.id,
        class: det.class,
        confidence: det.confidence,
        bbox: det.bbox,
        size: det.size,
      });
    }

    d.fusion_results.push({
      id: db.id('fus'),
      inspectionId: sess.id,
      visionScore: fusion.visionScore,
      gasScore: fusion.gasScore,
      environmentalScore: fusion.environmentalScore,
      finalScore: fusion.finalScore,
      confidence: fusion.confidence,
      grade: fusion.grade,
      riskLevel: fusion.riskLevel,
      earlySpoilageAlert: fusion.earlySpoilageAlert,
      explanation: fusion.explanation,
    });

    const certNo = `CERT-ON-${new Date(created).getFullYear()}-${String(100000 + i).padStart(6, '0')}`;
    const qr = db.id('qr');
    d.quality_certificates.push({
      id: db.id('cert'),
      inspectionId: sess.id,
      certificateNumber: certNo,
      grade: fusion.grade,
      qualityScore: fusion.finalScore,
      grade_a_percentage: vision.percentages.healthy,
      urs_percentage: +(vision.percentages.damaged + vision.percentages.sprouted).toFixed(1),
      rejected_percentage: +(vision.percentages.rotten + vision.percentages.undersized).toFixed(1),
      qrToken: qr,
      latitude: center.latitude,
      longitude: center.longitude,
      createdAt: created,
    });
    d.qr_verifications.push({ id: db.id('vrf'), certificateId: certNo, token: qr, status: 'VERIFIED', verifiedAt: created });

    // update farmer stats
    farmer.totalLots += 1;
    if (fusion.grade === 'GRADE A') farmer.qualityGradeA += 1;
  }
  db.persist();
}

module.exports = { seed };
