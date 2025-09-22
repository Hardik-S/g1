import { useId } from 'react';
import styles from './CacheConfigForm.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { addressBreakdown } from '../lib/config';

const replacementPolicies = ['LRU', 'FIFO', 'Random'] as const;

const CacheConfigForm: React.FC = () => {
  const formId = useId();
  const { config, persistEnabled, togglePersistence, updateConfig } = useCacheLabStore((state) => ({
    config: state.config,
    persistEnabled: state.persistEnabled,
    togglePersistence: state.togglePersistence,
    updateConfig: state.updateConfig,
  }));
  const breakdown = addressBreakdown(config);

  return (
    <form className={styles.form} aria-describedby={`${formId}-helper`}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${formId}-cache`}>
          Cache Size (bytes)
        </label>
        <input
          id={`${formId}-cache`}
          className={styles.input}
          type="number"
          min={16}
          step={16}
          value={config.cacheSizeBytes}
          onChange={(event) => updateConfig({ cacheSizeBytes: Number(event.target.value) })}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${formId}-block`}>
          Block Size (bytes)
        </label>
        <input
          id={`${formId}-block`}
          className={styles.input}
          type="number"
          min={4}
          step={2}
          value={config.blockSizeBytes}
          onChange={(event) => updateConfig({ blockSizeBytes: Number(event.target.value) })}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${formId}-assoc`}>
          Associativity
        </label>
        <input
          id={`${formId}-assoc`}
          className={styles.input}
          type="number"
          min={1}
          value={config.associativity}
          onChange={(event) => updateConfig({ associativity: Number(event.target.value) })}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${formId}-address`}>
          Address Bits
        </label>
        <input
          id={`${formId}-address`}
          className={styles.input}
          type="number"
          min={8}
          value={config.addressBits}
          onChange={(event) => updateConfig({ addressBits: Number(event.target.value) })}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${formId}-policy`}>
          Replacement Policy
        </label>
        <select
          id={`${formId}-policy`}
          className={styles.input}
          value={config.replacementPolicy}
          onChange={(event) => updateConfig({ replacementPolicy: event.target.value as typeof replacementPolicies[number] })}
        >
          {replacementPolicies.map((policy) => (
            <option key={policy} value={policy}>
              {policy}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>Derived Sets</span>
        <div aria-live="polite">{config.numSets}</div>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>Bit Breakdown</span>
        <div aria-live="polite">Tag {breakdown.tagBits} | Index {breakdown.indexBits} | Offset {breakdown.offsetBits}</div>
      </div>
      <div className={styles.toggleRow}>
        <label htmlFor={`${formId}-persist`}>Persist settings locally</label>
        <input
          id={`${formId}-persist`}
          type="checkbox"
          checked={persistEnabled}
          onChange={(event) => togglePersistence(event.target.checked)}
        />
      </div>
      <p id={`${formId}-helper`} style={{ gridColumn: '1 / -1', color: '#94a3b8' }}>
        Settings and trace selections are stored under <code>cache-lab:v1</code> when persistence is enabled.
      </p>
    </form>
  );
};

export default CacheConfigForm;
