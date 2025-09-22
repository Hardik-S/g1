import { describe, expect, it } from 'vitest';
import { classifyMisses } from '../../src/lib/missClassifier';
import { normalizeConfig } from '../../src/lib/config';

const config = normalizeConfig({
  cacheSizeBytes: 16,
  blockSizeBytes: 4,
  associativity: 2,
  addressBits: 8,
});

describe('three-run classifier', () => {
  it('marks first touch as compulsory', () => {
    const trace = [0, 4, 0].map((address) => ({ address, type: 'R' as const }));
    const classes = classifyMisses(trace, config);
    expect(classes[0]).toBe('compulsory');
  });

  it('labels conflict misses when fully associative cache would hit', () => {
    const conflictTrace = [0, 16, 0, 16].map((address) => ({ address, type: 'R' as const }));
    const conflictConfig = normalizeConfig({
      cacheSizeBytes: 16,
      blockSizeBytes: 4,
      associativity: 1,
      addressBits: 8,
    });
    const classes = classifyMisses(conflictTrace, conflictConfig);
    expect(classes.includes('conflict')).toBe(true);
  });

  it('labels capacity misses when working set exceeds total lines', () => {
    const capacityTrace = [0, 4, 8, 12, 16, 0].map((address) => ({ address, type: 'R' as const }));
    const capacityConfig = normalizeConfig({
      cacheSizeBytes: 16,
      blockSizeBytes: 4,
      associativity: 1,
      addressBits: 8,
    });
    const classes = classifyMisses(capacityTrace, capacityConfig);
    expect(classes.includes('capacity')).toBe(true);
  });
});
