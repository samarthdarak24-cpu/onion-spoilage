/**
 * Prisma client singleton.
 *
 * Reuses one instance across hot reloads in development (avoids exhausting
 * connections) and disconnects cleanly on shutdown.
 */
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { onShutdown } from '../utils/shutdown';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  return new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

// Surface Prisma warnings/errors through our structured logger.
prisma.$on('warn' as never, ((e: { message: string }) => {
  logger.warn({ source: 'prisma' }, e.message);
}) as never);

prisma.$on('error' as never, ((e: { message: string }) => {
  logger.error({ source: 'prisma' }, e.message);
}) as never);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Registered BEFORE the HTTP listener closes, so in-flight queries can drain.
onShutdown(async () => {
  await prisma.$disconnect();
  logger.info('Database connection closed');
});

export default prisma;
