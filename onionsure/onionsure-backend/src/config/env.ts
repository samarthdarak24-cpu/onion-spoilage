/**
 * Centralised, validated runtime configuration.
 *
 * Spec §43 — every tunable value is an environment variable, validated once at
 * boot with Zod so the process fails fast and loudly on a bad deployment
 * instead of misbehaving later at request time.
 *
 * Secrets are never logged (see utils/logger.ts redaction).
 */
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load `.env` from the project root (works from src/ and dist/ alike).
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const boolFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const EnvSchema = z.object({
  // --- Core -------------------------------------------------
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // --- Database ---------------------------------------------
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // --- Auth -------------------------------------------------
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  // --- AI services ------------------------------------------
  AI_MODE: z.enum(['MOCK', 'PYTHON']).default('MOCK'),
  USE_PYTHON: boolFromString,
  PYTHON_BIN: z.string().default('python3'),
  AI_VISION_URL: z.string().url().default('http://localhost:8001'),
  AI_GAS_URL: z.string().url().default('http://localhost:8002'),
  FUSION_SERVICE_URL: z.string().url().default('http://localhost:8003'),

  // --- Storage ----------------------------------------------
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),

  // --- URLs -------------------------------------------------
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),
  QR_BASE_URL: z.string().default('http://localhost:3000/verify'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // --- Fusion defaults (runtime-overridable by ADMIN) -------
  FUSION_WEIGHT_VISION: z.coerce.number().min(0).max(1).default(0.5),
  FUSION_WEIGHT_GAS: z.coerce.number().min(0).max(1).default(0.3),
  FUSION_WEIGHT_ENVIRONMENT: z.coerce.number().min(0).max(1).default(0.2),

  // --- Grading thresholds (runtime-overridable by ADMIN) ----
  GRADE_A_THRESHOLD: z.coerce.number().min(0).max(100).default(85),
  URS_THRESHOLD: z.coerce.number().min(0).max(100).default(65),

  // --- Early spoilage rule ----------------------------------
  ALERT_VISION_ABOVE: z.coerce.number().min(0).max(100).default(78),

  // --- Sensor -----------------------------------------------
  SENSOR_DWELL_SECONDS: z.coerce.number().int().positive().default(30),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n[config] Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = parsed.data;

/** Derived, ergonomic groupings used across the codebase. */
export const fusionDefaults = {
  weights: {
    vision: env.FUSION_WEIGHT_VISION,
    gas: env.FUSION_WEIGHT_GAS,
    environment: env.FUSION_WEIGHT_ENVIRONMENT,
  },
  earlySpoilage: {
    visionHealthyAbove: env.ALERT_VISION_ABOVE,
  },
};

export const gradingDefaults = {
  gradeA: env.GRADE_A_THRESHOLD,
  urs: env.URS_THRESHOLD,
};

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
