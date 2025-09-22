import { useEffect, useMemo, useState } from 'react';
import styles from './ModuleCard.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { simulateHierarchy } from '../lib/hierarchy';
import { normalizeConfig } from '../lib/config';

const HierarchyExplorer: React.FC = () => {
  const { config, trace, setMetrics } = useCacheLabStore((state) => ({
    config: state.config,
    trace: state.trace,
    setMetrics: state.setMetrics,
  }));

  const [latencies, setLatencies] = useState({ L1: 2, L2: 8, L3: 20, Mem: 120 });
  const [l2Size, setL2Size] = useState(config.cacheSizeBytes * 4);
  const [l3Size, setL3Size] = useState(config.cacheSizeBytes * 16);

  const l2Config = useMemo(
    () => normalizeConfig({
      cacheSizeBytes: l2Size,
      blockSizeBytes: config.blockSizeBytes,
      associativity: Math.max(1, config.associativity * 2),
      replacementPolicy: 'LRU',
    }, config),
    [config, l2Size]
  );
  const l3Config = useMemo(
    () => normalizeConfig({
      cacheSizeBytes: l3Size,
      blockSizeBytes: config.blockSizeBytes,
      associativity: Math.max(1, config.associativity * 4),
      replacementPolicy: 'LRU',
    }, config),
    [config, l3Size]
  );

  const hierarchy = useMemo(
    () =>
      simulateHierarchy(
        [
          { name: 'L1', cache: config, latency: latencies.L1 },
          { name: 'L2', cache: l2Config, latency: latencies.L2 },
          { name: 'L3', cache: l3Config, latency: latencies.L3 },
          { name: 'Mem', cache: null, latency: latencies.Mem },
        ],
        trace.accesses
      ),
    [config, l2Config, l3Config, latencies, trace]
  );

  useEffect(() => {
    setMetrics({
      hits: 0,
      misses: 0,
      hitRatio: 0,
      compulsory: 0,
      conflict: 0,
      capacity: 0,
      amat: hierarchy.amat,
    });
  }, [hierarchy, setMetrics]);

  return (
    <section className={styles.card} aria-label="Hierarchy Explorer">
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>Hierarchy Explorer</div>
          <h3 className={styles.title}>Adjust L1→L3 to see AMAT impact</h3>
        </div>
        <p className={styles.description}>Current AMAT: {hierarchy.amat.toFixed(2)} cycles</p>
      </div>
      <div className={styles.inputRow}>
        {(['L1', 'L2', 'L3', 'Mem'] as const).map((level) => (
          <label key={level}>
            {level} Latency
            <input
              type="number"
              min={1}
              value={latencies[level]}
              onChange={(event) =>
                setLatencies((prev) => ({ ...prev, [level]: Number(event.target.value) }))
              }
            />
          </label>
        ))}
      </div>
      <div className={styles.inputRow}>
        <label>
          L2 Size (B)
          <input
            type="number"
            min={config.cacheSizeBytes}
            value={l2Size}
            onChange={(event) => setL2Size(Number(event.target.value))}
          />
        </label>
        <label>
          L3 Size (B)
          <input
            type="number"
            min={l2Size}
            value={l3Size}
            onChange={(event) => setL3Size(Number(event.target.value))}
          />
        </label>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Level</th>
            <th scope="col">Hit Rate</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(hierarchy.levelHitRates).map(([level, hitRate]) => (
            <tr key={level}>
              <td>{level}</td>
              <td>{(hitRate * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.description}>
        If L1 and L2 share the same size and associativity, L2 contributes no additional hits—AMAT will be dominated by L1 and
        main memory latency.
      </p>
    </section>
  );
};

export default HierarchyExplorer;
