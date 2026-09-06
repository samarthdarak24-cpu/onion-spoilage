/**
 * Graceful shutdown registry.
 *
 * Modules (database, websocket, IoT simulators) register teardown handlers
 * here so the process can drain cleanly on SIGTERM/SIGINT instead of dropping
 * in-flight requests.
 */
import { logger } from './logger';

type ShutdownHandler = (signal: string) => Promise<void> | void;

const handlers: ShutdownHandler[] = [];

export function onShutdown(handler: ShutdownHandler): void {
  handlers.push(handler);
}

/** Run every handler in reverse registration order, tolerating failures. */
export async function runShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown initiated');
  for (const handler of [...handlers].reverse()) {
    try {
      await handler(signal);
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        'Shutdown handler failed',
      );
    }
  }
  logger.info('Shutdown complete');
}
