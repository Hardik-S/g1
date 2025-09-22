import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import styles from './DashboardPanel.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { buildBlockSizeSweep, computeSetOccupancy } from '../lib/analytics';
import { simulateHierarchy } from '../lib/hierarchy';
import { normalizeConfig } from '../lib/config';

const DashboardPanel: React.FC = () => {
  const { config, trace, metrics } = useCacheLabStore((state) => ({
    config: state.config,
    trace: state.trace,
    metrics: state.metrics,
  }));

  const sweep = useMemo(() => buildBlockSizeSweep(config, trace), [config, trace]);
  const sweepData = useMemo(() => sweep.map((point) => ({ ...point, missRatio: 1 - point.hitRatio })), [sweep]);
  const occupancy = useMemo(() => computeSetOccupancy(config, trace), [config, trace]);

  const hierarchy = useMemo(() => {
    const l2 = normalizeConfig({
      cacheSizeBytes: config.cacheSizeBytes * 4,
      blockSizeBytes: config.blockSizeBytes,
      associativity: Math.max(1, config.associativity * 2),
      replacementPolicy: 'LRU',
    }, config);
    const l3 = normalizeConfig({
      cacheSizeBytes: config.cacheSizeBytes * 16,
      blockSizeBytes: config.blockSizeBytes,
      associativity: Math.max(1, config.associativity * 4),
      replacementPolicy: 'LRU',
    }, config);
    const result = simulateHierarchy(
      [
        { name: 'L1', cache: config, latency: 2 },
        { name: 'L2', cache: l2, latency: 8 },
        { name: 'L3', cache: l3, latency: 20 },
        { name: 'Mem', cache: null, latency: 120 },
      ],
      trace.accesses
    );
    return Object.entries(result.levelHitRates).map(([name, hitRate]) => ({ name, hitRate }));
  }, [config, trace]);

  const maxOccupancy = Math.max(1, ...occupancy.map((item) => item.occupancy));

  return (
    <section className={styles.panel} aria-label="Performance dashboard">
      <header>
        <h2>Performance Dashboard</h2>
        <p>Hits: {metrics?.hits ?? '—'} · Misses: {metrics?.misses ?? '—'} · Hit Ratio: {metrics ? `${(metrics.hitRatio * 100).toFixed(1)}%` : '—'} · AMAT: {metrics ? metrics.amat.toFixed(2) : '—'}</p>
      </header>
      <div className={styles.grid}>
        <div className={styles.card} aria-label="Miss ratio vs block size chart">
          <h3>Miss Ratio vs Block Size</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={sweepData}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.3)" />
              <XAxis dataKey="blockSize" stroke="#94a3b8" tickFormatter={(value) => `${value}B`} />
              <YAxis domain={[0, 1]} stroke="#94a3b8" tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
              <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}% miss`} />
              <Line type="monotone" dataKey="missRatio" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.card} aria-label="Per-set occupancy">
          <h3>Per-set Occupancy</h3>
          <div className={styles.heatmap}>
            {occupancy.slice(0, 16).map((item) => {
              const intensity = item.occupancy / maxOccupancy;
              const background = `rgba(56, 189, 248, ${Math.max(0.15, intensity)})`;
              return (
                <div key={item.setIndex} className={styles.heatCell} style={{ background }}>
                  <div>Set {item.setIndex}</div>
                  <div>{item.occupancy}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles.card} aria-label="Hierarchy hit rates">
          <h3>Hierarchy Hit Rates</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hierarchy}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.3)" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis domain={[0, 1]} stroke="#94a3b8" tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
              <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}% hit`} />
              <Bar dataKey="hitRate" fill="#a855f7" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default DashboardPanel;
