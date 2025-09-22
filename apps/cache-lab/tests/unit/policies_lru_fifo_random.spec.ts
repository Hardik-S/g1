import { describe, expect, it } from 'vitest';
import { simulateCache } from '../../src/lib/cacheSimulator';
import { normalizeConfig } from '../../src/lib/config';

const fifoConfig = normalizeConfig({
  cacheSizeBytes: 12,
  blockSizeBytes: 1,
  associativity: 3,
  addressBits: 8,
});

const fifoTrace = [0, 4, 8, 0, 12, 0].map((address) => ({ address, type: 'R' as const }));

const baseConfig = normalizeConfig({
  cacheSizeBytes: 4,
  blockSizeBytes: 1,
  associativity: 2,
  addressBits: 8,
});

const trace = [0, 1, 2, 3, 0, 1, 2, 3].map((address) => ({ address, type: 'R' as const }));

describe('replacement policies', () => {
  it('LRU outperforms FIFO on crafted trace', () => {
    const lru = simulateCache(fifoTrace, { ...fifoConfig, replacementPolicy: 'LRU' });
    const fifo = simulateCache(fifoTrace, { ...fifoConfig, replacementPolicy: 'FIFO' });
    expect(lru.metrics.hits).toBeGreaterThan(fifo.metrics.hits);
  });

  it('Random policy is deterministic via SEED=42', () => {
    const first = simulateCache(trace, { ...baseConfig, replacementPolicy: 'Random' });
    const second = simulateCache(trace, { ...baseConfig, replacementPolicy: 'Random' });
    expect(first.metrics).toEqual(second.metrics);
    expect(first.perAccess).toEqual(second.perAccess);
  });
});
