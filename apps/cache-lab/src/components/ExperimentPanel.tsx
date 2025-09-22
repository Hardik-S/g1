import { useMemo, useState } from 'react';
import styles from './ExperimentPanel.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { generateCustomTrace } from '../lib/traces';
import { simulateCache } from '../lib/cacheSimulator';

const ExperimentPanel: React.FC = () => {
  const { config, trace } = useCacheLabStore((state) => ({ config: state.config, trace: state.trace }));
  const [stride, setStride] = useState(4);

  const sequential = useMemo(() => simulateCache(trace.accesses, config), [trace, config]);
  const stridedTrace = useMemo(() => generateCustomTrace(`stride(0..${trace.accesses.length - 1},${stride})`), [trace, stride]);
  const stridedMetrics = useMemo(() => simulateCache(stridedTrace.accesses, config), [stridedTrace, config]);

  return (
    <section className={styles.panel} aria-label="Experiment playground">
      <header>
        <h2>Experiment Hub</h2>
        <p>Probe locality assumptions by sweeping stride distances and comparing against your active trace.</p>
      </header>
      <div className={styles.controls}>
        <label>
          Stride
          <input type="number" min={1} value={stride} onChange={(event) => setStride(Number(event.target.value))} />
        </label>
      </div>
      <div className={styles.metricRow}>
        <div className={styles.metricCard}>
          <h3>Active Trace Hit Ratio</h3>
          <p>{(sequential.metrics.hitRatio * 100).toFixed(1)}%</p>
        </div>
        <div className={styles.metricCard}>
          <h3>Stride {stride} Hit Ratio</h3>
          <p>{(stridedMetrics.metrics.hitRatio * 100).toFixed(1)}%</p>
        </div>
        <div className={styles.metricCard}>
          <h3>Delta</h3>
          <p>{((sequential.metrics.hitRatio - stridedMetrics.metrics.hitRatio) * 100).toFixed(1)}%</p>
        </div>
      </div>
      <p>
        Sequential access is generally the upper bound. Increase stride or reduce associativity to witness conflict pressure. The
        Parameter Playground offers full sweeps if you need deeper analysis.
      </p>
    </section>
  );
};

export default ExperimentPanel;
