import { CacheConfig, AddressBreakdown } from './types';

export const DEFAULT_CONFIG: CacheConfig = {
  cacheSizeBytes: 1024,
  blockSizeBytes: 16,
  associativity: 2,
  numSets: 32,
  addressBits: 16,
  replacementPolicy: 'LRU'
};

export function deriveNumSets(config: CacheConfig): number {
  return Math.max(1, Math.floor(config.cacheSizeBytes / (config.blockSizeBytes * config.associativity)));
}

export function normalizeConfig(partial: Partial<CacheConfig>, base: CacheConfig = DEFAULT_CONFIG): CacheConfig {
  const merged: CacheConfig = {
    ...base,
    ...partial,
  };

  const numSets = deriveNumSets(merged);
  return {
    ...merged,
    numSets,
  };
}

export function addressBreakdown(config: CacheConfig): AddressBreakdown {
  const offsetBits = Math.log2(config.blockSizeBytes) || 0;
  const indexBits = Math.log2(Math.max(1, config.numSets)) || 0;
  const tagBits = Math.max(0, config.addressBits - offsetBits - indexBits);
  return { offsetBits, indexBits, tagBits };
}

export function splitAddress(address: number, config: CacheConfig) {
  const { offsetBits, indexBits } = addressBreakdown(config);
  const offsetMask = (1 << offsetBits) - 1;
  const indexMask = (1 << indexBits) - 1;
  const offset = address & offsetMask;
  const setIndex = (address >> offsetBits) & indexMask;
  const tag = address >> (offsetBits + indexBits);
  return { offset, setIndex, tag };
}

export function validateConfig(config: CacheConfig): void {
  if (!Number.isInteger(Math.log2(config.blockSizeBytes))) {
    throw new Error('blockSizeBytes must be a power of two');
  }
  if (!Number.isInteger(Math.log2(config.numSets))) {
    throw new Error('numSets must be a power of two');
  }
  if (config.associativity <= 0) {
    throw new Error('Associativity must be positive');
  }
}
