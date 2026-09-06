/**
 * HTTP request logging via pino-http.
 * Health probes are silenced so they don't drown out real traffic.
 */
import pinoHttp from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import { logger } from '../utils/logger';

const IGNORED_PATHS = ['/health', '/api/health/dependencies', '/favicon.ico', '/api/docs'];

export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req: IncomingMessage) => IGNORED_PATHS.some((p) => (req.url || '').startsWith(p)),
  },
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
    `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req: IncomingMessage, res: ServerResponse) =>
    `${req.method} ${req.url} → ${res.statusCode} failed`,
  serializers: {
    req: (req: IncomingMessage) => ({ method: req.method, url: req.url }),
    res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
  },
});
