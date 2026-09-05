/**
 * OnionSure — Express server entrypoint.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const api = require('./api');
const { seed } = require('./seed');
const realtime = require('./realtime');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'onionsure', mode: config.usePython ? 'python' : 'js', time: new Date().toISOString() }));

// API
app.use('/api', api);

// Serve built frontend if present (production single-server deploy)
const webDist = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

// Seed then listen
seed().then(() => {
  const httpServer = app.listen(config.port, () => {
    console.log(`\n  OnionSure API listening on http://localhost:${config.port}`);
    console.log(`  Mode: ${config.usePython ? 'Python AI bridge ENABLED' : 'JS DEMO AI (set USE_PYTHON=true for Python services)'}`);
    console.log('  Demo logins (password: password123): officer1, fpo1, farmer1, buyer1, admin\n');
  });

  // Real-time fan-out on the same port, so the browser needs no extra config.
  realtime.initRealtime(httpServer);
}).catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
