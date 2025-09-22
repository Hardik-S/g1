import { useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import styles from './styles/App.module.css';
import CacheConfigForm from './components/CacheConfigForm';
import ExplanationCard from './components/ExplanationCard';
import MappingExplorer from './modules/MappingExplorer';
import ReplacementSimulator from './modules/ReplacementSimulator';
import ParameterPlayground from './modules/ParameterPlayground';
import LocalityVisualizer from './modules/LocalityVisualizer';
import MissClassifier from './modules/MissClassifier';
import HierarchyExplorer from './modules/HierarchyExplorer';
import PipelineImpact from './modules/PipelineImpact';
import TraceLoader from './modules/TraceLoader';
import { useCacheLabStore } from './state/useCacheLabStore';
import LearnPanel from './components/LearnPanel';
import ExperimentPanel from './components/ExperimentPanel';
import AssessPanel from './components/AssessPanel';
import DashboardPanel from './components/DashboardPanel';

const sections = [
  { id: 'modules', label: 'Modules' },
  { id: 'learn', label: 'Learn' },
  { id: 'experiment', label: 'Experiment' },
  { id: 'assess', label: 'Assess' },
  { id: 'dashboard', label: 'Dashboard' },
] as const;

const moduleTabs = [
  { id: 'mapping', label: 'Mapping Explorer', element: <MappingExplorer /> },
  { id: 'replacement', label: 'Replacement Simulator', element: <ReplacementSimulator /> },
  { id: 'parameters', label: 'Parameter Playground', element: <ParameterPlayground /> },
  { id: 'locality', label: 'Locality Visualizer', element: <LocalityVisualizer /> },
  { id: 'classifier', label: 'Miss Classifier', element: <MissClassifier /> },
  { id: 'hierarchy', label: 'Hierarchy Explorer', element: <HierarchyExplorer /> },
  { id: 'pipeline', label: 'Pipeline Impact', element: <PipelineImpact /> },
  { id: 'loader', label: 'Trace Loader', element: <TraceLoader /> },
] as const;

const moduleExplanations: Record<string, { title: string; points: string[]; formulas: string[] }> = {
  mapping: {
    title: 'Mapping Explorer',
    points: ['Offset = log2(block size)', 'Index = log2(number of sets)', 'Tag = remaining bits'],
    formulas: ['index = (address >> offsetBits) & (2^{indexBits}-1)'],
  },
  replacement: {
    title: 'Replacement Policies',
    points: ['LRU replaces the least recently used line', 'FIFO evicts by arrival order', 'Random uses SEED=42 deterministic PRNG'],
    formulas: ['victim = argmin(lastUsed) for LRU'],
  },
  parameters: {
    title: 'Parameter Playground',
    points: ['Hit ratio improves with larger blocks until conflict dominates', 'Associativity reduces conflict misses'],
    formulas: ['Hit Ratio = Hits / (Hits + Misses)'],
  },
  locality: {
    title: 'Locality Visualizer',
    points: ['Spatial locality: sequential addresses share blocks', 'Temporal locality: reuse frequency'],
    formulas: ['Miss Ratio_{pattern} ≥ Miss Ratio_{sequential}'],
  },
  classifier: {
    title: 'Three-run Classification',
    points: ['First touch is compulsory', 'Hit in fully associative but miss in set assoc ⇒ conflict', 'Miss in both after warm-up ⇒ capacity'],
    formulas: ['capacity = misses_{FA after warm-up} - compulsory'],
  },
  hierarchy: {
    title: 'Hierarchy Explorer',
    points: ['AMAT = L1 + miss_L1*(L2 + miss_L2*(L3 + miss_L3*Mem))', 'Inclusive policy assumed'],
    formulas: ['AMAT = L1h·L1 + L1m(L2h·L2 + L2m(L3h·L3 + L3m·Mem))'],
  },
  pipeline: {
    title: 'Pipeline Impact',
    points: ['CPI = CPI_base + MissPenalty × MissRate × MemRefs/Instr'],
    formulas: ['CPI = CPI_base + MPP × MR × MRI'],
  },
  loader: {
    title: 'Trace Loader',
    points: ['CSV format: address,type?,tick?', 'Use comments (#) for notes'],
    formulas: ['address ∈ [0, 2^{addressBits})'],
  },
};

const App: React.FC = () => {
  const [section, setSection] = useState<typeof sections[number]['id']>('modules');
  const [moduleTab, setModuleTab] = useState<typeof moduleTabs[number]['id']>('mapping');
  const metrics = useCacheLabStore((state) => state.metrics);

  const explanation = moduleExplanations[moduleTab];

  const metricsItems = useMemo(
    () => [
      { label: 'Hits', value: metrics ? metrics.hits.toString() : '—' },
      { label: 'Misses', value: metrics ? metrics.misses.toString() : '—' },
      { label: 'Hit Ratio', value: metrics ? `${(metrics.hitRatio * 100).toFixed(1)}%` : '—' },
      { label: 'AMAT', value: metrics ? `${metrics.amat.toFixed(2)} cyc` : '—' },
      { label: 'CPI', value: metrics?.cpi ? metrics.cpi.toFixed(2) : '—' },
    ],
    [metrics]
  );

  return (
    <div className={styles.container}>
      <header className={styles.navbar}>
        <div>
          <h1>Cache Learning Lab</h1>
          <p>Interactive cache modules with deterministic seeds for repeatable experiments.</p>
        </div>
        <nav className={styles.navTabs} aria-label="Primary navigation">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.navButton} ${section === item.id ? styles.navButtonActive : ''}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className={styles.contentRow}>
        <div className={styles.mainColumn}>
          <CacheConfigForm />
          {section === 'modules' && (
            <Tabs.Root value={moduleTab} onValueChange={(value) => setModuleTab(value as typeof moduleTab)} className={styles.moduleTabs}>
              <Tabs.List className={styles.moduleTabList}>
                {moduleTabs.map((module) => (
                  <Tabs.Trigger key={module.id} value={module.id} className={styles.moduleTrigger}>
                    {module.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              {moduleTabs.map((module) => (
                <Tabs.Content key={module.id} value={module.id}>
                  {module.element}
                </Tabs.Content>
              ))}
            </Tabs.Root>
          )}
          {section === 'learn' && <LearnPanel />}
          {section === 'experiment' && <ExperimentPanel />}
          {section === 'assess' && <AssessPanel />}
          {section === 'dashboard' && <DashboardPanel />}
        </div>
        <div className={styles.rightColumn}>
          {explanation && (
            <ExplanationCard title={explanation.title} points={explanation.points} formulae={explanation.formulas} />
          )}
        </div>
      </div>

      <footer className={styles.metricsBar} aria-label="Metrics">
        {metricsItems.map((item) => (
          <div key={item.label} className={styles.metricCard}>
            <div className={styles.metricLabel}>{item.label}</div>
            <div className={styles.metricValue}>{item.value}</div>
          </div>
        ))}
      </footer>
    </div>
  );
};

export default App;
