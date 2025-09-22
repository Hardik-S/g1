import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import styles from './ModuleCard.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { builtInTraces, generateCustomTrace } from '../lib/traces';
import { simulateCache } from '../lib/cacheSimulator';

const LocalityVisualizer: React.FC = () => {
  const { config, trace, setTrace, setMetrics } = useCacheLabStore((state) => ({
    config: state.config,
    trace: state.trace,
    setTrace: state.setTrace,
    setMetrics: state.setMetrics,
  }));
  const [dsl, setDsl] = useState('stride(0..255,4)');
  const [error, setError] = useState<string | null>(null);

  const data = useMemo(() => {
    return builtInTraces.map((sample) => {
      const sim = simulateCache(sample.accesses, config);
      return {
        name: sample.name,
        missRatio: 1 - sim.metrics.hitRatio,
      };
    });
  }, [config]);

  useEffect(() => {
    const sim = simulateCache(trace.accesses, config);
    setMetrics(sim.metrics);
  }, [trace, config, setMetrics]);

  const handleCustom = () => {
    try {
      const generated = generateCustomTrace(dsl);
      setTrace(generated);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className={styles.card} aria-label="Locality Visualizer">
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>Locality Visualizer</div>
          <h3 className={styles.title}>Compare spatial & temporal patterns</h3>
        </div>
        <p className={styles.description}>Active trace: {trace.name}</p>
      </div>
      <div className={styles.inputRow}>
        <label htmlFor="trace-select" className="sr-only">
          Select sample trace
        </label>
        <select
          id="trace-select"
          onChange={(event) => {
            const next = builtInTraces.find((item) => item.name === event.target.value);
            if (next) setTrace(next);
          }}
          value={trace.name}
        >
          {builtInTraces.map((sample) => (
            <option key={sample.name} value={sample.name}>
              {sample.name}
            </option>
          ))}
        </select>
        <input
          value={dsl}
          onChange={(event) => setDsl(event.target.value)}
          aria-label="Custom DSL expression"
          placeholder="seq(0..255)"
        />
        <button type="button" className={styles.buttonPrimary} onClick={handleCustom}>
          Load Custom
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} role="img" aria-label="Miss ratio by built-in trace">
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.3)" />
          <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} interval={0} angle={-10} height={60} />
          <YAxis domain={[0, 1]} stroke="#94a3b8" tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
          <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}% miss`} />
          <Bar dataKey="missRatio" fill="#facc15" radius={8} />
        </BarChart>
      </ResponsiveContainer>
      <p className={styles.description}>
        Sequential access exhibits excellent spatial locality. Strided patterns reveal conflict behaviour when associativity is
        low, while the seeded random generator approximates worst-case locality.
      </p>
    </section>
  );
};

export default LocalityVisualizer;
