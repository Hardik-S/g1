import { Access, CacheConfig } from './types';
import { simulateInternal } from './cacheSimulator';

export type MissType = 'compulsory' | 'conflict' | 'capacity';

export function classifyMisses(trace: Access[], config: CacheConfig): (MissType | undefined)[] {
  if (trace.length === 0) return [];

  const setAssoc = simulateInternal(trace, config);
  const totalLines = Math.max(1, config.cacheSizeBytes / config.blockSizeBytes);
  const fullyAssocConfig: CacheConfig = {
    ...config,
    associativity: totalLines,
    numSets: 1,
  };
  const fullyAssoc = simulateInternal(trace, fullyAssocConfig, { overridePolicy: 'LRU' });

  const seenBlocks = new Set<number>();
  return trace.map((access, index) => {
    if (setAssoc.perAccess[index].hit) {
      return undefined;
    }
    const blockAddress = Math.floor(access.address / config.blockSizeBytes);
    if (!seenBlocks.has(blockAddress)) {
      seenBlocks.add(blockAddress);
      return 'compulsory';
    }

    if (fullyAssoc.perAccess[index].hit) {
      return 'conflict';
    }

    return 'capacity';
  });
}
