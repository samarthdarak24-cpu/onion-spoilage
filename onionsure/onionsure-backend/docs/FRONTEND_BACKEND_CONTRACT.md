# FRONTEND ↔ BACKEND CONTRACT — OnionSure

> **Source of truth:** this document is generated directly from the implemented
> backend in `onionsure-backend/src` (TypeScript + Express + Prisma + PostgreSQL).
> No API was invented. Every endpoint below is taken from the actual route files,
> service code, and Prisma schema. Line references (e.g. `inspection.routes.ts:49`)
> point to the implementing file.
>
> **Generated:** from a running instance with `AI_MODE=MOCK`, `STORAGE_DRIVER=local`,
> `PORT=4000`, `CORS_ORIGIN=http://localhost:3000`.

---

## 1. Base URLs & global conventions

| Concern | Value |
|---|---|
| API base | `http://localhost:4000/api/v1` |
| Health (liveness) | `GET /health` |
| Health (dependencies) | `GET /api/health/dependencies` |
| OpenAPI / Swagger UI | `GET /api/docs` (raw spec at `/api/openapi.json`) |
| Static uploaded images | `GET /uploads/:storageKey` (local driver only) |
| WebSocket | `ws://localhost:4000/ws?token=<ACCESS_TOKEN>` |
| Content-Type | `application/json` (except multipart upload) |
| API root descriptor | `GET /api/v1/` returns `{ service, apiVersion, endpoints }` |

All request bodies are **validated and coerced by Zod** server-side
(`middleware/validation.ts`). The parsed value **replaces** `req.body` /
`req.query` / `req.params`, so controllers always receive typed values — the
frontend must send the *right key names* and *coercible* values (numbers may be
sent as strings; `z.coerce` handles them).

---

## 2. Response envelope

**Success (single object):**
```json
{ "success": true, "data": { /* ... */ } }
```

**Success (created, 201):**
```json
{ "success": true, "data": { /* ... */ } }
```

**Success (list — paginated):**
```json
{
  "success": true,
  "data": {
    "data": [ /* rows */ ],
    "pagination": { "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 }
  }
}
```
> ⚠️ **Frontend gotcha:** a list response nests rows under `data.data` and the
> page meta under `data.pagination`. It is **not** `data.rows`.

**Accepted (async, 202):** used conceptually for AI processing; the inspection
endpoints currently return `200` (the pipeline is synchronous per step).

Helper functions: `ok` (200), `created` (201), `accepted` (202), `noContent`
(204), `paginated` (`src/utils/response.ts`).

### Pagination format (`src/utils/response.ts:12`)
```ts
interface Pagination { page: number; pageSize: number; total: number; totalPages: number; }
```
- `buildPagination` clamps: `pageSize` → 1..200 (default 20), `page` → 1..totalPages.
- `totalPages` is **always ≥ 1**, even when `total === 0`.

---

