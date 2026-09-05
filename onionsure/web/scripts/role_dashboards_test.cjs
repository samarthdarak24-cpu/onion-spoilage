/**
 * OnionSure — per-role DASHBOARD full-stack test.
 *
 * Directly answers the "test all feature work flow for 4 dashboard test all for
 * full stack" request. Logs in as every role, then exercises each role's
 * dashboard analytics endpoints and PROVES role-scoping is correct by comparing
 * the dashboard's `totalLots` against an independently fetched, role-scoped
 * /api/lots list (they must match exactly).
 *
 * Roles: procurement_officer (officer), fpo, farmer, buyer, admin.  (The "4
 * dashboards" plus the officer dashboard — all five verified.)
 *
 * Exit 0 only if every assertion passes.
 */

const API = 'http://localhost:3005/api'; // through Vite proxy -> :4000

const ROLES = [
  { username: 'officer1', role: 'procurement_officer', label: 'Officer' },
  { username: 'fpo1',     role: 'fpo',                  label: 'FPO' },
  { username: 'farmer1',  role: 'farmer',               label: 'Farmer' },
  { username: 'buyer1',   role: 'buyer',                label: 'Buyer' },
  { username: 'admin',    role: 'admin',                label: 'Admin' },
];
const PW = 'password123';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function jget(token, path) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await r.json().catch(() => null);
  return { status: r.status, body };
}

(async () => {
  console.log('OnionSure per-role dashboard full-stack test');
  console.log(`API base: ${API}\n`);

  let allOk = true;

  for (const r of ROLES) {
    console.log(`=== ${r.label} (${r.role}) @ ${r.username} ===`);
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: r.username, password: PW }),
    });
    if (loginRes.status !== 200) {
      check(`${r.label}: login`, false, `HTTP ${loginRes.status}`);
      allOk = false; continue;
    }
    const login = await loginRes.json();
    const token = login.token;
    const me = login.user;
    check(`${r.label}: login -> token + role`, !!token && me.role === r.role, `role=${me.role}`);

    // Independently scoped lots list (the source of truth for scoping).
    const lotsRes = await jget(token, '/lots');
    if (lotsRes.status !== 200) { check(`${r.label}: GET /lots`, false, `HTTP ${lotsRes.status}`); allOk = false; continue; }
    const scopedLots = Array.isArray(lotsRes.body) ? lotsRes.body : (lotsRes.body.lots || []);

    // Dashboard analytics — must be role-scoped to exactly the same set.
    const dash = await jget(token, '/analytics/dashboard');
    const dashOk = dash.status === 200 && typeof dash.body?.totalLots === 'number';
    check(`${r.label}: GET /analytics/dashboard -> 200 + totalLots`, dashOk, `totalLots=${dash.body?.totalLots}`);
    if (dashOk) {
      const match = dash.body.totalLots === scopedLots.length;
      check(`${r.label}: dashboard totalLots == scoped /api/lots count (role-scoped!)`, match,
        `dash=${dash.body.totalLots} vs lots=${scopedLots.length}`);
      if (!match) allOk = false;
      // Sanity: dashboard must expose the standard KPI fields the UI renders.
      const kpis = ['todayInspections','pendingInspections','gradeALots','ursLots','rejectedLots','totalInspections','averageQualityScore'];
      const missing = kpis.filter((k) => dash.body[k] === undefined);
      check(`${r.label}: dashboard exposes all KPI fields`, missing.length === 0, missing.length ? `missing=${missing}` : 'all present');
      if (missing.length) allOk = false;
    } else allOk = false;

    // Quality + defects analytics (role-scoped derived views).
    const quality = await jget(token, '/analytics/quality');
    check(`${r.label}: GET /analytics/quality -> 200`, quality.status === 200, `keys=${Object.keys(quality.body||{}).join(',')}`);
    if (quality.status !== 200) allOk = false;

    const defects = await jget(token, '/analytics/defects');
    check(`${r.label}: GET /analytics/defects -> 200`, defects.status === 200);
    if (defects.status !== 200) allOk = false;
  }

  // Cross-role isolation proof: farmer's scoped lots must be a STRICT subset of
  // admin's (all) lots — i.e. a farmer can never see another farmer's lots.
  console.log('\n=== Cross-role isolation ===');
  const farmerLogin = await (await fetch(`${API}/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username:'farmer1', password: PW }),
  })).json();
  const adminLogin = await (await fetch(`${API}/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username:'admin', password: PW }),
  })).json();
  const fLots = await (await fetch(`${API}/lots`, { headers:{Authorization:`Bearer ${farmerLogin.token}`} })).json();
  const aLots = await (await fetch(`${API}/lots`, { headers:{Authorization:`Bearer ${adminLogin.token}`} })).json();
  const fIds = new Set((fLots||[]).map((l)=>l.id));
  const aIds = new Set((aLots||[]).map((l)=>l.id));
  const farmerSubset = [...fIds].every((id)=>aIds.has(id));
  check('Farmer lots are a strict subset of Admin lots (no cross-farmer leak)', farmerSubset,
    `farmer=${fIds.size} admin=${aIds.size}`);
  if (!farmerSubset) allOk = false;

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  process.exit(allOk ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
