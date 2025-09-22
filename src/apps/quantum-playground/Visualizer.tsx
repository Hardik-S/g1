import React, { useMemo } from 'react';
import {
  MeasurementResult,
  ProbabilityEntry,
  QuantumCircuit,
  StateVectorEntry,
} from './simulator';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface VisualizerProps {
  circuit: QuantumCircuit;
  probabilities: ProbabilityEntry[];
  stateVector: StateVectorEntry[];
  measurement: MeasurementResult | null;
  measuredQubits: number[];
}

const Visualizer: React.FC<VisualizerProps> = ({
  circuit,
  probabilities,
  stateVector,
  measurement,
  measuredQubits,
}) => {
  const probabilityData = useMemo(
    () => probabilities.map((entry) => ({
      basis: entry.state.replace(/[<>|]/g, ''),
      probability: Number(entry.probability.toFixed(6)),
    })),
    [probabilities],
  );

  const measurementData = useMemo(() => {
    if (!measurement) {
      return [];
    }
    const keys = Object.keys(measurement.probabilities).sort();
    return keys.map((key) => ({
      outcome: key,
      probability: Number((measurement.probabilities[key] ?? 0).toFixed(6)),
      shots: measurement.histogram[key] ?? 0,
    }));
  }, [measurement]);

  const circuitSummary = useMemo(() => ({
    depth: circuit.length,
    totalGates: circuit.reduce((count, step) => count + step.operations.length, 0),
  }), [circuit]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-100">Simulation Snapshot</h2>
        <p className="text-sm text-slate-400">
          Depth {circuitSummary.depth} • Total gates {circuitSummary.totalGates} • Measuring qubits
          {' '}
          {measuredQubits.length > 0 ? measuredQubits.map((q) => `q${q}`).join(', ') : 'none'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-lg">
          <h3 className="text-base font-semibold text-slate-100">State Probabilities</h3>
          <p className="mb-2 text-sm text-slate-400">Amplitude probabilities across the 4-qubit computational basis.</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={probabilityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="basis" stroke="#cbd5f5" />
                <YAxis stroke="#cbd5f5" domain={[0, 1]} tickFormatter={(value) => value.toFixed(2)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }}
                  formatter={(value: number) => value.toFixed(4)}
                />
                <Legend />
                <Bar dataKey="probability" fill="#38bdf8" name="Probability" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-lg">
          <h3 className="text-base font-semibold text-slate-100">Measurement Outcomes</h3>
          <p className="mb-2 text-sm text-slate-400">Sampling histogram from the selected measurement registers.</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={measurementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="outcome" stroke="#cbd5f5" />
                <YAxis stroke="#cbd5f5" tickFormatter={(value) => value.toFixed(2)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }}
                  formatter={(value: number, name) => (name === 'shots' ? value : value.toFixed(4))}
                />
                <Legend />
                <Bar dataKey="probability" fill="#34d399" name="Probability" />
                <Bar dataKey="shots" fill="#818cf8" name="Sample Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-lg">
        <h3 className="text-base font-semibold text-slate-100">State Vector</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-sm text-slate-100">
            <thead>
              <tr>
                <th className="border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Basis
                </th>
                <th className="border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Amplitude (Re)
                </th>
                <th className="border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Amplitude (Im)
                </th>
                <th className="border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Probability
                </th>
                <th className="border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Phase
                </th>
              </tr>
            </thead>
            <tbody>
              {stateVector.map((entry) => (
                <tr key={entry.index} className="odd:bg-slate-900 even:bg-slate-900/60">
                  <td className="border border-slate-800 px-3 py-2 font-mono text-slate-100">{entry.basis}</td>
                  <td className="border border-slate-800 px-3 py-2 text-right text-slate-200">{entry.amplitude.re.toFixed(4)}</td>
                  <td className="border border-slate-800 px-3 py-2 text-right text-slate-200">{entry.amplitude.im.toFixed(4)}</td>
                  <td className="border border-slate-800 px-3 py-2 text-right text-slate-200">{entry.probability.toFixed(4)}</td>
                  <td className="border border-slate-800 px-3 py-2 text-right text-slate-200">{entry.phase.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
        <h3 className="text-base font-semibold text-slate-100">Bloch Sphere Visualizations</h3>
        <p>
          Placeholder for per-qubit Bloch sphere renderings. TODO: integrate full Bloch sphere widgets per qubit for deeper
          intuition.
        </p>
      </div>
    </div>
  );
};

export default Visualizer;
