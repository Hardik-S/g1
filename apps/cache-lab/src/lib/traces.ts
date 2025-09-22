import { Access, Trace } from './types';
import { SeededRNG } from './prng';

function makeSequentialTrace(length: number): Access[] {
  return Array.from({ length }, (_, i) => ({ address: i, type: 'R' }));
}

function makeStrideTrace(length: number, stride: number): Access[] {
  return Array.from({ length }, (_, i) => ({ address: (i * stride) % length, type: 'R' }));
}

function makeRandomTrace(length: number, seed = 42): Access[] {
  const rng = new SeededRNG(seed);
  return Array.from({ length }, () => ({ address: Math.floor(rng.next() * length), type: 'R' }));
}

export const builtInTraces: Trace[] = [
  { name: 'Sequential 0..255', accesses: makeSequentialTrace(256), seed: 1 },
  { name: 'Stride 4', accesses: makeStrideTrace(256, 4), seed: 2 },
  { name: 'Random 256', accesses: makeRandomTrace(256), seed: 42 },
];

export function generateCustomTrace(expression: string, limit = 1024): Trace {
  const trimmed = expression.trim();
  if (trimmed.startsWith('seq(')) {
    const match = trimmed.match(/seq\((\d+)\.\.(\d+)\)/);
    if (!match) {
      throw new Error('Invalid seq DSL');
    }
    const start = Number(match[1]);
    const end = Number(match[2]);
    const accesses = Array.from({ length: end - start + 1 }, (_, i) => ({ address: start + i, type: 'R' }));
    return { name: `seq(${start}..${end})`, accesses };
  }
  if (trimmed.startsWith('stride(')) {
    const match = trimmed.match(/stride\((\d+)\.\.(\d+),(\d+)\)/);
    if (!match) {
      throw new Error('Invalid stride DSL');
    }
    const start = Number(match[1]);
    const end = Number(match[2]);
    const stride = Number(match[3]);
    const length = Math.min(limit, Math.max(1, Math.floor((end - start + stride) / stride)));
    const accesses = Array.from({ length }, (_, i) => ({ address: start + i * stride, type: 'R' }));
    return { name: `stride(${start}..${end},${stride})`, accesses };
  }
  if (trimmed.startsWith('random(')) {
    const match = trimmed.match(/random\((\d+),(\d+)\)/);
    if (!match) {
      throw new Error('Invalid random DSL');
    }
    const length = Number(match[1]);
    const seed = Number(match[2]) || 42;
    const accesses = makeRandomTrace(Math.min(limit, length), seed);
    return { name: `random(${length},${seed})`, accesses, seed };
  }
  throw new Error('Unsupported DSL');
}
