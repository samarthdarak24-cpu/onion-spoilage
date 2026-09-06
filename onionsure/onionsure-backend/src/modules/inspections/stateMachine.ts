/**
 * Inspection state machine (spec §9 / §10).
 *
 * The pipeline is strictly linear with explicit, documented transitions. Any
 * attempt to jump states throws INVALID_STATE_TRANSITION (409) — the frontend
 * can never force an illegal progression, and the backend is the single source
 * of truth for where an inspection sits.
 */
import type { InspectionStatus } from '@prisma/client';

export const TERMINAL_STATES: InspectionStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

export const TRANSITIONS: Record<InspectionStatus, InspectionStatus[]> = {
  CREATED: ['SAMPLE_ASSIGNED'],
  SAMPLE_ASSIGNED: ['SENSOR_STABILIZING'],
  SENSOR_STABILIZING: ['CAPTURED'],
  CAPTURED: ['AI_PROCESSING'],
  AI_PROCESSING: ['FUSION_PROCESSING', 'FAILED'],
  FUSION_PROCESSING: ['GRADED', 'FAILED'],
  GRADED: ['CERTIFICATE_GENERATED'],
  CERTIFICATE_GENERATED: ['COMPLETED'],
  COMPLETED: [],
  FAILED: ['CAPTURED', 'AI_PROCESSING', 'FUSION_PROCESSING', 'GRADED'],
  CANCELLED: [],
};

export function nextStates(from: InspectionStatus): InspectionStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: InspectionStatus, to: InspectionStatus): boolean {
  // CANCELLED is allowed from any active (non-terminal) state.
  if (to === 'CANCELLED' && !TERMINAL_STATES.includes(from)) return true;
  return nextStates(from).includes(to);
}
