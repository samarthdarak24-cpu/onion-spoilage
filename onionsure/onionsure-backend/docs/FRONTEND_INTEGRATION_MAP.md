# FRONTEND INTEGRATION MAP & BACKEND CONTRACT PROBLEMS

> Companion to `FRONTEND_BACKEND_CONTRACT.md`. This document maps every typical
> product screen to the **actual** backend endpoint(s), tags each as
> **REAL / SIMULATED / MOCK / NOT IMPLEMENTED**, and then lists the backend
> contract problems that will make React development harder.
>
> **Status tags**
> - 🟢 **REAL** — endpoint implemented, persisted, and ready to consume.
> - 🟡 **SIMULATED / MOCK** — endpoint works but the *data* is synthetic
>   (deterministic mock AI, precomputed demo scenarios).
> - 🔴 **NOT IMPLEMENTED** — no backend endpoint exists for this screen's need.

---

## 1. ADMIN

| Screen | Backend call | Status | Notes |
|---|---|---|---|
| Login | `POST /auth/login` | 🟢 REAL | |
| Admin Overview dashboard | `GET /analytics/overview` | 🟢 REAL | counts: users, lots, inspections, devices, valid certs, grade/risk dist. |
| Role dashboard (generic) | `GET /analytics/dashboard` | 🟢 REAL | returns caller-role dashboard |
| **User list / management table** | — | 🔴 NOT IMPLEMENTED | No `GET /users`. Only `POST /auth/register` (create) + `GET /auth/me` exist. Cannot list/search/edit/disable users. |
| Register user | `POST /auth/register` (ADMIN) | 🟢 REAL | but audits wrong action (see problems) |
| FPO management | `GET/POST/PATCH /fpos`, `GET /fpos/:id` | 🟢 REAL | ADMIN-only writes |
| Farmer management | `GET/POST/PATCH /farmers` | 🟢 REAL | ADMIN-only writes; FPO users see scoped list |
| Buyer management | `GET/POST/PATCH /buyers` | 🟢 REAL | ADMIN-only writes |
| Centre management | `GET/POST/PATCH /centres` | 🟢 REAL | ADMIN-only writes |
| IoT device registry | `GET/POST /iot`, `GET /iot/:code` | 🟢 REAL | register = ADMIN only |
| Fusion config editor | `GET/PUT /config/fusion` | 🟢 REAL | ADMIN only (all config routes) |
| Grading thresholds editor | `GET/PUT /config/grading` | 🟢 REAL | ADMIN only |
| Certificate revocation | `POST /certificates/:id/revoke` | 🟢 REAL | ADMIN only |
| Certificate browser | `GET /certificates` | 🟢 REAL | paginated |
| Audit / activity log browser | — | 🔴 NOT IMPLEMENTED | `AuditLog` model exists but no list endpoint (only per-inspection timeline). |
| Demo runner | `POST /demo/run` | 🟡 SIMULATED | precomputed scenarios, deterministic |
| WebSocket live feed | `ws://…/ws?token=` (global events) | 🟢 REAL | but no channel auth (see problems) |

---

## 2. PROCUREMENT OFFICER

| Screen | Backend call | Status | Notes |
|---|---|---|---|
| Login | `POST /auth/login` | 🟢 REAL | |
| Officer dashboard | `GET /analytics/officer` (or `/dashboard`) | 🟢 REAL | lotsByStatus, grade/risk dist, centre throughput, recent inspections |
| Lot list | `GET /lots` | 🟢 REAL | centre-scoped |
| Lot create | `POST /lots` | 🟢 REAL | ⚠️ open to any auth role (see problems) |
| Lot detail | `GET /lots/:id` | 🟢 REAL | |
| Lot close | `POST /lots/:id/close` | 🟢 REAL | |
| Inspection list | `GET /inspections` | 🟢 REAL | centre/officer scoped |
| Inspection detail | `GET /inspections/:id` | 🟢 REAL | full pipeline incl. analyses, fusion, certs |
| **Pipeline wizard** | `POST /inspections` → `/sample` → `/device` → `/stabilization/complete` → `/images` (multipart) → `/analyze` → `/fuse` → `/certificate` → `/complete` | 🟢 REAL (orchestration) + 🟡 MOCK (AI) | Steps are real state transitions; the **vision+gas numbers from `/analyze` are MOCK** in current `AI_MODE=MOCK`. |
| Image capture upload | `POST /inspections/:id/images` (field `image`) | 🟢 REAL | response has no `url`; build `/uploads/:storageKey` (local only) |
| Inspection report | `GET /reports/inspection/:id` | 🟢 REAL | full printable snapshot + timeline |
| IoT device readings | `GET /iot/:code` | 🟢 REAL | last 50 readings (static snapshot; no streaming cursor) |
| Certificate share / QR | `GET /public/:token` + `verificationUrl` | 🟢 REAL | QR points to `localhost:3000/verify/:token` (frontend page) |
| Demo runner | `POST /demo/run` | 🟡 SIMULATED | |

