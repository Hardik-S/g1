import { describe, expect, it } from 'vitest';
import { computeCPI } from '../../src/lib/pipeline';

describe('pipeline CPI', () => {
  it('grows linearly with miss penalty and rate', () => {
    const base = computeCPI({ cpiBase: 1, missPenalty: 20, missRate: 0.1, memRefPerInstr: 0.5 });
    const doubledPenalty = computeCPI({ cpiBase: 1, missPenalty: 40, missRate: 0.1, memRefPerInstr: 0.5 });
    expect(doubledPenalty - base).toBeCloseTo(base - 1, 5);
  });

  it('reduces to base CPI when miss rate is zero', () => {
    expect(computeCPI({ cpiBase: 1.2, missPenalty: 100, missRate: 0, memRefPerInstr: 0.5 })).toBe(1.2);
  });
});
