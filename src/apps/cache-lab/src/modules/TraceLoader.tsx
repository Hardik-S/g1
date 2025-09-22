import { useState } from 'react';
import styles from './ModuleCard.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { parseTraceCSV } from '../lib/traceParser';

const TraceLoader: React.FC = () => {
  const { setTrace } = useCacheLabStore((state) => ({ setTrace: state.setTrace }));
  const [status, setStatus] = useState<string | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const trace = parseTraceCSV(file.name, text);
      setTrace(trace);
      setStatus(`Loaded ${trace.accesses.length} accesses from ${file.name}`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const handleSample = async (sample: string) => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${sample}`);
      const text = await response.text();
      const trace = parseTraceCSV(sample, text);
      setTrace(trace);
      setStatus(`Loaded sample ${sample}`);
    } catch (error) {
      setStatus(`Failed to load sample: ${(error as Error).message}`);
    }
  };

  return (
    <section className={styles.card} aria-label="Trace Loader">
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>Trace Loader</div>
          <h3 className={styles.title}>Import CSV traces and share across modules</h3>
        </div>
      </div>
      <div className={styles.inputRow}>
        <label className={styles.description}>
          Upload CSV
          <input type="file" accept=".csv" onChange={handleFile} />
        </label>
      </div>
      <p className={styles.description}>Samples:</p>
      <ul>
        <li>
          <button type="button" className={styles.buttonPrimary} onClick={() => handleSample('samples/seq_0_255.csv')}>
            Sequential 0..255
          </button>
        </li>
        <li>
          <button type="button" className={styles.buttonPrimary} onClick={() => handleSample('samples/stride4_0_255.csv')}>
            Stride 4
          </button>
        </li>
        <li>
          <button type="button" className={styles.buttonPrimary} onClick={() => handleSample('samples/mix_small.csv')}>
            Mixed hot/cold
          </button>
        </li>
      </ul>
      {status && <p aria-live="polite">{status}</p>}
      <p className={styles.description}>
        CSV rows follow <code>address,type?,tick?</code>. Hex prefixes (0x) are accepted. Comments beginning with # are ignored.
      </p>
    </section>
  );
};

export default TraceLoader;