---

## 3. FPO

| Screen | Backend call | Status | Notes |
|---|---|---|---|
| Login | `POST /auth/login` | 🟢 REAL | |
| FPO dashboard | `GET /analytics/fpo` | 🟢 REAL | totalLots, totalInspections, avg quality, grade/risk dist, recent |
| Farmers under my FPO | `GET /farmers?fpoId=<mine>` | 🟢 REAL | auto-scoped to `user.fpoId` |
| Lots (read) | `GET /lots` | 🟢 REAL | FPO sees only its `fpoId` lots |
| Inspections (read) | `GET /inspections` | 🟢 REAL | scoped to `fpoId` |
| Certificates (read) | `GET /certificates` | 🟢 REAL | |
| Create inspection | `POST /inspections` | 🔴 FORBIDDEN | officer-only; FPO gets 403. No FPO-led inspection flow. |
| Public certificate verify | `GET /public/:token` | 🟢 REAL | |

---

## 4. FARMER

| Screen | Backend call | Status | Notes |
|---|---|---|---|
| Login | `POST /auth/login` | 🟢 REAL | |
| Farmer dashboard | `GET /analytics/farmer` | 🟢 REAL | totalLots, lotStatuses, totalCertificates, avg quality, grade dist |
| My lots | `GET /lots` | 🟢 REAL | auto-scoped to `user.farmerId` |
| My inspections | `GET /inspections` | 🟢 REAL | scoped via lot.farmerId |
| My certificates | `GET /certificates` | 🟢 REAL | |
| Certificate / quality result view | `GET /inspections/:id`, `GET /reports/inspection/:id` | 🟢 REAL | |
| Share / verify my certificate | `GET /public/:token` | 🟢 REAL | |
| Create lot / inspection | `POST /lots`, `POST /inspections` | 🔴 FORBIDDEN / open | lot create is open to any auth (inconsistent); inspection create is officer-only. |

> ⚠️ A FARMER **user row must be linked to a `Farmer` record** (`userId` FK) and
> have `farmerId` populated, otherwise scoping falls back to `'__none__'` and the
> dashboard/list returns empty. The frontend cannot fix this — it is a
> data-seeding dependency.

---

## 5. BUYER

| Screen | Backend call | Status | Notes |
|---|---|---|---|
| Login | `POST /auth/login` | 🟢 REAL | |
| Buyer dashboard | `GET /analytics/buyer` | 🟢 REAL | `availableLots` = **count only** of CERTIFIED|CLOSED lots; grade/risk dist |
| **Marketplace / browse certified lots** | — | 🔴 NOT IMPLEMENTED | No endpoint returns the *list* of certified/available lots. `buyerDashboard` only returns a count. `GET /lots` is not buyer-filtered (returns all lots unfiltered). A real buyer marketplace screen cannot be built from current API. |
| Certificate verification (by token) | `GET /public/:token` | 🟢 REAL | core buyer feature |
| Inspection detail (read-only) | `GET /inspections/:id` | 🟢 REAL | only when status COMPLETED/CERTIFICATED |
| Grade/risk distribution chart | from `/analytics/buyer` | 🟢 REAL | |

---

## 6. Cross-cutting / shared screens

