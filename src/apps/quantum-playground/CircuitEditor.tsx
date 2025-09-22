import React, { FormEvent, useMemo, useState } from 'react';
import {
  CircuitStep,
  GateOperation,
  GateType,
  QuantumCircuit,
  formatAngleLabel,
} from './simulator';

const gateLibrary: Array<{
  type: GateType;
  label: string;
  description: string;
  requiresAngle?: boolean;
  defaultAngle?: number;
  requiresControl?: boolean;
  requiresSecondaryTarget?: boolean;
}> = [
  { type: 'H', label: 'Hadamard', description: 'Creates superposition on a single qubit.' },
  { type: 'X', label: 'Pauli-X', description: 'Bit flip gate (NOT).' },
  { type: 'Y', label: 'Pauli-Y', description: 'Pauli-Y gate with phase rotation.' },
  { type: 'Z', label: 'Pauli-Z', description: 'Phase flip gate.' },
  { type: 'S', label: 'S Gate', description: 'Phase gate adding +π/2 on |1⟩.' },
  { type: 'T', label: 'T Gate', description: 'π/4 phase gate on |1⟩.' },
  {
    type: 'Rx',
    label: 'Rx(θ)',
    description: 'Rotation around the X-axis by angle θ.',
    requiresAngle: true,
    defaultAngle: Math.PI,
  },
  {
    type: 'Ry',
    label: 'Ry(θ)',
    description: 'Rotation around the Y-axis by angle θ.',
    requiresAngle: true,
    defaultAngle: Math.PI,
  },
  {
    type: 'Rz',
    label: 'Rz(θ)',
    description: 'Rotation around the Z-axis by angle θ.',
    requiresAngle: true,
    defaultAngle: Math.PI / 2,
  },
  {
    type: 'CNOT',
    label: 'CNOT',
    description: 'Controlled-NOT gate entangling two qubits.',
    requiresControl: true,
  },
  {
    type: 'CZ',
    label: 'CZ',
    description: 'Controlled-Z phase gate.',
    requiresControl: true,
  },
  {
    type: 'SWAP',
    label: 'SWAP',
    description: 'Swap the state of two qubits.',
    requiresSecondaryTarget: true,
  },
];

const createGateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const createStepId = () => `step-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const formatStepTitle = (step: CircuitStep, index: number) =>
  step.description ?? `Step ${index + 1}`;

const collectQubits = (operation: GateOperation): number[] => [
  ...(operation.targets ?? []),
  ...(operation.controls ?? []),
];

const hasQubitOverlap = (a: GateOperation, b: GateOperation): boolean => {
  const aQubits = collectQubits(a);
  const bQubits = collectQubits(b);
  return aQubits.some((qubit) => bQubits.includes(qubit));
};

const describeCell = (operation: GateOperation, qubit: number): string | null => {
  if (operation.targets?.includes(qubit)) {
    if (operation.type === 'Rz' || operation.type === 'Rx' || operation.type === 'Ry') {
      return `${operation.type}(${formatAngleLabel(operation.angle)})`;
    }
    if (operation.type === 'SWAP') {
      return 'SWAP';
    }
    return operation.type;
  }

  if (operation.controls?.includes(qubit)) {
    if (operation.type === 'CNOT') {
      return '● (ctrl)';
    }
    if (operation.type === 'CZ') {
      return '⊙ (ctrl)';
    }
  }

  return null;
};

interface CircuitEditorProps {
  circuit: QuantumCircuit;
  onCircuitChange: (circuit: QuantumCircuit) => void;
  qubitCount: number;
}

const CircuitEditor: React.FC<CircuitEditorProps> = ({ circuit, onCircuitChange, qubitCount }) => {
  const [selectedGateType, setSelectedGateType] = useState<GateType>('H');
  const [selectedStepId, setSelectedStepId] = useState<string>('append');
  const [targetQubit, setTargetQubit] = useState(0);
  const [secondaryTarget, setSecondaryTarget] = useState(1);
  const [controlQubit, setControlQubit] = useState(1);
  const [angle, setAngle] = useState(Math.PI / 2);
  const [formError, setFormError] = useState<string | null>(null);

  const gateDefinition = useMemo(
    () => gateLibrary.find((gate) => gate.type === selectedGateType) ?? gateLibrary[0],
    [selectedGateType],
  );

  const handleGateTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value as GateType;
    setSelectedGateType(type);
    const definition = gateLibrary.find((gate) => gate.type === type);
    if (definition?.requiresControl && controlQubit === targetQubit) {
      setControlQubit((targetQubit + 1) % qubitCount);
    }
    if (definition?.requiresSecondaryTarget && secondaryTarget === targetQubit) {
      setSecondaryTarget((targetQubit + 1) % qubitCount);
    }
    if (definition?.requiresAngle && typeof definition.defaultAngle === 'number') {
      setAngle(definition.defaultAngle);
    }
  };

  const handleAddGate = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const definition = gateDefinition;
    const newGate: GateOperation = {
      id: createGateId(selectedGateType.toLowerCase()),
      type: selectedGateType,
      targets: [targetQubit],
    };

    if (definition.requiresSecondaryTarget) {
      if (secondaryTarget === targetQubit) {
        setFormError('SWAP gate requires two distinct targets.');
        return;
      }
      newGate.targets = [targetQubit, secondaryTarget];
    }

    if (definition.requiresControl) {
      if (controlQubit === targetQubit) {
        setFormError('Control and target qubits must be different.');
        return;
      }
      newGate.controls = [controlQubit];
    }

    if (definition.requiresAngle) {
      newGate.angle = angle;
    }

    const targetIndex = selectedStepId === 'append'
      ? circuit.length
      : circuit.findIndex((step, index) => (step.id ?? `step-${index}`) === selectedStepId);

    if (targetIndex === -1 || targetIndex >= circuit.length) {
      const newStep: CircuitStep = {
        id: createStepId(),
        operations: [newGate],
      };
      onCircuitChange([...circuit, newStep]);
      setSelectedStepId(newStep.id ?? 'append');
      return;
    }

    const targetStep = circuit[targetIndex];
    const conflicts = targetStep.operations.some((operation) => hasQubitOverlap(operation, newGate));
    if (conflicts) {
      setFormError('Selected gate conflicts with an existing operation in this step.');
      return;
    }

    const updatedStep: CircuitStep = {
      ...targetStep,
      operations: [...targetStep.operations, newGate],
    };

    const nextCircuit = [...circuit];
    nextCircuit[targetIndex] = updatedStep;
    onCircuitChange(nextCircuit);
  };

  const handleRemoveGate = (stepIndex: number, gateId: string | undefined) => {
    const step = circuit[stepIndex];
    const filtered = step.operations.filter((operation) => operation.id !== gateId);
    const nextCircuit = [...circuit];
    nextCircuit[stepIndex] = { ...step, operations: filtered };
    onCircuitChange(nextCircuit);
  };

  const handleRemoveStep = (stepIndex: number) => {
    const nextCircuit = circuit.filter((_, index) => index !== stepIndex);
    onCircuitChange(nextCircuit);
    setSelectedStepId('append');
  };

  const handleClearCircuit = () => {
    onCircuitChange([]);
    setSelectedStepId('append');
  };

  const stepOptions = useMemo(
    () => circuit.map((step, index) => ({
      id: step.id ?? `step-${index}`,
      label: formatStepTitle(step, index),
    })),
    [circuit],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Circuit Builder</h2>
            <p className="text-sm text-slate-400">Compose gates per step and manage entanglement layout.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
            onClick={handleClearCircuit}
          >
            Clear Circuit
          </button>
        </div>

        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleAddGate}>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="gate-type">
              Gate
            </label>
            <select
              id="gate-type"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={selectedGateType}
              onChange={handleGateTypeChange}
            >
              {gateLibrary.map((gate) => (
                <option key={gate.type} value={gate.type}>
                  {gate.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{gateDefinition.description}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="step-selector">
              Step
            </label>
            <select
              id="step-selector"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={selectedStepId}
              onChange={(event) => setSelectedStepId(event.target.value)}
            >
              <option value="append">Append new step</option>
              {stepOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Concurrent gates in the same step must touch disjoint qubits.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="target-qubit">
              Target Qubit
            </label>
            <select
              id="target-qubit"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={targetQubit}
              onChange={(event) => setTargetQubit(Number(event.target.value))}
            >
              {Array.from({ length: qubitCount }).map((_, index) => (
                <option key={`target-${index}`} value={index}>
                  q{index}
                </option>
              ))}
            </select>
          </div>

          {gateDefinition.requiresSecondaryTarget ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="secondary-target">
                Second Target
              </label>
              <select
                id="secondary-target"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                value={secondaryTarget}
                onChange={(event) => setSecondaryTarget(Number(event.target.value))}
              >
                {Array.from({ length: qubitCount }).map((_, index) => (
                  <option key={`secondary-${index}`} value={index}>
                    q{index}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {gateDefinition.requiresControl ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="control-qubit">
                Control Qubit
              </label>
              <select
                id="control-qubit"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                value={controlQubit}
                onChange={(event) => setControlQubit(Number(event.target.value))}
              >
                {Array.from({ length: qubitCount }).map((_, index) => (
                  <option key={`control-${index}`} value={index}>
                    q{index}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {gateDefinition.requiresAngle ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="gate-angle">
                Angle (radians)
              </label>
              <input
                id="gate-angle"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                type="number"
                step="0.01"
                value={angle}
                onChange={(event) => setAngle(Number(event.target.value))}
              />
            </div>
          ) : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Add Gate
            </button>
            {formError ? <p className="mt-2 text-sm text-rose-400">{formError}</p> : null}
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-lg">
        <h3 className="text-base font-semibold text-slate-100">Circuit Timeline</h3>
        <p className="mb-3 text-sm text-slate-400">Visual overview of gates applied per step and qubit.</p>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-sm text-slate-100">
            <thead>
              <tr>
                <th className="border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Qubit
                </th>
                {circuit.map((step, index) => (
                  <th
                    key={step.id ?? `step-header-${index}`}
                    className="border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    Step {index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: qubitCount }).map((_, qubitIndex) => (
                <tr key={`qubit-row-${qubitIndex}`} className="odd:bg-slate-900 even:bg-slate-900/60">
                  <th className="border border-slate-800 px-3 py-2 text-left font-semibold text-slate-200">
                    q{qubitIndex}
                  </th>
                  {circuit.map((step, stepIndex) => {
                    const gateLabel = step.operations
                      .map((operation) => describeCell(operation, qubitIndex))
                      .find((label) => label !== null);
                    return (
                      <td
                        key={`${step.id ?? `step-${stepIndex}`}-q${qubitIndex}`}
                        className="border border-slate-800 px-3 py-2 text-center text-xs text-slate-200"
                      >
                        {gateLabel ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        {circuit.map((step, index) => (
          <div
            key={step.id ?? `step-card-${index}`}
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-100">{formatStepTitle(step, index)}</h4>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                onClick={() => handleRemoveStep(index)}
              >
                Remove Step
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {step.operations.map((operation) => (
                <div
                  key={operation.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-100"
                >
                  <span className="font-semibold uppercase tracking-wide text-slate-200">{operation.type}</span>
                  {operation.angle !== undefined ? (
                    <span className="text-slate-400">θ={formatAngleLabel(operation.angle)}</span>
                  ) : null}
                  {operation.controls?.length ? (
                    <span className="text-slate-400">ctrl: {operation.controls.join(', ')}</span>
                  ) : null}
                  <span className="text-slate-400">targets: {operation.targets.join(', ')}</span>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30"
                    onClick={() => handleRemoveGate(index, operation.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {step.operations.length === 0 ? (
                <p className="text-sm text-slate-500">No gates added in this step yet.</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CircuitEditor;
