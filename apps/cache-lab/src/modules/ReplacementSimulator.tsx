import { useEffect, useMemo } from 'react';
import styles from './ModuleCard.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { simulateCache } from '../lib/cacheSimulator';
import { CacheConfig, ReplacementPolicy } from '../lib/types';

const policies: ReplacementPolicy[] = ['LRU', 'FIFO', 'Random'];

function runPolicy(config: CacheConfig, policy: ReplacementPolicy, accesses = config ? [] : []) {
  const nextConfig = { ...config, replacementPolicy: policy } as CacheConfig;
  return simulateCache(accesses, nextConfig, { trackSets: true });
}

const ReplacementSimulator: React.FC = () => {
  const { config, trace, setMetrics } = useCacheLabStore((state) => ({
    config: state.config,
    trace: state.trace,
    setMetrics: state.setMetrics,
  }));

  const results = useMemo(() => {
    return policies.map((policy) => {
      const sim = runPolicy(config, policy, trace.accesses);
      return { policy, metrics: sim.metrics };
    });
  }, [config, trace]);

  useEffect(() => {
    const lruMetrics = results.find((result) => result.policy === 'LRU')?.metrics;
    if (lruMetrics) {
      setMetrics(lruMetrics);
    }
  }, [results, setMetrics]);

  return (
    <section className={styles.card} aria-label="Replacement Simulator">
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>Replacement Simulator</div>
          <h3 className={styles.title}>Compare LRU, FIFO, Random deterministically</h3>
        </div>
        <p className={styles.description}>Trace length: {trace.accesses.length}</p>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Policy</th>
            <th scope="col">Hits</th>
            <th scope="col">Misses</th>
            <th scope="col">Hit Ratio</th>
          </tr>
        </thead>
        <tbody>
          {results.map(({ policy, metrics }) => (
            <tr key={policy}>
              <td>{policy}</td>
              <td>{metrics.hits}</td>
              <td>{metrics.misses}</td>
              <td>{(metrics.hitRatio * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Random policy uses a seeded PRNG (SEED=42) for deterministic runs, making comparisons reproducible.
      </p>
    </section>
  );
};

export default ReplacementSimulator;
