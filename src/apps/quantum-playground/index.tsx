import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import CircuitEditor from './CircuitEditor';
import Visualizer from './Visualizer';
import {
  MeasurementResult,
  ProbabilityEntry,
  QuantumCircuit,
  QuantumSimulator,
  StateVectorEntry,
  loadCircuitFromStorage,
  saveCircuitToStorage,
} from './simulator';
import {
  BELL_STATE,
  QUANTUM_EXAMPLES,
  QuantumExample,
  getRandomExample,
} from './examples';
import './styles.css';

const cloneCircuit = (circuit: QuantumCircuit): QuantumCircuit =>
  circuit.map((step, stepIndex) => ({
    ...step,
    id: step.id ?? `step-${stepIndex}`,
    operations: step.operations.map((operation, gateIndex) => ({
      ...operation,
      id: operation.id ?? `${operation.type}-${stepIndex}-${gateIndex}`,
    })),
  }));

const DEFAULT_EXAMPLE = BELL_STATE;

const QuantumPlaygroundApp: React.FC = () => {
  const simulatorRef = useRef<QuantumSimulator | null>(null);
  if (!simulatorRef.current) {
    simulatorRef.current = new QuantumSimulator(4);
  }

  const storedCircuit = useMemo(() => loadCircuitFromStorage(), []);
  const [circuit, setCircuit] = useState<QuantumCircuit>(() => (
    storedCircuit && storedCircuit.length > 0
      ? cloneCircuit(storedCircuit)
      : cloneCircuit(DEFAULT_EXAMPLE.circuit)
  ));
  const [activeExample, setActiveExample] = useState<QuantumExample>(DEFAULT_EXAMPLE);
  const [stateVector, setStateVector] = useState<StateVectorEntry[]>(
    () => simulatorRef.current!.getStateVector(),
  );
  const [probabilities, setProbabilities] = useState<ProbabilityEntry[]>(
    () => simulatorRef.current!.getProbabilityDistribution(),
  );
  const [measurement, setMeasurement] = useState<MeasurementResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [shots, setShots] = useState(512);
  const qubitCount = simulatorRef.current!.getQubitCount();
  const [measurementMask, setMeasurementMask] = useState<boolean[]>(
    () => Array.from({ length: qubitCount }, () => true),
  );

  const measuredQubits = useMemo(
    () => measurementMask.reduce<number[]>((acc, flag, index) => {
      if (flag) {
        acc.push(index);
      }
      return acc;
    }, []),
    [measurementMask],
  );

  const refreshState = useCallback(() => {
    const simulator = simulatorRef.current;
    if (!simulator) {
      return;
    }
    setStateVector(simulator.getStateVector());
    setProbabilities(simulator.getProbabilityDistribution());
    setMeasurement(simulator.measure(measuredQubits, shots, false));
  }, [measuredQubits, shots]);

  useEffect(() => {
    const simulator = simulatorRef.current;
    if (!simulator) {
      return;
    }
    simulator.reset();
    setStateVector(simulator.getStateVector());
    setProbabilities(simulator.getProbabilityDistribution());
    setMeasurement(simulator.measure(measuredQubits, shots, false));
    // Initial mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveCircuitToStorage(circuit);
  }, [circuit]);

  useEffect(() => {
    refreshState();
  }, [measuredQubits, shots, refreshState]);

  const handleCircuitChange = (nextCircuit: QuantumCircuit) => {
    setCircuit(cloneCircuit(nextCircuit));
  };

  const handleReset = () => {
    const simulator = simulatorRef.current;
    if (!simulator) {
      return;
    }
    simulator.reset();
    setCurrentStep(0);
    refreshState();
  };

  const handleRun = () => {
    const simulator = simulatorRef.current;
    if (!simulator) {
      return;
    }
    simulator.runCircuit(circuit);
    setCurrentStep(circuit.length);
    refreshState();
  };

  const handleStep = () => {
    const simulator = simulatorRef.current;
    if (!simulator) {
      return;
    }

    let nextIndex = currentStep;
    if (nextIndex >= circuit.length) {
      nextIndex = 0;
    }

    if (nextIndex === 0) {
      simulator.reset();
    }

    const step = circuit[nextIndex];
    if (step) {
      simulator.applyStep(step);
      setCurrentStep(nextIndex + 1);
      refreshState();
    }
  };

  const handleRandomExample = () => {
    const example = getRandomExample(activeExample.id);
    setActiveExample(example);
    const cloned = cloneCircuit(example.circuit);
    setCircuit(cloned);
    const simulator = simulatorRef.current;
    if (simulator) {
      simulator.reset();
    }
    setCurrentStep(0);
    refreshState();
  };

  const handleToggleMeasurement = (index: number) => {
    setMeasurementMask((mask) => {
      const next = [...mask];
      next[index] = !next[index];
      if (!next.some(Boolean)) {
        next[index] = true;
      }
      return next;
    });
  };

  const handleShotsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value) && value > 0) {
      setShots(Math.min(10000, Math.max(1, Math.floor(value))));
    }
  };

  return (
    <div className="quantum-playground min-h-screen space-y-6 bg-slate-950 px-6 py-6 text-slate-100">
      <header className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Quantum Playground</h1>
            <p className="text-sm text-slate-400">
              Explore a four-qubit state-vector simulator with an interactive circuit editor, measurement sampling, and
              persistent circuit storage.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">Example circuits</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {QUANTUM_EXAMPLES.map((example) => (
                <li key={example.id}>
                  <span className={example.id === activeExample.id ? 'text-emerald-400' : ''}>{example.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <CircuitEditor circuit={circuit} onCircuitChange={handleCircuitChange} qubitCount={qubitCount} />
        </div>
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-100">Simulation Controls</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              onClick={handleRun}
            >
              Run Circuit
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
              onClick={handleStep}
            >
              Step
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
              onClick={handleRandomExample}
            >
              Random Example
            </button>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step Progress</p>
            <p className="text-slate-100">{currentStep} / {circuit.length}</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Measurement Qubits</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from({ length: qubitCount }).map((_, index) => (
                  <label
                    key={`measure-${index}`}
                    className={`inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold transition hover:bg-slate-800 ${measurementMask[index] ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-900 text-slate-300'}`}
                  >
                    <input
                      className="accent-emerald-500"
                      type="checkbox"
                      checked={measurementMask[index]}
                      onChange={() => handleToggleMeasurement(index)}
                    />
                    q{index}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="shot-count">
                Shots
              </label>
              <input
                id="shot-count"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                type="number"
                min={1}
                max={10000}
                value={shots}
                onChange={handleShotsChange}
              />
              <p className="text-xs text-slate-500">Number of samples used for the measurement histogram.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <Visualizer
          circuit={circuit}
          probabilities={probabilities}
          stateVector={stateVector}
          measurement={measurement}
          measuredQubits={measuredQubits}
        />
      </section>
    </div>
  );
};

export default QuantumPlaygroundApp;
