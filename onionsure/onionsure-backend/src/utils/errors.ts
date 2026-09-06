/**
 * Application error model (spec §35 / §36).
 *
 * Every failure path throws an `AppError` carrying a stable machine-readable
 * `code`. The error middleware maps that code to an HTTP status and renders the
 * `{ success: false, error: { code, message, details } }` envelope. Nothing
 * outside this module hardcodes status codes.
 */

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INVALID_STATE_TRANSITION',
  'AI_SERVICE_ERROR',
  'IOT_DEVICE_ERROR',
  'CERTIFICATE_INTEGRITY_ERROR',
  'INTERNAL_SERVER_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Canonical error-code → HTTP status mapping (spec §36). */
const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE_TRANSITION: 409,
  AI_SERVICE_ERROR: 503,
  IOT_DEVICE_ERROR: 503,
  CERTIFICATE_INTEGRITY_ERROR: 422,
  INTERNAL_SERVER_ERROR: 500,
};

export function statusForCode(code: ErrorCode): number {
  return STATUS_BY_CODE[code] ?? 500;
}

export interface ErrorDetails {
  /** Field-level validation issues, e.g. `{ username: 'Required' }`. */
  fields?: Record<string, string>;
  /** Arbitrary structured context for debugging (never secrets). */
  meta?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails;
  public readonly isOperational = true;

  constructor(code: ErrorCode, message: string, details?: ErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusForCode(code);
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

// --- Convenience constructors -------------------------------------------------

export const badRequest = (message = 'Invalid request', details?: ErrorDetails) =>
  new AppError('VALIDATION_ERROR', message, details);

export const validationError = (message = 'Validation failed', fields?: Record<string, string>) =>
  new AppError('VALIDATION_ERROR', message, fields ? { fields } : undefined);

export const unauthorized = (message = 'Authentication required') =>
  new AppError('UNAUTHORIZED', message);

export const forbidden = (message = 'Insufficient permissions for this role') =>
  new AppError('FORBIDDEN', message);

export const notFound = (entity = 'Resource', id?: string) =>
  new AppError('NOT_FOUND', id ? `${entity} '${id}' not found` : `${entity} not found`);

export const conflict = (message: string, meta?: Record<string, unknown>) =>
  new AppError('CONFLICT', message, meta ? { meta } : undefined);

export const invalidTransition = (from: string, to: string) =>
  new AppError(
    'INVALID_STATE_TRANSITION',
    `Inspection cannot move from ${from} to ${to}`,
    { meta: { from, to } },
  );

export const aiServiceError = (message = 'AI service unavailable', meta?: Record<string, unknown>) =>
  new AppError('AI_SERVICE_ERROR', message, meta ? { meta } : undefined);

export const iotDeviceError = (message = 'IoT device error', meta?: Record<string, unknown>) =>
  new AppError('IOT_DEVICE_ERROR', message, meta ? { meta } : undefined);

export const integrityError = (message = 'Certificate integrity check failed', meta?: Record<string, unknown>) =>
  new AppError('CERTIFICATE_INTEGRITY_ERROR', message, meta ? { meta } : undefined);

export const internal = (message = 'Internal server error', meta?: Record<string, unknown>) =>
  new AppError('INTERNAL_SERVER_ERROR', message, meta ? { meta } : undefined);

/** Type guard used by the error middleware. */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