## 3. Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": { "fields": { "lotId": "Invalid", "weight": "Required" } }
  }
}
```

`details` is **optional** and only present when there is structured context:
- `details.fields` → Zod / field validation errors (`{ field: message }`).
- `details.meta` → arbitrary non-secret context (e.g. state transition `{from,to}`).

### Error codes → HTTP status (`src/utils/errors.ts:26`)
| Code | HTTP | Thrown when |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Zod failure, bad upload MIME/size, malformed JSON body |
| `UNAUTHORIZED` | 401 | Missing/expired token, inactive/unknown user, bad credentials |
| `FORBIDDEN` | 403 | Authenticated but role/ownership not permitted |
| `NOT_FOUND` | 404 | Entity id does not exist (or not visible to caller) |
| `CONFLICT` | 409 | Duplicate (username), device already bound, lot already closed |
| `INVALID_STATE_TRANSITION` | 409 | Illegal inspection state jump |
| `AI_SERVICE_ERROR` | 503 | AI analyzer threw / unreachable (PYTHON mode) |
| `IOT_DEVICE_ERROR` | 503 | Unknown device referenced |
| `CERTIFICATE_INTEGRITY_ERROR` | 422 | Certificate snapshot hash mismatch (tamper) |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled / programming error |
| `TOO_MANY_REQUESTS` | 429 | Rate limit hit (login/refresh/register) |

> **Frontend gotcha:** error `code` is a **stable string enum** — branch on
> `error.code`, not on HTTP status or message text. The message is
> human-readable and may change.

---

## 4. Authentication & session

All endpoints except `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`,
`GET /api/v1/public/:token` (verify), `/health`, and `/api/health/dependencies`
require `Authorization: Bearer <accessToken>`.

| Method | Path | Auth | Role | Body | Returns |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | None | Any | `{ username, password }` | `{ accessToken, refreshToken, user }` |
| POST | `/api/v1/auth/refresh` | None | Any | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| POST | `/api/v1/auth/logout` | ✅ | Any | — | `204 No Content` |
| GET | `/api/v1/auth/me` | ✅ | Any | — | `UserDto` |
| POST | `/api/v1/auth/register` | ✅ | **ADMIN** | `RegisterInput` | `UserDto` (201) |

Rate limits (`src/middleware/rateLimit.ts`):
- `login` & `refresh` → `authLimiter` = **20 / 15 min / IP**.
- `register` → `registerLimiter` = **5 / hour / IP**.
- (A general `apiLimiter` = 200/min/IP exists but is **not currently wired** to any route.)

### UserDto (`auth.service.ts:23`)
```json
{
  "id": "clx…",
  "username": "officer1",
  "email": "officer@x.com",        // nullable
  "name": "Ravi Kumar",
  "role": "PROCUREMENT_OFFICER",    // ADMIN | PROCUREMENT_OFFICER | FPO | FARMER | BUYER
  "status": "ACTIVE",                // ACTIVE | INACTIVE | SUSPENDED
  "fpoId": null,
  "centreId": "clx…",
  "farmerId": null,
  "buyerId": null,
  "createdAt": "2026-01-15T08:00:00.000Z"
}
```
> `passwordHash` is **never** returned. The refresh-token endpoint returns only
> `{ accessToken, refreshToken }` (no `user`).

### Login request / response
```jsonc
// POST /api/v1/auth/login
{ "username": "officer1", "password": "secret123" }
→ 200 { "success": true, "data": {
     "accessToken": "eyJ…", "refreshToken": "eyJ…", "user": { /* UserDto */ } } }
```
Login failures return a **generic** `401 UNAUTHORIZED` ("Invalid username or
password") to avoid user enumeration.

---

## 5. Role model & authorization matrix

Roles (`prisma/schema.prisma:21`): `ADMIN`, `PROCUREMENT_OFFICER`, `FPO`,
`FARMER`, `BUYER`.

Authorization is enforced **server-side** by resolving the user row on every
request (`middleware/auth.ts`) — the JWT `role` is only a hint; the database
role is authoritative. Row-level scoping (`scopeFor`) means a FARMER only sees
their own lots/inspections, an FPO sees its FPO's, etc.

| Capability | ADMIN | PROCUREMENT_OFFICER | FPO | FARMER | BUYER |
|---|:--:|:--:|:--:|:--:|:--:|
| Register users | ✅ | — | — | — | — |
| Create/close lots | ✅* | ✅* | read-scoped | read-scoped | — |
| Create inspections & drive pipeline | ✅ | ✅ | read-only | read-only | read-only (COMPLETED/CERTIFIED) |
| View own lots/inspections | ✅ | centre/officer scoped | FPO scoped | farmer scoped | certified only |
| IoT device register | ✅ | — | — | — | — |
| Certificates list/revoke | ✅ | read | read | read | read |
| Public verify | (anyone) | (anyone) | (anyone) | (anyone) | (anyone) |
| Analytics dashboard (own role) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Config (fusion/grading) | ✅ | — | — | — | — |
| Demo run | ✅ | ✅ | — | — | — |

\* **See contract problems:** `POST /api/v1/lots` only requires `requireAuth`
(`lots.routes.ts:61`) — *any* authenticated role can create a lot. This is
inconsistent with the inspection-create guard (`requireOfficer`).

---

## 6. Enums (domain vocabulary)

```text
Role            ADMIN | PROCUREMENT_OFFICER | FPO | FARMER | BUYER
UserStatus      ACTIVE | INACTIVE | SUSPENDED
LotStatus       REGISTERED | READY_FOR_INSPECTION | INSPECTION_IN_PROGRESS
                | GRADED | CERTIFIED | REJECTED | CLOSED
