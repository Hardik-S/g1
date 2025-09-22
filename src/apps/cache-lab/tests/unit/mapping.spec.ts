import { describe, expect, it } from 'vitest';
import { simulateCache } from '../../src/lib/cacheSimulator';
import { normalizeConfig } from '../../src/lib/config';

const config = normalizeConfig({
  cacheSizeBytes: 64,
  blockSizeBytes: 8,
  associativity: 1,
  addressBits: 8,
});

describe('mapping explorer golden trace', () => {
  it('hits on the fourth access', () => {
    const trace = [0x00, 0x08, 0x10, 0x00].map((address) => ({ address, type: 'R' as const }));
    const result = simulateCache(trace, config);
    expect(result.metrics.hits).toBe(1);
    expect(result.perAccess.map((entry) => entry.hit)).toEqual([false, false, false, true]);
  });
});
