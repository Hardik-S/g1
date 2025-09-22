import { useEffect, useMemo } from 'react';
import styles from './ModuleCard.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { simulateCache } from '../lib/cacheSimulator';

const MissClassifier: React.FC = () => {
  const { config, trace, setMetrics } = useCacheLabStore((state) => ({
    config: state.config,
    trace: state.trace,
    setMetrics: state.setMetrics,
  }));

  const sim = useMemo(() => simulateCache(trace.accesses, config, { classifyMisses: true }), [trace, config]);

  useEffect(() => {
    setMetrics(sim.metrics);
  }, [sim, setMetrics]);

  const rows = sim.perAccess
    .map((entry, index) => ({ ...entry, index }))
    .filter((entry) => !entry.hit)
    .slice(0, 12);

  return (
    <section className={styles.card} aria-label="Miss Classifier">
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>Miss Classifier</div>
          <h3 className={styles.title}>Compulsory · Conflict · Capacity</h3>
        </div>
        <p className={styles.description}>
          Miss breakdown: C{sim.metrics.compulsory} / X{sim.metrics.conflict} / P{sim.metrics.capacity}
        </p>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Access #</th>
            <th scope="col">Set</th>
            <th scope="col">Tag</th>
            <th scope="col">Miss Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.index}>
              <td>{row.index + 1}</td>
              <td>{row.setIndex}</td>
              <td>{row.tag}</td>
              <td>{row.missType}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4}>Trace is hitting the cache after warm-up—no misses to classify.</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className={styles.description}>
        Hover any miss row in the UI (or use keyboard focus) to reveal the reasoning: first-touch accesses are compulsory, hits in the
        fully-associative baseline become conflict misses, and the remainder are capacity misses.
      </p>
    </section>
  );
};

export default MissClassifier;
