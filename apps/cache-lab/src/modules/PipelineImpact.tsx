import { useEffect, useMemo, useState } from 'react';
import styles from './ModuleCard.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { computeCPI } from '../lib/pipeline';

const PipelineImpact: React.FC = () => {
  const { metrics, setMetrics } = useCacheLabStore((state) => ({ metrics: state.metrics, setMetrics: state.setMetrics }));
  const [inputs, setInputs] = useState({ cpiBase: 1.0, missPenalty: 20, memRefPerInstr: 0.3 });

  useEffect(() => {
    if (metrics?.amat) {
      setInputs((prev) => ({ ...prev, missPenalty: Math.max(1, Math.round(metrics.amat)) }));
    }
  }, [metrics]);

  const missRate = metrics ? 1 - metrics.hitRatio : 0.1;
  const cpi = computeCPI({
    cpiBase: inputs.cpiBase,
    missPenalty: inputs.missPenalty,
    missRate,
    memRefPerInstr: inputs.memRefPerInstr,
  });

  useEffect(() => {
    if (!metrics) {
      setMetrics({
        hits: 0,
        misses: 0,
        hitRatio: 0,
        compulsory: 0,
        conflict: 0,
        capacity: 0,
        amat: inputs.missPenalty,
        cpi,
      });
      return;
    }
    if (metrics.cpi !== cpi) {
      setMetrics({ ...metrics, cpi });
    }
  }, [metrics, cpi, setMetrics, inputs.missPenalty]);

  return (
    <section className={styles.card} aria-label="Pipeline Impact">
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>Pipeline Impact</div>
          <h3 className={styles.title}>Translate miss rate to CPI</h3>
        </div>
        <p className={styles.description}>Derived miss rate: {(missRate * 100).toFixed(2)}%</p>
      </div>
      <div className={styles.inputRow}>
        <label>
          Base CPI
          <input
            type="number"
            step={0.1}
            min={0}
            value={inputs.cpiBase}
            onChange={(event) => setInputs((prev) => ({ ...prev, cpiBase: Number(event.target.value) }))}
          />
        </label>
        <label>
          Miss Penalty (cycles)
          <input
            type="number"
            min={1}
            value={inputs.missPenalty}
            onChange={(event) => setInputs((prev) => ({ ...prev, missPenalty: Number(event.target.value) }))}
          />
        </label>
        <label>
          Mem Refs / Instr
          <input
            type="number"
            step={0.05}
            min={0}
            value={inputs.memRefPerInstr}
            onChange={(event) => setInputs((prev) => ({ ...prev, memRefPerInstr: Number(event.target.value) }))}
          />
        </label>
      </div>
      <p className={styles.description}>Estimated CPI: {cpi.toFixed(2)}. Linking latencies from the hierarchy automatically updates the miss penalty.</p>
    </section>
  );
};

export default PipelineImpact;