InspectionStatus CREATED | SAMPLE_ASSIGNED | SENSOR_STABILIZING | CAPTURED
                | AI_PROCESSING | FUSION_PROCESSING | GRADED
                | CERTIFICATE_GENERATED | COMPLETED | FAILED | CANCELLED
Grade           GRADE_A | URS | REJECTED
RiskLevel       LOW | MEDIUM | HIGH | CRITICAL
DeviceStatus    ONLINE | OFFLINE | MAINTENANCE
AnalysisType    VISION | GAS | ENVIRONMENT | FUSION
DefectType      HEALTHY | DAMAGED | ROTTEN | SPROUTED | UNDERSIZED | OTHER
Severity        LOW | MEDIUM | HIGH
AiMode          MOCK | REAL
CertificateStatus VALID | REVOKED | EXPIRED
StabilizationStatus IDLE | STABILIZING | STABLE | FAILED
```

---

## 7. Endpoint catalog

Legend: **Auth** = bearer required; **Roles** = who may call (beyond auth).

### 7.1 Lots (`lots.routes.ts`)
Base `/api/v1/lots`. All require auth.

| Method | Path | Roles | Query / Body | Returns |
|---|---|---|---|---|
| GET | `/` | any (scoped) | `page,pageSize,sortBy,sortOrder,search,farmerId,fpoId,centreId,status,dateFrom,dateTo` | paginated `Lot[]` (incl. farmer/fpo/centre summary) |
| GET | `/:id` | any (ownership) | — | `Lot` (incl. farmer,fpo,centre, last 10 inspections) |
| POST | `/` | **any auth** ⚠️ | `farmerId(cuid),fpoId?,centreId?,crop?='ONION',quantity>0,unit?='KG',harvestDate?,status?` | `Lot` (201) |
| PATCH | `/:id` | any auth | partial of create body (incl. `status`) | `Lot` |
| POST | `/:id/close` | any auth | — | `Lot` (status=CLOSED) |

`Lot` shape (`prisma/schema.prisma:245`): `id, lotNumber, farmerId, fpoId?,
centreId?, crop, quantity, unit, harvestDate?, status, createdAt, updatedAt`.

### 7.2 Inspections (`inspection.routes.ts`)
Base `/api/v1/inspections`. `router.use(requireAuth)` — every route needs a
token. Mutations require `requireOfficer` (OFFICER or ADMIN).

| Method | Path | Roles | Body / Query | Returns |
|---|---|---|---|---|
| GET | `/` | any (scoped) | `page,pageSize,status?,lotId?,sortBy?='createdAt',sortOrder?='desc'` | paginated `Inspection` (incl. lot summary, sample, fusionResult) |
| POST | `/` | **OFFICER/ADMIN** | `{ lotId(cuid), centreId?(cuid) }` | `Inspection` (201, status=CREATED) |
| GET | `/:id` | any (ownership) | — | full `Inspection` (lot+farmer+fpo+centre, sample, images, device, analyses+defects, fusionResult, certificates) |
| GET | `/:id/timeline` | any (ownership) | — | `AuditLog[]` (max 100) |
| POST | `/:id/sample` | **OFFICER/ADMIN** | `{ sampleSize?=100, weight? }` | `Inspection` (→SAMPLE_ASSIGNED) |
| POST | `/:id/device` | **OFFICER/ADMIN** | `{ deviceCode(min2,max64) }` | `Inspection` (→SENSOR_STABILIZING) |
| POST | `/:id/stabilization/complete` | **OFFICER/ADMIN** | — | `Inspection` (→CAPTURED) |
| POST | `/:id/images` | **OFFICER/ADMIN** | **multipart/form-data**, field `image` | `ImageAsset` (201) or `{ message:"No image provided" }` |
| POST | `/:id/analyze` | **OFFICER/ADMIN** | — | `{ vision: VisionResult, gas: GasResult }` (→AI_PROCESSING→FUSION_PROCESSING) |
| POST | `/:id/fuse` | **OFFICER/ADMIN** | — | `{ fused: FusionOutput, graded: GradingOutput }` (→GRADED) |
| POST | `/:id/certificate` | **OFFICER/ADMIN** | — | `{ inspection, certificate }` (→CERTIFICATE_GENERATED) |
| POST | `/:id/complete` | **OFFICER/ADMIN** | — | `Inspection` (→COMPLETED) |
| POST | `/:id/cancel` | **OFFICER/ADMIN** | — | `Inspection` (→CANCELLED) |

**Errors:** wrong state → `409 INVALID_STATE_TRANSITION` (e.g. `analyze` when not
`CAPTURED`). Image upload of wrong MIME → `422 VALIDATION_ERROR`. AI failure
(PYTHON mode) → `503 AI_SERVICE_ERROR` + state set to `FAILED`.

> **Frontend gotcha:** there is **no** `PATCH`/update inspection endpoint, and
> `addImageSchema`/`updateInspectionSchema` are defined but **not wired** to any
> route. Notes/overrides are reserved-only.

### 7.3 IoT (`iot.routes.ts`)
Base `/api/v1/iot`. All require auth.

| Method | Path | Roles | Body | Returns |
|---|---|---|---|---|
| POST | `/` | **ADMIN** | `{ deviceCode, name?, type?='GAS_POD', centreId? }` | `IoTDevice` (201) |
| GET | `/` | any (officer centre-scoped) | `page,pageSize,status?` | paginated `IoTDevice[]` |
| GET | `/:code` | any | — | `IoTDevice` (incl. last 50 readings) |
| POST | `/:code/heartbeat` | any | `{ firmwareVersion?, status? }` | `IoTDevice` |
| POST | `/:code/readings` | any | `{ readings: ReadingInput[] (1..500) }` | `{ inserted: number }` |

`ReadingInput`: `{ timestamp?, temperature?, humidity?, gas1?, gas2?, gas3?, airQuality?, rawPayload? }`.
`IoTDevice`: `id, deviceCode, name?, type, centreId?, status, firmwareVersion?,
lastSeenAt?, boundInspectionId?`.

### 7.4 Certificates (`certificates.routes.ts`)
Base `/api/v1/certificates`. All require auth.

| Method | Path | Roles | Query/Body | Returns |
|---|---|---|---|---|
| GET | `/` | any | `page,pageSize,status?('VALID'|'REVOKED'|'EXPIRED')` | paginated `Certificate` (incl. inspection summary) |
| GET | `/:id` | any | — | `Certificate` (incl. inspection+lot) |
| POST | `/:id/revoke` | **ADMIN** | `{ reason? }` (body) | `Certificate` (status=REVOKED) |

### 7.5 Public verification (`verification.routes.ts`) — **NO AUTH**
Base `/api/v1/public`.

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/:token` | **None** | `CertificatePublicView` (see §10) |

