/**
 * Express application factory.
 *
 * Middleware order matters:
 *   security headers → CORS → body parsing (size-limited) → request logging
 *   → routes → 404 → error handler (always last).
 *
 * Exported as a factory so tests can build an isolated app per suite.
 */
import express, { type Express } from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { setupSwagger } from './docs/swagger';
import healthRouter from './modules/health/health.routes';
import apiRouter from './routes';

/** Parse a comma-separated CORS origin list into an array. */
function parseOrigins(value: string): string[] | boolean {
  const trimmed = value.trim();
  if (trimmed === '*') return true;
  return trimmed.split(',').map((o) => o.trim()).filter(Boolean);
}

export function createApp(): Express {
  const app = express();

  // Trust the first proxy hop (correct client IPs behind nginx / Render).
  app.set('trust proxy', 1);

  // --- Security ------------------------------------------------------------
  app.use(helmet());
  app.use(cors({
    origin: parseOrigins(env.CORS_ORIGIN),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // --- Body parsing (request size limits — spec §39) -----------------------
  const bodyLimit = `${env.MAX_UPLOAD_MB}mb`;
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // --- Compression (performance) ------------------------------------------
  app.use(compression());

  // --- Logging -------------------------------------------------------------
  app.use(requestLogger);

  // --- Routes --------------------------------------------------------------
  // Health is mounted at the root so `/health` and `/api/health/dependencies`
  // work exactly as specified.
  app.use(healthRouter);
  app.use('/api', apiRouter);

  // Serve uploaded inspection images (local storage driver).
  app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

  // --- API documentation ---------------------------------------------------
  setupSwagger(app);

  // --- Terminal handlers ---------------------------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
