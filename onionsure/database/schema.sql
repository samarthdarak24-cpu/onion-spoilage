-- ============================================================================
-- OnionSure — PostgreSQL production schema
-- Mirrors the JSON store used for zero-config local runs (server/db.js).
-- Apply with:  psql -U <user> -d onionsure -f schema.sql
-- Then override the connection in docs/DEPLOY.md (DATABASE_URL=postgres://...).
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(64) PRIMARY KEY,
  username        VARCHAR(80) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(24) NOT NULL CHECK (role IN ('procurement_officer','fpo','farmer','buyer','admin')),
  name            VARCHAR(120),
  email           VARCHAR(160),
  center_id       VARCHAR(64),
  fpo_id          VARCHAR(64),
  farmer_id       VARCHAR(64),
  buyer_id        VARCHAR(64),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procurement_centers (
  id           VARCHAR(64) PRIMARY KEY,
  name         VARCHAR(160) NOT NULL,
  location     VARCHAR(160),
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS fpos (
  id                  VARCHAR(64) PRIMARY KEY,
  name                VARCHAR(160) NOT NULL,
  center_id           VARCHAR(64) REFERENCES procurement_centers(id),
  registered_farmers  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS farmers (
  id              VARCHAR(64) PRIMARY KEY,
  name            VARCHAR(160) NOT NULL,
  fpo_id          VARCHAR(64) REFERENCES fpos(id),
  location        VARCHAR(160),
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  quality_grade_a INTEGER DEFAULT 0,
  total_lots      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buyers (
  id         VARCHAR(64) PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  location   VARCHAR(160),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lots (
  id                      VARCHAR(64) PRIMARY KEY,
  lot_number              VARCHAR(64) NOT NULL,
  farmer_id               VARCHAR(64) REFERENCES farmers(id),
  fpo_id                  VARCHAR(64) REFERENCES fpos(id),
  crop                    VARCHAR(64),
  variety                 VARCHAR(80),
  quantity_kg             DOUBLE PRECISION,
  procurement_center_id   VARCHAR(64) REFERENCES procurement_centers(id),
  inspector_id            VARCHAR(64),
  status                  VARCHAR(24) DEFAULT 'registered',
  created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspection_sessions (
  id              VARCHAR(64) PRIMARY KEY,
  lot_id          VARCHAR(64) REFERENCES lots(id),
  sample_weight_kg DOUBLE PRECISION,
  status          VARCHAR(24) DEFAULT 'in_progress',
  mode            VARCHAR(16),
  vision_mode     VARCHAR(16),
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inspection_images (
  id              VARCHAR(64) PRIMARY KEY,
  inspection_id   VARCHAR(64) REFERENCES inspection_sessions(id),
  angle           VARCHAR(24),
  file_name       VARCHAR(160),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id              VARCHAR(64) PRIMARY KEY,
  inspection_id   VARCHAR(64) REFERENCES inspection_sessions(id),
  ethane          DOUBLE PRECISION,
  methane         DOUBLE PRECISION,
  temperature     DOUBLE PRECISION,
  humidity        DOUBLE PRECISION,
  stage           VARCHAR(12),
  gas_score       INTEGER,
  timestamp       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vision_detections (
  id              VARCHAR(64) PRIMARY KEY,
  inspection_id   VARCHAR(64) REFERENCES inspection_sessions(id),
  class           VARCHAR(24),
  confidence      DOUBLE PRECISION,
  bbox            JSONB,
  size            INTEGER
);

CREATE TABLE IF NOT EXISTS fusion_results (
  id                    VARCHAR(64) PRIMARY KEY,
  inspection_id         VARCHAR(64) REFERENCES inspection_sessions(id),
  vision_score          INTEGER,
  gas_score             INTEGER,
  environmental_score   INTEGER,
  final_score           INTEGER,
  confidence            DOUBLE PRECISION,
  grade                 VARCHAR(16),
  risk_level            VARCHAR(12),
  early_spoilage_alert  BOOLEAN DEFAULT FALSE,
  explanation           TEXT
);

CREATE TABLE IF NOT EXISTS quality_certificates (
  id                    VARCHAR(64) PRIMARY KEY,
  inspection_id         VARCHAR(64) REFERENCES inspection_sessions(id),
  certificate_number    VARCHAR(64) UNIQUE NOT NULL,
  grade                 VARCHAR(16),
  quality_score         INTEGER,
  grade_a_percentage    DOUBLE PRECISION,
  urs_percentage        DOUBLE PRECISION,
  rejected_percentage   DOUBLE PRECISION,
  qr_token              VARCHAR(64),
  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qr_verifications (
  id                VARCHAR(64) PRIMARY KEY,
  certificate_id    VARCHAR(64) REFERENCES quality_certificates(certificate_number),
  token             VARCHAR(64),
  status            VARCHAR(16) DEFAULT 'VERIFIED',
  verified_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            VARCHAR(64) PRIMARY KEY,
  actor_id      VARCHAR(64),
  action        VARCHAR(64),
  entity        VARCHAR(64),
  detail        TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_model_versions (
  id            VARCHAR(64) PRIMARY KEY,
  name          VARCHAR(80),
  version       VARCHAR(24),
  type          VARCHAR(24),
  accuracy      DOUBLE PRECISION,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sensor_devices (
  id            VARCHAR(64) PRIMARY KEY,
  device_id     VARCHAR(64) UNIQUE,
  transport     VARCHAR(16),
  battery       DOUBLE PRECISION,
  signal        VARCHAR(16),
  location      VARCHAR(160),
  last_seen     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lots_farmer  ON lots(farmer_id);
CREATE INDEX IF NOT EXISTS idx_lots_fpo     ON lots(fpo_id);
CREATE INDEX IF NOT EXISTS idx_insp_lot     ON inspection_sessions(lot_id);
CREATE INDEX IF NOT EXISTS idx_fusion_insp  ON fusion_results(inspection_id);
CREATE INDEX IF NOT EXISTS idx_cert_insp    ON quality_certificates(inspection_id);
