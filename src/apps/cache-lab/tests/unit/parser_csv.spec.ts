import { describe, expect, it } from 'vitest';
import { parseTraceCSV } from '../../src/lib/traceParser';

describe('trace parser', () => {
  it('parses decimal and hex addresses and ignores comments', () => {
    const csv = '# comment\n0x10,R\n32,W,5';
    const trace = parseTraceCSV('test.csv', csv);
    expect(trace.accesses).toHaveLength(2);
    expect(trace.accesses[0]).toMatchObject({ address: 16, type: 'R' });
    expect(trace.accesses[1]).toMatchObject({ address: 32, type: 'W', tick: 5 });
  });

  it('throws on invalid address', () => {
    expect(() => parseTraceCSV('bad.csv', 'foo')).toThrowError();
  });
});
