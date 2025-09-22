import { describe, expect, it } from 'vitest';
import { simulateHierarchy } from '../../src/lib/hierarchy';
import { normalizeConfig } from '../../src/lib/config';

const baseConfig = normalizeConfig({
  cacheSizeBytes: 32,
  blockSizeBytes: 4,
  associativity: 1,
  addressBits: 8,
});

const trace = Array.from({ length: 64 }, (_, i) => ({ address: i % 16, type: 'R' as const }));

describe('hierarchy explorer', () => {
  it('L2 identical to L1 yields same hit rate', () => {
    const identical = simulateHierarchy(
      [
        { name: 'L1', cache: baseConfig, latency: 2 },
        { name: 'L2', cache: baseConfig, latency: 6 },
        { name: 'Mem', cache: null, latency: 100 },
      ],
      trace
    );
    expect(identical.levelHitRates.L2).toBeCloseTo(0, 5);
  });

  it('Larger L2 provides additional hits on locality friendly trace', () => {
    const smallL1 = normalizeConfig({
      cacheSizeBytes: 16,
      blockSizeBytes: 4,
      associativity: 1,
      addressBits: 8,
    });
    const largeL2 = normalizeConfig({
      cacheSizeBytes: 64,
      blockSizeBytes: 4,
      associativity: 4,
      addressBits: 8,
    }, smallL1);
    const pattern = [0, 16, 4, 20, 8, 24, 12, 28];
    const workingSetTrace = Array.from({ length: 80 }, (_, i) => ({ address: pattern[i % pattern.length], type: 'R' as const }));
    const baseline = simulateHierarchy(
      [
        { name: 'L1', cache: smallL1, latency: 2 },
        { name: 'Mem', cache: null, latency: 100 },
      ],
      workingSetTrace
    );
    const withL2 = simulateHierarchy(
      [
        { name: 'L1', cache: smallL1, latency: 2 },
        { name: 'L2', cache: largeL2, latency: 4 },
        { name: 'Mem', cache: null, latency: 100 },
      ],
      workingSetTrace
    );
    expect(withL2.levelHitRates.L2).toBeGreaterThan(0.5);
    expect(withL2.amat).toBeLessThanOrEqual(baseline.amat + 5);
  });
});
