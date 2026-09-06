/**
 * Central error handling (spec §35).
 *
 * - AppError  → mapped to its documented status + code.
 * - ZodError  → VALIDATION_ERROR with per-field messages.
 * - Multer    → VALIDATION_ERROR (upload size / type problems).
 * - Unknown   → INTERNAL_SERVER_ERROR, logged with stack, never leaked.
 *
 * Stack traces are omitted outside development.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, isAppError, statusForCode } from '../utils/errors';
import { logger } from '../utils/logger';
import { isProduction } from '../config/env';

/** Flatten a ZodError into `{ field: message }`. */
export function zodFieldErrors(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  res.status(status).json({
    success: false,
    error: { code, message, ...(details && Object.keys(details).length ? { details } : {}) },
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // --- Known application errors -----------------------------
  if (isAppError(err)) {
    logger.warn(
      { code: err.code, status: err.statusCode, path: req.originalUrl, details: err.details },
      err.message,
    );
    sendError(res, err.statusCode, err.code, err.message, err.details as Record<string, unknown> | undefined);
    return;
  }

  // --- Schema validation ------------------------------------
  if (err instanceof ZodError) {
    const fields = zodFieldErrors(err);
    logger.warn({ path: req.originalUrl, fields }, 'Validation failed');
    sendError(res, statusForCode('VALIDATION_ERROR'), 'VALIDATION_ERROR', 'Validation failed', { fields });
    return;
  }

  // --- Multer (upload) errors -------------------------------
  const multerErr = err as { name?: string; code?: string; message?: string; field?: string };
  if (multerErr?.name === 'MulterError') {
    logger.warn({ path: req.originalUrl, code: multerErr.code }, multerErr.message);
    let message = multerErr.message || 'File upload failed';
    if (multerErr.code === 'LIMIT_FILE_SIZE') message = 'Uploaded file exceeds the maximum allowed size';
    if (multerErr.code === 'LIMIT_FILE_COUNT') message = 'Too many files uploaded';
    if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') message = `Unexpected file field "${multerErr.field}"`;
    sendError(res, statusForCode('VALIDATION_ERROR'), 'VALIDATION_ERROR', message);
    return;
  }

  // --- Malformed JSON body ----------------------------------
  const syntaxErr = err as { type?: string; status?: number; body?: unknown };
  if (syntaxErr?.type === 'entity.parse.failed') {
    sendError(res, statusForCode('VALIDATION_ERROR'), 'VALIDATION_ERROR', 'Request body is not valid JSON');
    return;
  }

  // --- Entity too large -------------------------------------
  if (syntaxErr?.type === 'entity.too.large') {
    sendError(res, statusForCode('VALIDATION_ERROR'), 'VALIDATION_ERROR', 'Request body exceeds the size limit');
    return;
  }

  // --- Unknown / programming error --------------------------
  const status = statusForCode('INTERNAL_SERVER_ERROR');
  const message = isProduction ? 'Internal server error' : (err as Error)?.message || 'Internal server error';

  logger.error(
    {
      path: req.originalUrl,
      method: req.method,
      err: err instanceof Error ? err.message : String(err),
      ...(isProduction ? {} : { stack: (err as Error)?.stack }),
    },
    'Unhandled error',
  );

  sendError(res, status, 'INTERNAL_SERVER_ERROR', message);
}

/** Terminal 404 for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, statusForCode('NOT_FOUND'), 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
}

/**
 * Wrap an async express handler so rejected promises reach `errorHandler`
 * instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Re-export for convenience in controllers. */
export { AppError };
