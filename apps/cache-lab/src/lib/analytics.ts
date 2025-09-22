import { CacheConfig, Trace } from './types';
import { simulateCache } from './cacheSimulator';

export function buildBlockSizeSweep(config: CacheConfig, trace: Trace) {
  const sizes = [8, 16, 32, 64, 128, 256].filter((size) => size <= config.cacheSizeBytes);
  return sizes.map((blockSize) => {
    const nextConfig = { ...config, blockSizeBytes: blockSize } as CacheConfig;
    const sim = simulateCache(trace.accesses, nextConfig);
    return { blockSize, hitRatio: sim.metrics.hitRatio };
  });
}

export function computeSetOccupancy(config: CacheConfig, trace: Trace) {
  const sim = simulateCache(trace.accesses, config, { trackSets: true });
  return (sim.perSet ?? []).map((setHistory, setIndex) => ({
    setIndex,
    occupancy: setHistory.length,
  }));
}
