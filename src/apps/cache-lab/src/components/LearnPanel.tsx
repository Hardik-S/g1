import styles from './LearnPanel.module.css';

const LearnPanel: React.FC = () => {
  return (
    <section className={styles.panel} aria-label="Learn cache fundamentals">
      <header>
        <h2>Guided Walkthrough</h2>
        <p>Move through the modules in order to build intuition about cache mapping, locality, and performance.</p>
      </header>
      <ol className={styles.stepList}>
        <li>Start with <strong>Mapping Explorer</strong> to relate binary addresses to tag/index/offset fields.</li>
        <li>Use the <strong>Replacement Simulator</strong> to contrast LRU, FIFO, and Random on the same trace.</li>
        <li>Experiment in the <strong>Parameter Playground</strong> to see how block size and associativity reshape hit ratios.</li>
        <li>Visualize locality patterns and author your own traces in the <strong>Locality Visualizer</strong>.</li>
        <li>Classify misses and link them back to three-run theory with the <strong>Miss Classifier</strong>.</li>
      </ol>
      <div className={styles.highlight}>
        <h3>Tip</h3>
        <p>
          Enable persistence in the configuration panel to keep your favourite setups. The contextual card on the right updates with
          formulas and definitions as you explore.
        </p>
      </div>
    </section>
  );
};

export default LearnPanel;
