import { describe, expect, it } from 'vitest';
import { buildBlockSizeSweep, computeSetOccupancy } from '../../src/lib/analytics';
import { normalizeConfig } from '../../src/lib/config';

const config = normalizeConfig({
  cacheSizeBytes: 32,
  blockSizeBytes: 4,
  associativity: 1,
  addressBits: 8,
});

const trace = Array.from({ length: 32 }, (_, i) => ({ address: i, type: 'R' as const }));

describe('analytics helpers', () => {
  it('builds block-size sweep data', () => {
    const sweep = buildBlockSizeSweep(config, { name: 'seq', accesses: trace });
    expect(sweep.length).toBeGreaterThan(0);
    expect(sweep[0]).toHaveProperty('blockSize');
    expect(sweep[0]).toHaveProperty('hitRatio');
  });

  it('computes per-set occupancy history length', () => {
    const occupancy = computeSetOccupancy(config, { name: 'seq', accesses: trace });
    expect(occupancy.length).toBe(config.numSets);
    occupancy.forEach((entry) => {
      expect(entry).toHaveProperty('setIndex');
      expect(entry.occupancy).toBeGreaterThan(0);
    });
  });
});
