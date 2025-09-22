import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { simulateCache } from '../../src/lib/cacheSimulator';
import { normalizeConfig } from '../../src/lib/config';

const config = normalizeConfig({
  cacheSizeBytes: 64,
  blockSizeBytes: 4,
  associativity: 2,
  addressBits: 8,
});

describe('trace invariants', () => {
  it('re-running the same trace yields identical metrics', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 1, maxLength: 64 }), (addresses) => {
        const accesses = addresses.map((address) => ({ address, type: 'R' as const }));
        const first = simulateCache(accesses, config);
        const second = simulateCache(accesses, config);
        expect(first.metrics).toEqual(second.metrics);
      }),
      { numRuns: 50 }
    );
  });
});
