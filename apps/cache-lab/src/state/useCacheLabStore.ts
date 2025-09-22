import { create } from 'zustand';
import { produce } from 'immer';
import { CacheConfig, ResultMetrics, Trace } from '../lib/types';
import { DEFAULT_CONFIG, normalizeConfig } from '../lib/config';
import { builtInTraces } from '../lib/traces';

const STORAGE_KEY = 'cache-lab:v1';

interface AssessmentState {
  total: number;
  correct: number;
}

interface CacheLabState {
  config: CacheConfig;
  trace: Trace;
  metrics: ResultMetrics | null;
  persistEnabled: boolean;
  assessment: AssessmentState;
  updateConfig: (partial: Partial<CacheConfig>) => void;
  setTrace: (trace: Trace) => void;
  setMetrics: (metrics: ResultMetrics | null) => void;
  togglePersistence: (enabled: boolean) => void;
  recordAssessment: (correct: boolean) => void;
  resetAssessment: () => void;
}

interface PersistedShape {
  config: CacheConfig;
  trace: Trace;
  assessment: AssessmentState;
  persistEnabled: boolean;
}

function readPersisted(): PersistedShape | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedShape;
  } catch (error) {
    console.warn('Failed to read cache-lab storage', error);
    return null;
  }
}

function writePersisted(state: PersistedShape, enabled: boolean) {
  if (typeof window === 'undefined') return;
  if (!enabled) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const defaultTrace = builtInTraces[0];
const persisted = typeof window !== 'undefined' ? readPersisted() : null;

const initialConfig = normalizeConfig(persisted?.config ?? DEFAULT_CONFIG, DEFAULT_CONFIG);
const initialTrace = persisted?.trace ?? defaultTrace;
const initialAssessment = persisted?.assessment ?? { total: 0, correct: 0 };

export const useCacheLabStore = create<CacheLabState>((set, get) => ({
  config: initialConfig,
  trace: initialTrace,
  metrics: null,
  persistEnabled: persisted?.persistEnabled ?? true,
  assessment: initialAssessment,
  updateConfig: (partial) => {
    set(
      produce<CacheLabState>((draft) => {
        draft.config = normalizeConfig({ ...draft.config, ...partial }, draft.config);
      })
    );
    const next = get();
    if (next.persistEnabled) {
      writePersisted(
        {
          config: next.config,
          trace: next.trace,
          assessment: next.assessment,
          persistEnabled: next.persistEnabled,
        },
        true
      );
    }
  },
  setTrace: (trace) => {
    set(
      produce<CacheLabState>((draft) => {
        draft.trace = trace;
      })
    );
    const next = get();
    if (next.persistEnabled && trace.accesses.length * 8 < 50_000) {
      writePersisted(
        {
          config: next.config,
          trace,
          assessment: next.assessment,
          persistEnabled: next.persistEnabled,
        },
        true
      );
    }
  },
  setMetrics: (metrics) => {
    set(
      produce<CacheLabState>((draft) => {
        draft.metrics = metrics;
      })
    );
  },
  togglePersistence: (enabled) => {
    set(
      produce<CacheLabState>((draft) => {
        draft.persistEnabled = enabled;
      })
    );
    const next = get();
    writePersisted(
      {
        config: next.config,
        trace: next.trace,
        assessment: next.assessment,
        persistEnabled: enabled,
      },
      enabled
    );
  },
  recordAssessment: (correct) => {
    set(
      produce<CacheLabState>((draft) => {
        draft.assessment.total += 1;
        if (correct) draft.assessment.correct += 1;
      })
    );
    const next = get();
    if (next.persistEnabled) {
      writePersisted(
        {
          config: next.config,
          trace: next.trace,
          assessment: next.assessment,
          persistEnabled: next.persistEnabled,
        },
        true
      );
    }
  },
  resetAssessment: () => {
    set(
      produce<CacheLabState>((draft) => {
        draft.assessment = { total: 0, correct: 0 };
      })
    );
    const next = get();
    if (next.persistEnabled) {
      writePersisted(
        {
          config: next.config,
          trace: next.trace,
          assessment: next.assessment,
          persistEnabled: next.persistEnabled,
        },
        true
      );
    }
  },
}));
