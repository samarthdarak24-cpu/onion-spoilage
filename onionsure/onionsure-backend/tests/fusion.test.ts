import { describe, it, expect } from 'vitest';
import { fuse } from '../src/services/fusion/fusionEngine';

const weights = { vision: 0.5, gas: 0.3, environment: 0.2 };
const es = { enabled: true, visionHealthyAbove: 78 };

describe('fusion engine', () => {
  it('returns the input score when all modalities are perfect', () => {
    const out = fuse({
      vision: { quality: 100, confidence: 1 },
      gas: { quality: 100, confidence: 1, risk: 'LOW' },
      environment: { quality: 100, confidence: 1 },
      weights,
      earlySpoilage: es,
    });
    expect(out.finalScore).toBe(100);
    expect(out.riskLevel).toBe('LOW');
  });

  it('computes a confidence-weighted average', () => {
    const out = fuse({
      vision: { quality: 100, confidence: 1 },
      gas: { quality: 0, confidence: 1, risk: 'LOW' },
      environment: { quality: 100, confidence: 1 },
      weights,
      earlySpoilage: es,
    });
    // (0.5*1*100 + 0.3*1*0 + 0.2*1*100) / (0.5+0.3+0.2) = 70
    expect(out.finalScore).toBe(70);
  });

  it('flags early spoilage when vision is healthy but gas is risky', () => {
    const out = fuse({
      vision: { quality: 90, confidence: 1 },
      gas: { quality: 40, confidence: 1, risk: 'HIGH', earlySpoilageRisk: true },
      environment: { quality: 80, confidence: 1 },
      weights,
      earlySpoilage: es,
    });
    expect(out.earlySpoilage).toBe(true);
    expect(out.riskLevel).toBe('HIGH');
  });

  it('does not flag early spoilage when disabled', () => {
    const out = fuse({
      vision: { quality: 90, confidence: 1 },
      gas: { quality: 40, confidence: 1, risk: 'HIGH', earlySpoilageRisk: true },
      environment: { quality: 80, confidence: 1 },
      weights,
      earlySpoilage: { enabled: false, visionHealthyAbove: 78 },
    });
    expect(out.earlySpoilage).toBe(false);
    expect(out.riskLevel).toBe('HIGH');
  });
});
