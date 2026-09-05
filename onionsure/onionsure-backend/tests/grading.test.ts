import { describe, it, expect } from 'vitest';
import { gradeFromScore, gradeInspection } from '../src/services/grading/gradingEngine';

const TH = { gradeA: 85, urs: 65 };

describe('grading engine', () => {
  it('maps a score to the correct grade', () => {
    expect(gradeFromScore(90, TH)).toBe('GRADE_A');
    expect(gradeFromScore(70, TH)).toBe('URS');
    expect(gradeFromScore(40, TH)).toBe('REJECTED');
  });

  it('normalizes composition to a 100% total', () => {
    const out = gradeInspection({
      finalScore: 90,
      earlySpoilage: false,
      riskLevel: 'LOW' as never,
      defectCounts: [
        { type: 'HEALTHY', count: 90 },
        { type: 'DAMAGED', count: 7 },
        { type: 'ROTTEN', count: 3 },
      ],
    });
    expect(out.gradeAPercentage + out.ursPercentage + out.rejectedPercentage).toBe(100);
    expect(out.grade).toBe('GRADE_A');
  });

  it('escalates risk to HIGH on early spoilage even when surface looks fine', () => {
    const out = gradeInspection({
      finalScore: 92,
      earlySpoilage: true,
      riskLevel: 'LOW' as never,
    });
    expect(out.riskLevel).toBe('HIGH');
  });

  it('honours configured thresholds', () => {
    const out = gradeInspection({
      finalScore: 80,
      earlySpoilage: false,
      riskLevel: 'LOW' as never,
      thresholds: { gradeA: 90, urs: 70 },
    });
    expect(out.grade).toBe('URS');
  });
});