| Screen | Backend call | Status | Notes |
|---|---|---|---|
| Global live activity (WS) | `ws://…/ws?token=` subscribe `global` | 🟢 REAL | events: certificate_issued/revoked, config_*_updated, demo_run |
| Per-inspection live updates (WS) | subscribe `inspection:<id>` | 🟢 REAL | events: status, image, readings, completed, certificate… (no channel auth) |
| Public verify landing page | `GET /public/:token` | 🟢 REAL | frontend hosts `/verify/:token` (QR_BASE_URL) |
| Forgot / reset password | — | 🔴 NOT IMPLEMENTED | no endpoint |
| Change password | — | 🔴 NOT IMPLEMENTED | no endpoint |
| Notification history | — | 🔴 NOT IMPLEMENTED | WS `user:<id>` events exist but no REST history |
| Search across inspections | `GET /inspections?search=` | 🔴 NOT IMPLEMENTED | inspections list has no `search` param (lots does) |

---

# BACKEND CONTRACT PROBLEMS (will make React development harder)

Ordered by impact. **No backend code has been changed** — these are findings for
your approval before any fix.

### P1 — Public verify path is wrong in all docs (HIGH)
- **Where:** `v1.ts:33` (mount `/public`), `verification.routes.ts` (`/:token`),
  `v1.ts:56` root descriptor (`/public/verify/:token`), `swagger.ts:143`
  (`/public/verify/{token}`).
- **Problem:** the **real** path is `GET /api/v1/public/:token`. The comment,
  the `/api/v1/` root `endpoints` map, and the Swagger spec all advertise
  `/api/v1/public/verify/:token`. A frontend built from the docs hits **404**.
- **Fix:** either rename the route to `router.get('/verify/:token', …)` (recommended,
  matches docs) **or** correct the three doc references. Pick one source of truth.

### P2 — No user-listing / user-management read API (HIGH, for ADMIN)
- **Where:** only `POST /auth/register` + `GET /auth/me` exist; no `GET /users`.
- **Problem:** the Admin "Users" screen has nothing to list, search, edit, or
  disable. Role-based admin UI is blocked.
- **Fix:** add `GET /users` (ADMIN, paginated + search + role filter) and
  optionally `PATCH/DELETE /users/:id`.

### P3 — No buyer marketplace list endpoint (HIGH, for BUYER)
- **Where:** `buyerDashboard` returns only `availableLots` **count**; `GET /lots`
  is not buyer-filtered (`lots.routes.ts` `scopeFor` ignores BUYER → returns all).
- **Problem:** a buyer cannot browse the certified lots they are meant to purchase.
- **Fix:** add `GET /marketplace` (or scope `GET /lots` for BUYER to
  `CERTIFIED|CLOSED`) returning the lot list with grade/risk.

### P4 — `POST /lots` has no role guard (MEDIUM, security/contract)
- **Where:** `lots.routes.ts:61` `router.use(requireAuth)` only. Compare
  `inspection.routes.ts:57` which uses `requireOfficer`.
- **Problem:** any logged-in FARMER/FPO/BUYER can create lots. Inconsistent
  authorization and likely not intended.
- **Fix:** restrict lot creation to `requireOfficer` (or `requireOfficer,
  requireAdmin`) like inspections.

### P5 — Image URL not returned; only works for local storage (MEDIUM)
- **Where:** `addImage` returns `ImageAsset` with `storageKey` but no `url`
  (`inspection.service.ts:277`); static serve at `/uploads` only
  (`app.ts:62`, `storage/local.ts`).
- **Problem:** (a) frontend must hand-build `/uploads/:storageKey`; (b) with
  `STORAGE_DRIVER=s3` there is **no** signed-URL endpoint, so images break
  silently.
- **Fix:** return a `url` field from `addImage` (use `getStorage().url(key)`), and
  add a `GET /inspections/:id/images` or `GET /images/:id` resolver that returns
  signed URLs for both drivers.

### P6 — `sortBy` is an unvalidated free string → 500 on bad input (MEDIUM)
- **Where:** `inspection.routes.ts:45`, `lots.routes.ts:47`, entity lists.
- **Problem:** passing a column that doesn't exist throws a Prisma error mapped to
  **500 INTERNAL_SERVER_ERROR** instead of a 422. Fragile for sortable table
  headers.
- **Fix:** allowlist `sortBy` per resource (e.g. `z.enum([...])`), or coerce
  unknown → `createdAt`.