> ⚠️ **Path discrepancy (see problems):** the code mounts this router at
> `/public` with route `/:token`, so the **real** path is
> **`GET /api/v1/public/:token`** — *not* `/api/v1/public/verify/:token` as the
> in-code comment, the `/api/v1/` root descriptor, and the Swagger spec claim.

### 7.6 Analytics (`analytics.routes.ts`)
Base `/api/v1/analytics`. All require auth.

| Method | Path | Roles | Returns |
|---|---|---|---|
| GET | `/dashboard` | any | dashboard for **caller's own role** (see §11) |
| GET | `/officer` | any | `officerDashboard` |
| GET | `/fpo` | any | `fpoDashboard` |
| GET | `/farmer` | any | `farmerDashboard` |
| GET | `/buyer` | any | `buyerDashboard` |
| GET | `/overview` | **ADMIN** | `adminDashboard` |

### 7.7 Reports (`reports.routes.ts`)
Base `/api/v1/reports`. Auth required.

| Method | Path | Returns |
|---|---|---|
| GET | `/inspection/:id` | `{ generatedAt, inspection (full), report (summary), timeline }` |

### 7.8 Config (`config.routes.ts`) — **ADMIN only**
Base `/api/v1/config`. `router.use(requireAuth, requireAdmin)` — every route
(incl. GET) is ADMIN-only.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/fusion` | — | `{ active: FusionConfigView, history: FusionConfigView[] }` |
| PUT | `/fusion` | `{ visionWeight(0..1), gasWeight(0..1), environmentWeight(0..1), earlySpoilageEnabled? }` | `FusionConfigView` |
| GET | `/grading` | — | `{ gradeA, urs }` |
| PUT | `/grading` | `{ gradeA(0..100), urs(0..100) }` (must have gradeA > urs) | `{ gradeA, urs }` |

`FusionConfigView`: `id, visionWeight, gasWeight, environmentWeight,
earlySpoilageEnabled, version, isActive, updatedAt`.

### 7.9 Demo (`demo.routes.ts`)
Base `/api/v1/demo`. Auth required; `/run` requires OFFICER/ADMIN.

| Method | Path | Roles | Body | Returns |
|---|---|---|---|---|
| GET | `/scenarios` | any | — | `{ scenarios: ['NORMAL_GRADE_A','URS','REJECTED','EARLY_SPOILAGE'] }` |
| POST | `/run` | **OFFICER/ADMIN** | `{ scenario(enum), lotId?(cuid) }` | `DemoRunResult` |

`DemoRunResult`: `{ scenario, inspectionNumber, grade, riskLevel,
earlySpoilage, qualityScore, certificateNumber, verificationToken }`.

> This is a **SIMULATED** end-to-end run with precomputed AI results
> (`demo.service.ts:scenarioAnalyses`). It is the easiest way to seed a
> completed, certified inspection for frontend demos.

### 7.10 Reference entities (farmers / fpos / centres / buyers)
Each base (`/api/v1/farmers`, `/fpos`, `/centres`, `/buyers`) exposes the same
shape: `GET /` (paginated, search), `GET /:id`, `POST /` (**ADMIN only**),
`PATCH /:id` (**ADMIN only**). All require auth.

- **Farmers** — FPO users are scoped to their own `fpoId`; a FARMER may only
  read their own profile (`farmerId`). Create body: `farmerCode, name,
  phone?, village?, district?, state?, fpoId?, userId?`.
- **FPOs** — create body: `code, name, registrationNumber?, district?, state?,
  contactPerson?, phone?`. List includes `_count.farmers`.
- **Centres** — create body: `centreCode, name, location?, district?, state?,
  status?='ACTIVE'`.
- **Buyers** — create body: `companyName, buyerCode, location?, phone?, userId?`.

### 7.11 Health (`health.routes.ts`)
| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/health` | None | `{ status:'healthy', service, version, timestamp }` |
| GET | `/api/health/dependencies` | None | `{ status:'up'|'degraded'|'down', dependencies: { database, ai_vision, ai_gas, iot, websocket } }` |

