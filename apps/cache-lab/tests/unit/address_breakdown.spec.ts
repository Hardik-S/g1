import { describe, expect, it } from 'vitest';
import { addressBreakdown, splitAddress, normalizeConfig } from '../../src/lib/config';
import { validateConfig } from '../../src/lib/config';
import { runGoldenExample } from '../../src/lib/cacheSimulator';

const config = normalizeConfig({
  cacheSizeBytes: 64,
  blockSizeBytes: 8,
  associativity: 1,
  addressBits: 8,
});

describe('address breakdown', () => {
  it('computes offset/index/tag bits', () => {
    const breakdown = addressBreakdown(config);
    expect(breakdown).toEqual({ offsetBits: 3, indexBits: 3, tagBits: 2 });
  });

  it('maps known addresses to sets and tags', () => {
    expect(splitAddress(0x00, config)).toMatchObject({ setIndex: 0, tag: 0 });
    expect(splitAddress(0x08, config)).toMatchObject({ setIndex: 1, tag: 0 });
    expect(splitAddress(0x10, config)).toMatchObject({ setIndex: 2, tag: 0 });
    expect(splitAddress(0x38, config)).toMatchObject({ setIndex: 7, tag: 0 });
    expect(splitAddress(0x40, config)).toMatchObject({ setIndex: 0, tag: 1 });
  });

  it('passes golden example hit expectation', () => {
    expect(runGoldenExample()).toBe(true);
  });

  it('validates power-of-two parameters', () => {
    expect(() => validateConfig({ ...config, blockSizeBytes: 6 })).toThrowError();
    expect(() => validateConfig({ ...config, numSets: 3 })).toThrowError();
  });
});
