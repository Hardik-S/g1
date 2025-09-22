import { useMemo, useState } from 'react';
import styles from './ModuleCard.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { splitAddress, addressBreakdown } from '../lib/config';
import { simulateCache } from '../lib/cacheSimulator';

interface MappingRow {
  address: number;
  setIndex: number;
  tag: number;
  offset: number;
  hit: boolean;
}

function parseAddresses(input: string): number[] {
  return input
    .split(/\s|,|\n/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => (token.startsWith('0x') ? parseInt(token, 16) : Number(token)))
    .filter((value) => !Number.isNaN(value) && value >= 0);
}

const MappingExplorer: React.FC = () => {
  const { config, trace, setMetrics } = useCacheLabStore((state) => ({
    config: state.config,
    trace: state.trace,
    setMetrics: state.setMetrics,
  }));
  const [addressInput, setAddressInput] = useState('0x00 0x08 0x10 0x00');
  const [rows, setRows] = useState<MappingRow[]>([]);

  const breakdown = useMemo(() => addressBreakdown(config), [config]);

  const handleMap = () => {
    const addresses = parseAddresses(addressInput);
    const mappingRows: MappingRow[] = addresses.map((address) => {
      const { setIndex, tag, offset } = splitAddress(address, config);
      return { address, setIndex, tag, offset, hit: false };
    });

    const sim = simulateCache(
      addresses.map((address) => ({ address, type: 'R' })),
      config
    );
    sim.perAccess.forEach((entry, index) => {
      if (mappingRows[index]) {
        mappingRows[index].hit = entry.hit;
      }
    });
    setMetrics(sim.metrics);
    setRows(mappingRows);
  };

  const activeTraceSummary = `${trace.name} (${trace.accesses.length} accesses)`;

  return (
    <section className={styles.card} aria-label="Mapping Explorer">
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>Mapping Explorer</div>
          <h3 className={styles.title}>Address → Set / Tag breakdown</h3>
        </div>
        <p className={styles.description}>Active Trace: {activeTraceSummary}</p>
      </div>
      <div className={styles.inputRow}>
        <label htmlFor="mapping-input" className="sr-only">
          Addresses input
        </label>
        <input
          id="mapping-input"
          aria-label="Addresses to map"
          value={addressInput}
          onChange={(event) => setAddressInput(event.target.value)}
          placeholder="Enter decimal or hex addresses"
        />
        <button type="button" className={styles.buttonPrimary} onClick={handleMap}>
          Map Addresses
        </button>
      </div>
      <table className={styles.table} aria-label="Address breakdown">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Address</th>
            <th scope="col">Tag</th>
            <th scope="col">Set</th>
            <th scope="col">Offset</th>
            <th scope="col">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.address}-${index}`}>
              <td>{index + 1}</td>
              <td>{`0x${row.address.toString(16).padStart(4, '0')}`}</td>
              <td>{row.tag}</td>
              <td>{row.setIndex}</td>
              <td>{row.offset}</td>
              <td>{row.hit ? 'Hit ✅' : 'Miss ⛔'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6}>Enter addresses and press Map to see the breakdown.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div aria-live="polite">
        Tag bits: {breakdown.tagBits} · Index bits: {breakdown.indexBits} · Offset bits: {breakdown.offsetBits}
      </div>
    </section>
  );
};

export default MappingExplorer;
