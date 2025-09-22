import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CacheConfig, Trace } from '../../src/lib/types';

const splitAddressMock = vi.hoisted(() =>
  vi.fn((address: number) => ({
    offset: address & 0x3,
    setIndex: 1,
    tag: 7,
  }))
);

const breakdownMock = vi.hoisted(() =>
  vi.fn(() => ({
    offsetBits: 2,
    indexBits: 3,
    tagBits: 11,
  }))
);

const simulateCacheMock = vi.hoisted(() =>
  vi.fn(() => ({
    metrics: {
      hits: 16,
      misses: 0,
      hitRatio: 1,
      compulsory: 0,
      conflict: 0,
      capacity: 0,
      amat: 1,
    },
    perAccess: Array.from({ length: 16 }, (_, index) => ({
      hit: true,
      setIndex: index % 4,
      tag: index,
      missType: undefined as const,
    })),
    perSet: undefined,
  }))
);

vi.mock('../../src/lib/config', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/config')>('../../src/lib/config');
  return {
    ...actual,
    splitAddress: splitAddressMock,
    addressBreakdown: breakdownMock,
  };
});

vi.mock('../../src/lib/cacheSimulator', () => ({
  simulateCache: simulateCacheMock,
}));

import { generateAssessment } from '../../src/lib/assessments';
import { simulateCache } from '../../src/lib/cacheSimulator';

const config: CacheConfig = {
  cacheSizeBytes: 64,
  blockSizeBytes: 4,
  associativity: 4,
  numSets: 4,
  addressBits: 12,
  replacementPolicy: 'LRU',
};

const trace: Trace = {
  name: 'all-hits',
  accesses: Array.from({ length: 16 }, (_, i) => ({ address: i * 4, type: 'R' as const })),
};

describe('assessment generator edge branches', () => {
  beforeEach(() => {
    splitAddressMock.mockClear();
    breakdownMock.mockClear();
    simulateCacheMock.mockClear();
  });

  it('skips miss classification when no misses exist', () => {
    const questions = generateAssessment(config, trace, 9);
    expect(questions).toHaveLength(9);
    expect(questions.every((q) => q.type !== 'miss-classify')).toBe(true);
    expect(simulateCacheMock).toHaveBeenCalledTimes(1);
    expect(simulateCache).toBe(simulateCacheMock);
    expect(splitAddressMock).toHaveBeenCalled();
    const breakdown = questions.filter((q) => q.type === 'address-breakdown');
    expect(breakdown.length).toBeGreaterThan(0);
    breakdown.forEach((question) => {
      expect(question.explanation).toContain('Offset');
    });
  });

  it('marks conflict misses with the correct answer index', () => {
    const perAccess = Array.from({ length: trace.accesses.length }, (_, index) => ({
      hit: true,
      setIndex: index % 4,
      tag: index,
      missType: undefined as const,
    }));
    perAccess[0] = { hit: false, setIndex: 0, tag: 0, missType: 'conflict' };
    perAccess[1] = { hit: false, setIndex: 1, tag: 1, missType: 'capacity' };
    simulateCacheMock.mockImplementationOnce(() => ({
      metrics: {
        hits: 14,
        misses: 2,
        hitRatio: 0.875,
        compulsory: 0,
        conflict: 1,
        capacity: 1,
        amat: 2,
      },
      perAccess,
      perSet: undefined,
    }));

    const questions = generateAssessment(config, trace, 3);
    const hitPredict = questions.find((q) => q.type === 'hit-predict');
    expect(hitPredict?.answerIndex).toBe(1);
    expect(hitPredict?.explanation).toContain('not found');

    const missQuestion = questions.find((q) => q.type === 'miss-classify');
    expect(missQuestion?.answerIndex).toBe(1);
    expect(missQuestion?.explanation).toContain('conflict');
  });

  it('falls back to capacity classification when other types miss', () => {
    const perAccess = Array.from({ length: trace.accesses.length }, (_, index) => ({
      hit: true,
      setIndex: index % 4,
      tag: index,
      missType: undefined as const,
    }));
    perAccess[0] = { hit: false, setIndex: 2, tag: 9, missType: 'capacity' };
    simulateCacheMock.mockImplementationOnce(() => ({
      metrics: {
        hits: 15,
        misses: 1,
        hitRatio: 0.9375,
        compulsory: 0,
        conflict: 0,
        capacity: 1,
        amat: 2,
      },
      perAccess,
      perSet: undefined,
    }));

    const questions = generateAssessment(config, trace, 3);
    const missQuestion = questions.find((q) => q.type === 'miss-classify');
    expect(missQuestion?.answerIndex).toBe(2);
    expect(missQuestion?.choices[2]).toBe('Capacity');
  });
});
