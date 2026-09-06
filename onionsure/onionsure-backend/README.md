# OnionSure Backend

AI-assisted quality grading system for onion procurement. Provides APIs for authentication, role-based access, lot management, multimodal inspection (computer vision + gas sensor fusion), early-spoilage detection, digital certificates with QR verification, analytics, and real-time WebSocket events.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access + refresh) + bcrypt
- **AI:** Mock analyzers (deterministic) with pluggable Python service adapters
- **Realtime:** WebSocket (ws library)
- **Validation:** Zod
- **Testing:** Vitest

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and secrets

# 3. Run database migrations
npx prisma migrate deploy

# 4. Seed demo data
npx prisma db seed

# 5. Start the server
npm run dev
# or for production:
npm run build && npm start
```

## Demo Credentials

All passwords are `password123`:

| Username    | Role                | Scope                          |
|-------------|---------------------|--------------------------------|
| `admin`     | ADMIN               | Full system access             |
| `officer1`  | PROCUREMENT_OFFICER | Hubli Procurement Centre       |
| `fpo1`      | FPO                 | Green Valley FPO               |
| `farmer1`   | FARMER              | Ramesh Patil (linked to FPO)   |
| `buyer1`    | BUYER               | FreshMart Foods                |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | HTTP port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | Access token signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | — | Refresh token signing secret |
| `JWT_EXPIRES_IN` | 12h | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh token lifetime |
| `BCRYPT_ROUNDS` | 10 | Password hash cost |
| `AI_MODE` | MOCK | `MOCK` or `PYTHON` |
| `AI_VISION_URL` | http://localhost:8001 | Python vision service URL |
| `AI_GAS_URL` | http://localhost:8002 | Python gas service URL |
| `MAX_UPLOAD_MB` | 10 | Max image upload size |
| `STORAGE_DRIVER` | local | `local` or `s3` |
| `CORS_ORIGIN` | http://localhost:3000 | Allowed CORS origins (comma-separated or `*`) |
| `FUSION_WEIGHT_VISION` | 0.50 | Vision weight in fusion |
| `FUSION_WEIGHT_GAS` | 0.30 | Gas weight in fusion |
| `FUSION_WEIGHT_ENVIRONMENT` | 0.20 | Environment weight |
| `GRADE_A_THRESHOLD` | 85 | Minimum score for Grade A |
| `URS_THRESHOLD` | 65 | Minimum score for URS |
| `SENSOR_DWELL_SECONDS` | 30 | IoT sensor stabilization time |

## API Endpoints

### Auth
- `POST /api/v1/auth/login` — Login with username/password
- `POST /api/v1/auth/refresh` — Refresh access token
- `POST /api/v1/auth/logout` — Logout (audited)
- `GET  /api/v1/auth/me` — Current user profile
- `POST /api/v1/auth/register` — Register user (ADMIN)

### Lots
- `GET    /api/v1/lots` — List lots (scoped by role)
- `POST   /api/v1/lots` — Create lot
- `GET    /api/v1/lots/:id` — Lot detail
- `PATCH  /api/v1/lots/:id` — Update lot
- `POST   /api/v1/lots/:id/close` — Close lot

### Inspections (full state machine)
- `POST /api/v1/inspections` — Create inspection
- `GET  /api/v1/inspections/:id` — Inspection detail
- `POST /api/v1/inspections/:id/sample` — Assign sample
- `POST /api/v1/inspections/:id/device` — Bind IoT device
- `POST /api/v1/inspections/:id/stabilization/complete` — Complete sensor dwell
- `POST /api/v1/inspections/:id/images` — Upload images (multipart)
- `POST /api/v1/inspections/:id/analyze` — Run vision + gas analysis
- `POST /api/v1/inspections/:id/fuse` — Run multimodal fusion
- `POST /api/v1/inspections/:id/certificate` — Issue certificate
- `POST /api/v1/inspections/:id/complete` — Complete inspection
- `POST /api/v1/inspections/:id/cancel` — Cancel inspection

### IoT Devices
- `POST /api/v1/iot` — Register device (ADMIN)
- `GET  /api/v1/iot` — List devices
- `GET  /api/v1/iot/:code` — Device + recent readings
- `POST /api/v1/iot/:code/heartbeat` — Device liveness
- `POST /api/v1/iot/:code/readings` — Submit sensor batch

### Certificates
- `GET  /api/v1/certificates` — List certificates
- `GET  /api/v1/certificates/:id` — Certificate detail
- `POST /api/v1/certificates/:id/revoke` — Revoke (ADMIN)

### Public Verification
- `GET /api/v1/public/:token` — Verify certificate (no auth)

### Analytics (per role)
- `GET /api/v1/analytics/dashboard` — Role-dispatched dashboard
- `GET /api/v1/analytics/officer` — Officer analytics
- `GET /api/v1/analytics/fpo` — FPO analytics
- `GET /api/v1/analytics/farmer` — Farmer analytics
- `GET /api/v1/analytics/buyer` — Buyer analytics
- `GET /api/v1/analytics/overview` — Admin overview

### Admin Configuration
- `GET  /api/v1/config/fusion` — Active fusion config (ADMIN)
- `PUT  /api/v1/config/fusion` — Update fusion weights (ADMIN)
- `GET  /api/v1/config/grading` — Grading thresholds (ADMIN)
- `PUT  /api/v1/config/grading` — Update thresholds (ADMIN)

### Other
- `GET  /api/v1/reports/inspection/:id` — Inspection report
- `POST /api/v1/demo/run` — Run demo scenario
- `GET  /health` — Liveness
- `GET  /api/health/dependencies` — Dependency probe rollup
- `GET  /api/docs` — Swagger UI

## WebSocket

Connect to `ws://host:port/ws?token=<accessToken>`. Subscribe to channels:
- `global` — All system events
- `inspection:{id}` — Per-inspection events
- `centre:{id}` — Per-centre events
- `user:{id}` — Per-user events

Events: `inspection.created`, `inspection.status_changed`, `certificate.issued`, `certificate.revoked`, `config.updated`, `iot.reading`, `iot.heartbeat`.

## Architecture

- **State machine:** `src/modules/inspections/stateMachine.ts` defines all valid transitions.
- **Fusion engine:** `src/services/fusion/fusionEngine.ts` — confidence-weighted multimodal fusion.
- **Grading engine:** `src/services/grading/gradingEngine.ts` — single source of truth for Grade A / URS / Rejected.
- **Certificate integrity:** `src/services/certificate/certificate.service.ts` — SHA-256 hash with canonical JSON (key-sorted) to survive JSONB storage.
- **Mock AI:** `src/services/ai/{visionClient,gasClient}.ts` — deterministic, seeded RNG.

## Testing

```bash
npm test
```

19 unit tests covering: state machine, fusion math, grading, percentages, JWT token service.

## License

Internal — OnionSure platform.