---

## 8. Inspection state machine (`stateMachine.ts`)

Strictly linear. Any illegal jump → `409 INVALID_STATE_TRANSITION`.

```
CREATED
  → SAMPLE_ASSIGNED
    → SENSOR_STABILIZING
      → CAPTURED
        → AI_PROCESSING
          → FUSION_PROCESSING
            → GRADED
              → CERTIFICATE_GENERATED
                → COMPLETED
FAILED  → (retry to CAPTURED | AI_PROCESSING | FUSION_PROCESSING | GRADED)
CANCELLED (from any non-terminal state)
CANCELLED / COMPLETED / FAILED = terminal (cannot transition further)
```
- `CANCELLED` is reachable from **any** non-terminal state (special-cased in
  `canTransition`).
- `FAILED` is reachable from `AI_PROCESSING` / `FUSION_PROCESSING` and is
  **recoverable** (can go back to `CAPTURED`).
- Stabilization has its **own** timer: `bindDevice` sets `stabilizationEndsAt =
  now + SENSOR_DWELL_SECONDS` (default 30s). `stabilization/complete` before
  that time → `409 CONFLICT "Sensor stabilization still in progress"` (the demo
  runner passes `{ force: true }` to skip the dwell — **not exposed via API**).

**Frontend implication:** the UI should drive the pipeline by calling the
matching POST endpoints in order; it must never assume it can skip steps. Disable
a button until the current state permits the next transition.

