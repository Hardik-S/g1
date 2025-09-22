import { Access, CacheConfig, HierarchyLevelConfig, HierarchyMetrics } from './types';
import { simulateInternal } from './cacheSimulator';

export function simulateHierarchy(levels: HierarchyLevelConfig[], trace: Access[]): HierarchyMetrics {
  const levelHitRates: Record<string, number> = {};
  let remaining = trace;
  let cumulativeMissProbability = 1;
  let amat = 0;

  levels.forEach((level) => {
    if (!level.cache) {
      amat += level.latency * cumulativeMissProbability;
      levelHitRates[level.name] = 1;
      return;
    }

    const result = simulateInternal(remaining, level.cache);
    const total = Math.max(1, result.hits + result.misses);
    const hitRate = result.hits / total;
    levelHitRates[level.name] = hitRate;
    amat += level.latency * cumulativeMissProbability;

    const missIndices = result.perAccess
      .map((entry, idx) => (!entry.hit ? idx : -1))
      .filter((idx) => idx >= 0);

    remaining = missIndices.map((index) => remaining[index]);
    cumulativeMissProbability *= 1 - hitRate;
  });

  if (cumulativeMissProbability > 0 && !levels.some((level) => level.name === 'Mem')) {
    amat += cumulativeMissProbability * 100;
  }

  return { levelHitRates, amat };
}
