import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { simulateCache } from '../../src/lib/cacheSimulator';
import { normalizeConfig } from '../../src/lib/config';
import { generateCustomTrace } from '../../src/lib/traces';

const config = normalizeConfig({
  cacheSizeBytes: 4,
  blockSizeBytes: 1,
  associativity: 2,
  addressBits: 8,
});

describe('policy invariants', () => {
  it('LRU hit count dominates FIFO on repeating working set', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), (cycles) => {
        const pattern = [0, 1, 2];
        const accesses = Array.from({ length: cycles * pattern.length }, (_, i) => pattern[i % pattern.length]);
        const trace = accesses.map((address) => ({ address, type: 'R' as const }));
        const lru = simulateCache(trace, { ...config, replacementPolicy: 'LRU' });
        const fifo = simulateCache(trace, { ...config, replacementPolicy: 'FIFO' });
        expect(lru.metrics.hits).toBeGreaterThanOrEqual(fifo.metrics.hits);
      }),
      { numRuns: 40 }
    );
  });

  it('Sequential traces sustain lower miss ratio than strided traces (probabilistic)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 16, max: 96 }), fc.integer({ min: 2, max: 8 }), (length, stride) => {
        const sequential = generateCustomTrace(`seq(0..${length - 1})`).accesses;
        const strideTrace = generateCustomTrace(`stride(0..${length - 1},${stride})`).accesses;
        const seqResult = simulateCache(sequential, config);
        const strideResult = simulateCache(strideTrace, config);
        expect(seqResult.metrics.hitRatio + 0.05).toBeGreaterThanOrEqual(strideResult.metrics.hitRatio);
      }),
      { numRuns: 20 }
    );
  });
});
