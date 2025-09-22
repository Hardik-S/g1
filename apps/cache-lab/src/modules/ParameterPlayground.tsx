import { useEffect, useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import styles from './ModuleCard.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { simulateCache } from '../lib/cacheSimulator';
import { buildBlockSizeSweep } from '../lib/analytics';

interface SweepPoint {
  blockSize: number;
  hitRatio: number;
}

function downloadCSV(points: SweepPoint[]) {
  const header = 'blockSizeBytes,hitRatio\n';
  const rows = points.map((point) => `${point.blockSize},${point.hitRatio.toFixed(4)}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'parameter_sweep.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

const ParameterPlayground: React.FC = () => {
  const { config, trace, setMetrics } = useCacheLabStore((state) => ({
    config: state.config,
    trace: state.trace,
    setMetrics: state.setMetrics,
  }));

  const sweep = useMemo(() => buildBlockSizeSweep(config, trace), [config, trace]);

  useEffect(() => {
    const lastPoint = sweep.at(-1);
    if (lastPoint) {
      const sim = simulateCache(trace.accesses, { ...config, blockSizeBytes: lastPoint.blockSize });
      setMetrics(sim.metrics);
    }
  }, [sweep, config, trace, setMetrics]);

  return (
    <section className={styles.card} aria-label="Parameter Playground">
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>Parameter Playground</div>
          <h3 className={styles.title}>Sweep block sizes and observe hit ratio</h3>
        </div>
        <button type="button" className={styles.buttonPrimary} onClick={() => downloadCSV(sweep)}>
          Export CSV
        </button>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={sweep} role="img" aria-label="Miss ratio vs block size">
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.3)" />
          <XAxis dataKey="blockSize" stroke="#94a3b8" tickFormatter={(value) => `${value}B`} />
          <YAxis domain={[0, 1]} stroke="#94a3b8" tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
          <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} labelFormatter={(value) => `${value} bytes`} />
          <Line type="monotone" dataKey="hitRatio" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className={styles.description}>
        Monotonicity: For sequential traces, larger blocks up to the working set typically improve hit ratio. Use the CSV export to
        compare traces offline.
      </p>
    </section>
  );
};

export default ParameterPlayground;
