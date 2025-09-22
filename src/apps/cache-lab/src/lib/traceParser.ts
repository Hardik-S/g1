import { Access, Trace } from './types';

function parseNumber(value: string): number {
  const trimmed = value.trim();
  if (trimmed.startsWith('0x')) {
    return parseInt(trimmed, 16);
  }
  return Number(trimmed);
}

export function parseTraceCSV(name: string, csv: string): Trace {
  const accesses: Access[] = [];
  const lines = csv.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const [addressRaw, typeRaw = 'R', tickRaw] = trimmed.split(',').map((token) => token.trim());
    if (!addressRaw) {
      throw new Error(`Line ${idx + 1}: missing address`);
    }
    const address = parseNumber(addressRaw);
    if (!Number.isFinite(address) || address < 0) {
      throw new Error(`Line ${idx + 1}: invalid address`);
    }
    const type = typeRaw === 'W' ? 'W' : 'R';
    const tick = tickRaw ? Number(tickRaw) : undefined;
    accesses.push({ address, type, tick });
  });
  return { name, accesses };
}

export function formatTraceSummary(trace: Trace): string {
  return `${trace.name}: ${trace.accesses.length} accesses`;
}
