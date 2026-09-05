/**
 * Structured logging (spec §53).
 *
 * Every pipeline stage logs: inspection ID, stage, duration, status, model
 * version, and any error. Secrets are redacted by path — passwords, JWTs,
 * hashes and tokens must never reach a log sink.
 */
import pino from 'pino';
import { env, isTest } from '../config/env';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'verificationToken',
  'jwt',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.verificationToken',
];

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  base: {
    service: 'onionsure-backend',
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type PipelineStage =
  | 'VISION'
  | 'GAS'
  | 'ENVIRONMENT'
  | 'FUSION'
  | 'GRADING'
  | 'CERTIFICATE'
  | 'IOT'
  | 'INSPECTION';

interface StageLogInput {
  inspectionId: string;
  stage: PipelineStage;
  status: 'started' | 'completed' | 'failed';
  durationMs?: number;
  modelName?: string;
  modelVersion?: string;
  mode?: 'MOCK' | 'REAL' | 'PYTHON';
  error?: unknown;
  extra?: Record<string, unknown>;
}

/**
 * Canonical pipeline log line, e.g.
 *   [AI] inspection=INS-001 stage=VISION status=completed duration=842ms
 */
export function logStage(input: StageLogInput): void {
  const {
    inspectionId, stage, status, durationMs, modelName, modelVersion, mode, error, extra,
  } = input;

  const payload: Record<string, unknown> = {
    inspectionId,
    stage,
    status,
    ...(durationMs !== undefined && { durationMs }),
    ...(modelName && { modelName }),
    ...(modelVersion && { modelVersion }),
    ...(mode && { mode }),
    ...extra,
  };

  if (status === 'failed') {
    logger.error({ ...payload, err: error instanceof Error ? error.message : String(error) },
      `[AI] inspection=${inspectionId} stage=${stage} status=failed`);
    return;
  }

  const duration = durationMs !== undefined ? ` duration=${durationMs}ms` : '';
  logger.info(payload, `[AI] inspection=${inspectionId} stage=${stage} status=${status}${duration}`);
}

/** Small helper to time an async pipeline stage and log it automatically. */
export async function withStageLog<T>(
  input: Omit<StageLogInput, 'status' | 'durationMs'>,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  logStage({ ...input, status: 'started' });
  try {
    const result = await fn();
    logStage({ ...input, status: 'completed', durationMs: Date.now() - started });
    return result;
  } catch (err) {
    logStage({ ...input, status: 'failed', durationMs: Date.now() - started, error: err });
    throw err;
  }
}