---

## 9. AI / Fusion / Grading result objects

### 9.1 VisionResult (`services/ai/types.ts:17`)
```json
{
  "modelName": "onionsure-vision-mock",
  "modelVersion": "1.0.0-mock",
  "quality": 88,            // 0..100 surface quality
  "confidence": 0.94,       // 0..1
  "defects": [
    { "type": "HEALTHY", "count": 94, "severity": "LOW", "confidence": 0.94 },
    { "type": "DAMAGED", "count": 4,  "severity": "MEDIUM", "confidence": 0.94 },
    { "type": "ROTTEN",  "count": 2,  "severity": "HIGH", "confidence": 0.94 }
  ],
  "processingTimeMs": 312
}
```

### 9.2 GasResult (`services/ai/types.ts:28`)
```json
{
  "modelName": "onionsure-gas-mock",
  "modelVersion": "1.0.0-mock",
  "quality": 84,
  "confidence": 0.9,
  "risk": "LOW",            // LOW | MEDIUM | HIGH
  "earlySpoilageRisk": false,
  "environment": { "quality": 88, "confidence": 0.9, "temperature": 24.5, "humidity": 70 },
  "readingsSummary": { /* optional aggregate */ },
  "processingTimeMs": 220
}
```
> **In MOCK mode** (`AI_MODE=MOCK`, the running config) these values are
> **deterministic synthetic numbers** seeded by `inspectionId` (`visionClient.ts`,
> `gasClient.ts`). They are **not** real model output. The `PYTHON` adapters exist
> but require external services (`AI_VISION_URL`, `AI_GAS_URL`) that are **not
> running here** → would return `503`.

