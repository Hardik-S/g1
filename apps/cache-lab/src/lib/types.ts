export type ReplacementPolicy = 'LRU' | 'FIFO' | 'Random';

export interface CacheConfig {
  cacheSizeBytes: number;
  blockSizeBytes: number;
  associativity: number;
  numSets: number;
  addressBits: number;
  replacementPolicy: ReplacementPolicy;
}

export interface Access {
  address: number;
  type: 'R' | 'W';
  tick?: number;
}

export interface Trace {
  name: string;
  seed?: number;
  accesses: Access[];
}

export interface ResultMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  compulsory: number;
  conflict: number;
  capacity: number;
  amat: number;
  cpi?: number;
}

export interface AddressBreakdown {
  offsetBits: number;
  indexBits: number;
  tagBits: number;
}

export interface MappingResult {
  address: number;
  setIndex: number;
  tag: number;
  offset: number;
  hit: boolean;
}

export interface CacheSimulationOptions {
  classifyMisses?: boolean;
  trackSets?: boolean;
}

export interface CacheSimulationResult {
  metrics: ResultMetrics;
  perAccess: {
    hit: boolean;
    missType?: 'compulsory' | 'conflict' | 'capacity';
    setIndex: number;
    tag: number;
  }[];
  perSet?: number[][][];
}

export interface HierarchyLevelConfig {
  name: 'L1' | 'L2' | 'L3' | 'Mem';
  cache: CacheConfig | null;
  latency: number; // cycles
}

export interface HierarchyMetrics {
  levelHitRates: Record<string, number>;
  amat: number;
}
