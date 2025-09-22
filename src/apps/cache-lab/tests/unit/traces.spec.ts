import { describe, expect, it } from 'vitest';
import { builtInTraces, generateCustomTrace } from '../../src/lib/traces';

describe('trace generators', () => {
  it('parses sequential expressions', () => {
    const trace = generateCustomTrace('seq(4..7)');
    expect(trace.name).toBe('seq(4..7)');
    expect(trace.accesses.map((a) => a.address)).toEqual([4, 5, 6, 7]);
  });

  it('limits stride traces to the provided cap', () => {
    const trace = generateCustomTrace('stride(0..15,2)', 4);
    expect(trace.accesses.map((a) => a.address)).toEqual([0, 2, 4, 6]);
  });

  it('generates seeded random traces deterministically', () => {
    const trace = generateCustomTrace('random(8,7)');
    expect(trace.seed).toBe(7);
    expect(trace.accesses.slice(0, 4).map((a) => a.address)).toEqual([1, 7, 4, 7]);
  });

  it('throws on malformed expressions', () => {
    expect(() => generateCustomTrace('seq(1..a)')).toThrowError('Invalid seq DSL');
    expect(() => generateCustomTrace('stride(0..8,)')).toThrowError('Invalid stride DSL');
    expect(() => generateCustomTrace('random(8,)')).toThrowError('Invalid random DSL');
    expect(() => generateCustomTrace('foo()')).toThrowError('Unsupported DSL');
  });

  it('exposes built-in traces with names', () => {
    const names = builtInTraces.map((trace) => trace.name);
    expect(names).toContain('Sequential 0..255');
    expect(names).toContain('Stride 4');
    expect(names).toContain('Random 256');
  });
});
