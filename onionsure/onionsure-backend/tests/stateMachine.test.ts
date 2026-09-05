import { describe, it, expect } from 'vitest';
import { canTransition, nextStates, TERMINAL_STATES } from '../src/modules/inspections/stateMachine';

describe('inspection state machine', () => {
  it('allows the documented linear progression', () => {
    expect(canTransition('CREATED', 'SAMPLE_ASSIGNED')).toBe(true);
    expect(canTransition('SAMPLE_ASSIGNED', 'SENSOR_STABILIZING')).toBe(true);
    expect(canTransition('SENSOR_STABILIZING', 'CAPTURED')).toBe(true);
    expect(canTransition('CAPTURED', 'AI_PROCESSING')).toBe(true);
    expect(canTransition('AI_PROCESSING', 'FUSION_PROCESSING')).toBe(true);
    expect(canTransition('FUSION_PROCESSING', 'GRADED')).toBe(true);
    expect(canTransition('GRADED', 'CERTIFICATE_GENERATED')).toBe(true);
    expect(canTransition('CERTIFICATE_GENERATED', 'COMPLETED')).toBe(true);
  });

  it('rejects illegal jumps', () => {
    expect(canTransition('CREATED', 'CAPTURED')).toBe(false);
    expect(canTransition('GRADED', 'CREATED')).toBe(false);
  });

  it('allows CANCELLED from any active state but not terminal ones', () => {
    expect(canTransition('CAPTURED', 'CANCELLED')).toBe(true);
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
    expect(canTransition('FAILED', 'CANCELLED')).toBe(false);
  });

  it('marks COMPLETED/FAILED/CANCELLED as terminal', () => {
    expect(TERMINAL_STATES).toEqual(expect.arrayContaining(['COMPLETED', 'FAILED', 'CANCELLED']));
    expect(nextStates('COMPLETED')).toEqual([]);
  });
});