### P7 — Inspection `status` filter is free text, not an enum (LOW/MEDIUM)
- **Where:** `inspection.routes.ts:43` `status: z.string().optional()`.
- **Problem:** an invalid value silently yields an empty list (no error), which
  can look like "no data" bugs in filter UI.
- **Fix:** `z.enum([...InspectionStatus])` so bad filters 422 instead of
  returning empty.

### P8 — Upload with no file returns 200 (LOW)
- **Where:** `inspection.routes.ts:103` returns `200 { message: "No image
  provided" }`.
- **Problem:** UI can't distinguish "uploaded" from "nothing sent" by status
  code; easy to show a false success.
- **Fix:** return `400 VALIDATION_ERROR` when `req.file` is absent.

### P9 — Misleading audit actions (MEDIUM, ops/forensics)
- **Where:** `auth.service.ts:151` registers a user but audits `'LOT_CREATED'`;
  `farmers.routes.ts:89` audits `'LOT_CREATED'` for a farmer; `centres.routes.ts:72`
  audits `'CONFIG_UPDATED'` for a centre.
- **Problem:** audit trail is wrong, undermining the security/compliance value of
  `AuditLog`.
- **Fix:** use distinct actions (`USER_CREATED`, `FARMER_CREATED`,
  `CENTRE_CREATED`, …) or reuse `ENTITY_CREATED` consistently.

### P10 — WebSocket channel authorization absent (MEDIUM, security)
- **Where:** `hub.ts:onMessage` subscribes to any channel name sent by the
  client; `publish*` never checks membership.
- **Problem:** any authenticated (or anonymous) client can subscribe to
  `inspection:<id>` / `user:<id>` and receive another party's events.
- **Fix:** validate, on subscribe, that the caller's role/ownership permits the
  channel (reuse `scopeFor`/`getOwned` logic).

### P11 — Data-shape quirks to code defensively around (LOW)
- `riskDistribution` always includes a `CRITICAL` key, but the fusion engine
  never emits `CRITICAL` (only LOW/MEDIUM/HIGH) — charts should tolerate a 0.
- `Certificate.expiresAt` is **always null** (never set on issue) — expiry UI
  will always show "no expiry".
- `accepted()` (202) envelope is defined but **unused**; AI steps return 200
  synchronously — don't build a 202 polling path.
- `timeline` (`/inspections/:id/timeline`) and IoT readings are capped (100 / 50)
  with no pagination/cursor.

### P12 — `apiLimiter` defined but never applied (LOW)
- **Where:** `rateLimit.ts:29` exports `apiLimiter` (200/min) but no router uses
  it; only `authLimiter`/`registerLimiter` are wired.
- **Problem:** general abuse protection is missing despite the limiter existing.
- **Fix:** apply `apiLimiter` at `v1.ts` or per-module as desired.

### P13 — MOCK AI is the default; document it loudly (INFO)
- **Where:** `env.AI_MODE=MOCK` (running config). `visionClient.ts` /
  `gasClient.ts` produce deterministic synthetic scores. The `PYTHON` adapters
  exist but require `AI_VISION_URL` / `AI_GAS_URL` microservices that are **not
  running** → would return `503 AI_SERVICE_ERROR`.
- **Implication:** Any screen that displays quality/grade/risk is showing
  **simulated** data until a real model is wired. The demo runner
  (`/demo/run`) is fully SIMULATED by design — great for seeding, but must not be
  presented as "real AI results".

---

## Recommended fix order (pending your approval)
1. **P1** (verify path) — one-line route rename or doc correction; unblocks the
   public-certificate feature end to end.
2. **P2** + **P3** — add `GET /users` and a buyer marketplace list; unblocks
   Admin user management and the Buyer core screen.
3. **P4**, **P5**, **P6**, **P7** — authorization + response-shape hardening that
   prevent silent frontend bugs.
4. **P9**, **P10**, **P12** — audit correctness + WS auth + limiter wiring.
5. **P8**, **P11**, **P13** — polish / documentation.

> No files were modified. Once you approve, I can implement the agreed subset
> (each as a small, reviewable change) and re-run the test suite
> (`npm test` → 34/34 passing) to confirm no regressions.