### 9.3 FusionOutput (`services/fusion/fusionEngine.ts:41`)
Returned by `POST /inspections/:id/fuse` as `data.fused`:
```json
{
  "finalScore": 87,         // 0..100 weighted fusion score
  "confidence": 0.91,
  "riskLevel": "LOW",        // LOW|MEDIUM|HIGH (CRITICAL never emitted by engine)
  "earlySpoilage": false,
  "warning": "…optional human-readable override note…",
  "explanation": "Vision 88/100, gas (LOW) 84/100, environment 88/100 fused to 87/100 (weights v=0.5, g=0.3, e=0.2).",
  "components": {
    "vision":     { "quality": 88, "confidence": 0.94, "weight": 0.5 },
    "gas":        { "quality": 84, "confidence": 0.9,  "weight": 0.3 },
    "environment":{ "quality": 88, "confidence": 0.9,  "weight": 0.2 }
  }
}
```
**Early-spoilage rule (the platform's differentiator):** if vision looks healthy
(`quality ≥ ALERT_VISION_ABOVE`, default 78) **but** gas risk is MEDIUM/HIGH (or
`earlySpoilageRisk` is true), `earlySpoilage=true` and `riskLevel` is forced to
`HIGH`, overriding the camera-only result.

### 9.4 GradingOutput (`services/grading/gradingEngine.ts:33`)
Returned by `POST /inspections/:id/fuse` as `data.graded`:
```json
{
  "grade": "GRADE_A",            // GRADE_A | URS | REJECTED
  "gradeAPercentage": 87.0,
  "ursPercentage": 11.2,
  "rejectedPercentage": 1.8,
  "riskLevel": "LOW",
  "thresholds": { "gradeA": 85, "urs": 65 }
}
```
Grade map: `score ≥ gradeA → GRADE_A`; `≥ urs → URS`; else `REJECTED`. Early
spoilage forces `riskLevel=HIGH` even if score is high. Composition
(Grade A / URS / Rejected %) is derived from defect counts when present, else
synthesized from the score.

### 9.5 Stored FusionResult (`prisma/schema.prisma:464`)
`id, inspectionId, visionQuality, visionConfidence, gasQuality, gasConfidence,
environmentQuality, environmentConfidence, finalScore, confidence, riskLevel,
earlySpoilage, explanationJson, weightsJson, fusionConfigVersion, createdAt`.

---

## 10. Certificate object

### 10.1 Stored `Certificate` (`prisma/schema.prisma:534`)
`id, certificateNumber, inspectionId, lotId?, snapshotJson (JSONB, immutable),
hash (SHA-256 of canonical snapshot), verificationToken (unique, unguessable),
qrData, grade?, qualityScore?, riskLevel?, gradeAPercentage?, ursPercentage?,
rejectedPercentage?, issuedAt, expiresAt?, status ('VALID'|'REVOKED'|'EXPIRED'),
revokedAt?, revokedById?, revokeReason?, createdAt`.

### 10.2 Public verify view (`certificate.service.ts:18`) — returned by `GET /api/v1/public/:token`
```json
{
  "certificateNumber": "CERT-2026-000001",
  "inspectionNumber": "INS-2026-000042",
  "lotNumber": "LOT-2026-000010",
  "grade": "GRADE_A",
  "qualityScore": 87,
  "gradeAPercentage": 87.0,
  "ursPercentage": 11.2,
  "rejectedPercentage": 1.8,
  "riskLevel": "LOW",
  "earlySpoilage": false,
  "issuedAt": "2026-01-20T10:00:00.000Z",
  "expiresAt": null,
  "status": "VALID",
  "verificationUrl": "http://localhost:3000/verify/<token>",
  "integrityOk": true
}
```
- `integrityOk` is recomputed at read time: the snapshot is re-hashed and compared
  to the stored `hash`. Tampering → `422 CERTIFICATE_INTEGRITY_ERROR`.
- `verificationUrl` is built from `QR_BASE_URL` (currently
  `http://localhost:3000/verify`) — i.e. the **frontend** is expected to host a
  `/verify/:token` page that calls this very endpoint.

---

## 11. Dashboard objects (`analytics.service.ts`)

All return `{ role: '<ROLE>', ... }`. The frontend renders exactly what the
backend returns — it **never** recomputes grades/percentages/risk.

**Officer (`officerDashboard`):**
```json
{
  "role": "PROCUREMENT_OFFICER",
  "totalInspections": 42,
  "inspectionsToday": 3,
  "averageQualityScore": 81.4,
  "gradeDistribution": { "GRADE_A": 20, "URS": 15, "REJECTED": 7 },
  "riskDistribution": { "LOW": 25, "MEDIUM": 12, "HIGH": 5, "CRITICAL": 0 },
  "lotsByStatus": { "REGISTERED": 4, "CERTIFIED": 10, "REJECTED": 2, "CLOSED": 1 },
  "centreThroughput": [ { "centreId": "…", "name": "Hub A", "count": 30 } ],
  "recentInspections": [ { "id","inspectionNumber","status","grade","qualityScore","riskLevel","createdAt","lot":{ "lotNumber","farmer":{ "name" } } } ]
}
```

**FPO (`fpoDashboard`):** `{ role, totalLots, totalInspections,
averageQualityScore, gradeDistribution, riskDistribution, recentInspections }`.

**Farmer (`farmerDashboard`):** `{ role, totalLots, lotStatuses,
totalCertificates, averageQualityScore, gradeDistribution }`.

**Buyer (`buyerDashboard`):** `{ role, availableLots (count of CERTIFIED|CLOSED
lots), gradeDistribution, riskDistribution }`.

**Admin (`adminDashboard`, `/overview`):** `{ role, totalUsers, totalLots,
totalInspections, onlineDevices, validCertificates, gradeDistribution,
riskDistribution }`.

---

## 12. Upload flow (image capture)

1. POST `multipart/form-data` to `/api/v1/inspections/:id/images` with field name
   **`image`** (single file). Requires OFFICER/ADMIN + inspection in `CAPTURED`
   state.
2. Allowed MIME: `image/jpeg, image/png, image/webp, image/gif`. Max size =
   `MAX_UPLOAD_MB` (10 MB). Max files = 10 (single here).
3. Backend stores the bytes via the storage driver and creates an `ImageAsset`
   row. Returns `201` with:
   ```json
   {
     "id": "clx…", "inspectionId": "clx…", "sampleId": null,
     "storageKey": "abcd…ef.jpg", "originalFilename": "onion1.jpg",
     "mimeType": "image/jpeg", "size": 123456, "status": "UPLOADED",
     "createdAt": "…"
   }
   ```
4. **No `url` field is returned.** With the **local** driver, the image is
   served statically at `GET /uploads/:storageKey` (e.g. `/uploads/abcd…ef.jpg`).
   The frontend must construct that path itself. (With `STORAGE_DRIVER=s3` there
   is **no** signed-URL endpoint — see problems.)

> ⚠️ If no file is attached, the route returns `200 { "message": "No image
> provided" }` (not an error). The frontend should always send the `image` field.

---

## 13. WebSocket realtime events (`services/realtime/hub.ts`)

- Connect: `ws://localhost:4000/ws?token=<ACCESS_TOKEN>`. Token is optional but
  recommended; without it the client is anonymous (can still subscribe to
  `global`).
- **Subscribe** (client → server):
  ```json
  { "type": "subscribe", "channels": ["inspection:<id>", "centre:<id>", "user:<id>", "global"] }
  ```
  Server replies: `{ "type": "subscribed", "channels": [...] }`.
- **Event envelope** (server → client):
  ```json
  { "channel": "inspection:<id>", "event": "<EVENT>", "payload": { /* ... */ }, "timestamp": "…" }
  ```
- **Per-inspection events** (`inspection:<id>`): `created`, `status`
  (payload `{from,to}`), `device_bound`, `device_heartbeat`, `image`, `readings`,
  `completed`, `cancelled`, `certificate`.
- **Global events:** `certificate_issued`, `certificate_revoked`, `config_fusion_updated`,
  `config_grading_updated`, `demo_run`.

> The server does **not** validate that a subscriber is allowed to see a given
> `inspection:<id>` channel — any connected client can subscribe to any channel
> (see problems).

---

## 14. Summary of what is REAL vs SIMULATED (for the integration map)

- **REAL / fully implemented & persisted:** auth, lots, inspections pipeline,
  IoT device registry + readings ingest, certificates (issue/verify/revoke),
  public verify, analytics dashboards, reports, config (fusion/grading), demo
  runner, farmers/fpos/centres/buyers CRUD, health, WebSocket hub, local file
  storage.
- **SIMULATED (MOCK):** the vision + gas AI analysis. With `AI_MODE=MOCK` (current
  runtime) the numbers are deterministic synthetic outputs, not a real model.
- **NOT IMPLEMENTED here:** the `PYTHON` AI microservices (`AI_VISION_URL`,
  `AI_GAS_URL`) are not running, so `AI_MODE=PYTHON` would fail with `503`. The
  S3 storage driver is wired but untested and has no URL endpoint.

> The screen-by-screen frontend integration map for each role, and the full list
> of backend contract problems that will make React development harder, are in
> **`docs/FRONTEND_INTEGRATION_MAP.md`**.
