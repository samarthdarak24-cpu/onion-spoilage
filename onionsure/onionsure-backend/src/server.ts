/**
 * Process entrypoint: bind HTTP, install signal handling, drain gracefully.
 *
 * The HTTP listener is registered as a shutdown handler so it closes after the
 * database / websocket modules have drained (those register earlier in their
 * own modules).
 */
import type { Server } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { onShutdown, runShutdown } from './utils/shutdown';
import { realtimeHub } from './services/realtime/hub';

const app = createApp();
let server: Server | undefined;

function start(): void {
  server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        aiMode: env.AI_MODE,
        logLevel: env.LOG_LEVEL,
      },
      `OnionSure backend listening on http://localhost:${env.PORT}`,
    );
  });

  // Realtime WebSocket multiplexer on /ws (spec §29).
  realtimeHub.attach(server);

  // Timeouts: survive slow clients without leaking sockets. AI work is
  // asynchronous (spec §37) so a 60s request budget is generous.
  server.requestTimeout = 60_000;
  server.headersTimeout = 65_000;
  server.keepAliveTimeout = 30_000;

  // Close the listener LAST (registered first, runs last).
  // Guard on `listening` so a failed bind doesn't throw during shutdown.
  onShutdown(async () => {
    if (!server?.listening) return;
    await new Promise<void>((resolve, reject) => {
      server?.close((err) => (err ? reject(err) : resolve()));
    });
  });
}

function installProcessHandlers(): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as NodeJS.Signals[]) {
    process.once(signal, () => {
      void runShutdown(signal).then(() => process.exit(0));
    });
  }

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(
      { err: reason instanceof Error ? reason.message : String(reason) },
      'Unhandled promise rejection',
    );
  });

  process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err: err.message, stack: err.stack }, 'Uncaught exception — shutting down');
    void runShutdown('uncaughtException').then(() => process.exit(1));
  });
}

installProcessHandlers();
start();

export { app };
