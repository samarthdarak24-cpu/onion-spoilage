/**
 * Audit logging (spec §28).
 *
 * Every critical mutation writes an AuditLog row. Failures are logged but never
 * fail the originating request — auditing must not break the pipeline.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/client';
import { logger } from '../../utils/logger';

export const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'LOT_CREATED',
  'LOT_UPDATED',
  'INSPECTION_CREATED',
  'SAMPLE_ASSIGNED',
  'DEVICE_BOUND',
  'IMAGE_UPLOADED',
  'AI_ANALYSIS_STARTED',
  'AI_ANALYSIS_COMPLETED',
  'FUSION_COMPLETED',
  'GRADE_ASSIGNED',
  'CERTIFICATE_CREATED',
  'CERTIFICATE_REVOKED',
  'CONFIG_UPDATED',
  'INSPECTION_COMPLETED',
  'INSPECTION_CANCELLED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditInput {
  userId?: string | null;
  action: AuditAction | string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadataJson: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    // Never let auditing break the business operation.
    logger.error({ err: err instanceof Error ? err.message : String(err), action: input.action }, 'Audit write failed');
  }
}

/** Convenience: derive request context from an Express request. */
export function requestContext(req: {
  headers: Record<string, unknown>;
  ip?: string;
  user?: { id?: string };
}): { ipAddress?: string | null; userAgent?: string | null } {
  const ua = req.headers['user-agent'];
  return {
    ipAddress: req.ip ?? null,
    userAgent: typeof ua === 'string' ? ua.slice(0, 255) : null,
  };
}
