import { SeededRNG } from './prng';
import { Access, CacheConfig, CacheSimulationOptions, CacheSimulationResult, ResultMetrics } from './types';
import { addressBreakdown, splitAddress, validateConfig } from './config';
import { classifyMisses } from './missClassifier';

interface CacheLine {
  tag: number;
  valid: boolean;
  lastUsed: number;
  inserted: number;
}

interface InternalOptions extends CacheSimulationOptions {
  overridePolicy?: CacheConfig['replacementPolicy'];
}

function createEmptyCache(config: CacheConfig): CacheLine[][] {
  const sets: CacheLine[][] = Array.from({ length: config.numSets }, () =>
    Array.from({ length: config.associativity }, () => ({
      tag: -1,
      valid: false,
      lastUsed: -1,
      inserted: -1,
    }))
  );
  return sets;
}

function chooseVictim(lines: CacheLine[], policy: CacheConfig['replacementPolicy'], rng: SeededRNG): number {
  const invalidIndex = lines.findIndex((line) => !line.valid);
  if (invalidIndex >= 0) return invalidIndex;

  switch (policy) {
    case 'LRU': {
      let lruIndex = 0;
      let minValue = lines[0].lastUsed;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].lastUsed < minValue) {
          minValue = lines[i].lastUsed;
          lruIndex = i;
        }
      }
      return lruIndex;
    }
    case 'FIFO': {
      let fifoIndex = 0;
      let minValue = lines[0].inserted;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].inserted < minValue) {
          minValue = lines[i].inserted;
          fifoIndex = i;
        }
      }
      return fifoIndex;
    }
    case 'Random':
    default:
      return rng.nextInt(lines.length);
  }
}

interface InternalResult {
  hits: number;
  misses: number;
  perAccess: { hit: boolean; setIndex: number; tag: number }[];
  setsHistory?: number[][][];
}

function simulateInternal(
  trace: Access[],
  config: CacheConfig,
  options: InternalOptions = {}
): InternalResult {
  validateConfig(config);
  const rng = new SeededRNG(42);
  const sets = createEmptyCache(config);
  const perAccess: { hit: boolean; setIndex: number; tag: number }[] = [];
  const setsHistory: number[][][] | undefined = options.trackSets
    ? Array.from({ length: config.numSets }, () => [])
    : undefined;

  let hits = 0;
  let misses = 0;

  trace.forEach((access, index) => {
    const { setIndex, tag } = splitAddress(access.address, config);
    const lines = sets[setIndex];
    let hit = false;
    let hitLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].valid && lines[i].tag === tag) {
        hit = true;
        hitLineIndex = i;
        break;
      }
    }

    if (hit && hitLineIndex >= 0) {
      hits += 1;
      const line = lines[hitLineIndex];
      line.lastUsed = index;
      // FIFO does not adjust insertion order on hit
      perAccess.push({ hit: true, setIndex, tag });
    } else {
      misses += 1;
      const policy = options.overridePolicy ?? config.replacementPolicy;
      const victimIndex = chooseVictim(lines, policy, rng);
      const line = lines[victimIndex];
      line.valid = true;
      line.tag = tag;
      line.lastUsed = index;
      line.inserted = index;
      perAccess.push({ hit: false, setIndex, tag });
    }

    if (setsHistory) {
      setsHistory[setIndex].push(lines.map((line) => (line.valid ? line.tag : -1)));
    }
  });

  const total = Math.max(1, hits + misses);
  return { hits, misses, perAccess, setsHistory };
}

export function simulateCache(
  trace: Access[],
  config: CacheConfig,
  options: CacheSimulationOptions = {}
): CacheSimulationResult {
  const internal = simulateInternal(trace, config, options);
  const total = Math.max(1, internal.hits + internal.misses);
  const missRatio = internal.misses / total;
  const hitLatency = 1;
  const missPenalty = Math.max(5, config.blockSizeBytes / 2);
  const amat = hitLatency + missRatio * missPenalty;

  const metrics: ResultMetrics = {
    hits: internal.hits,
    misses: internal.misses,
    hitRatio: internal.hits / total,
    compulsory: 0,
    conflict: 0,
    capacity: 0,
    amat,
  };

  const perAccess = internal.perAccess.map((item) => ({ ...item, missType: undefined }));

  if (options.classifyMisses) {
    const classification = classifyMisses(trace, config);
    classification.forEach((value, index) => {
      if (value && !perAccess[index].hit) {
        perAccess[index].missType = value;
      }
    });

    const comp = classification.filter((c) => c === 'compulsory').length;
    const conflict = classification.filter((c) => c === 'conflict').length;
    const capacity = classification.filter((c) => c === 'capacity').length;
    metrics.compulsory = comp;
    metrics.conflict = conflict;
    metrics.capacity = capacity;
  }

  return {
    metrics,
    perAccess,
    perSet: internal.setsHistory,
  };
}

export function runGoldenExample(): boolean {
  const config: CacheConfig = {
    cacheSizeBytes: 64,
    blockSizeBytes: 8,
    associativity: 1,
    numSets: 8,
    addressBits: 8,
    replacementPolicy: 'LRU',
  };
  const trace: Access[] = [0x00, 0x08, 0x10, 0x00].map((address) => ({ address, type: 'R' }));
  const breakdown = addressBreakdown(config);
  if (breakdown.indexBits !== 3 || breakdown.offsetBits !== 3 || breakdown.tagBits !== 2) {
    return false;
  }
  const result = simulateCache(trace, config);
  return result.metrics.hits === 1;
}

export { simulateInternal };
