import { CircuitStep, GateOperation, QuantumCircuit } from './simulator';

export interface QuantumExample {
  id: string;
  name: string;
  description: string;
  circuit: QuantumCircuit;
  tags?: string[];
}

let gateIdCounter = 0;
let stepIdCounter = 0;

const nextGateId = (type: string) => {
  gateIdCounter += 1;
  return `${type}-${gateIdCounter}`;
};

const nextStepId = (label: string) => {
  stepIdCounter += 1;
  return `${label}-${stepIdCounter}`;
};

const withGateIds = (gate: Omit<GateOperation, 'id'>): GateOperation => ({
  ...gate,
  id: nextGateId(gate.type),
});

const createStep = (operations: Omit<GateOperation, 'id'>[], label: string): CircuitStep => ({
  id: nextStepId(label),
  operations: operations.map(withGateIds),
});

const buildControlledPhase = (
  control: number,
  target: number,
  angle: number,
): CircuitStep[] => [
  createStep([
    { type: 'Rz', targets: [target], angle: angle / 2 },
  ], `rz-pre-${control}-${target}`),
  createStep([
    { type: 'CNOT', controls: [control], targets: [target] },
  ], `cnot-phase-${control}-${target}`),
  createStep([
    { type: 'Rz', targets: [target], angle: -angle / 2 },
  ], `rz-neg-${control}-${target}`),
  createStep([
    { type: 'CNOT', controls: [control], targets: [target] },
  ], `cnot-phase2-${control}-${target}`),
  createStep([
    { type: 'Rz', targets: [control], angle: angle / 2 },
  ], `rz-control-${control}-${target}`),
];

const buildQftCircuit = (qubits: number): QuantumCircuit => {
  const steps: CircuitStep[] = [];
  for (let control = qubits - 1; control >= 0; control -= 1) {
    steps.push(createStep([{ type: 'H', targets: [control] }], `qft-h-${control}`));
    for (let target = control - 1; target >= 0; target -= 1) {
      const angle = Math.PI / 2 ** (control - target);
      steps.push(...buildControlledPhase(control, target, angle));
    }
  }

  for (let i = 0; i < Math.floor(qubits / 2); i += 1) {
    steps.push(createStep([{ type: 'SWAP', targets: [i, qubits - 1 - i] }], `qft-swap-${i}`));
  }
  return steps;
};

export const BELL_STATE: QuantumExample = {
  id: 'bell-state',
  name: 'Bell State',
  description: 'Creates a maximally entangled Bell pair on qubits 0 and 1.',
  tags: ['entanglement', 'two-qubit'],
  circuit: [
    createStep([{ type: 'H', targets: [0] }], 'bell-h'),
    createStep([{ type: 'CNOT', controls: [0], targets: [1] }], 'bell-cnot'),
  ],
};

export const GHZ_STATE: QuantumExample = {
  id: 'ghz-state',
  name: 'GHZ State',
  description: 'Builds a four-qubit Greenberger–Horne–Zeilinger state.',
  tags: ['entanglement', 'multi-qubit'],
  circuit: [
    createStep([{ type: 'H', targets: [0] }], 'ghz-h'),
    createStep([{ type: 'CNOT', controls: [0], targets: [1] }], 'ghz-cnot-01'),
    createStep([{ type: 'CNOT', controls: [1], targets: [2] }], 'ghz-cnot-12'),
    createStep([{ type: 'CNOT', controls: [2], targets: [3] }], 'ghz-cnot-23'),
  ],
};

export const QFT_FOUR_QUBIT: QuantumExample = {
  id: 'qft-4-qubit',
  name: 'Quantum Fourier Transform',
  description: 'Implements the four-qubit Quantum Fourier Transform using phase rotations.',
  tags: ['fourier', 'transform'],
  circuit: buildQftCircuit(4),
};

export const QUANTUM_EXAMPLES: QuantumExample[] = [
  BELL_STATE,
  GHZ_STATE,
  QFT_FOUR_QUBIT,
];

export const getRandomExample = (excludeId?: string): QuantumExample => {
  const candidates = QUANTUM_EXAMPLES.filter((example) => example.id !== excludeId);
  const pool = candidates.length > 0 ? candidates : QUANTUM_EXAMPLES;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
};

export const findExampleById = (id: string): QuantumExample | undefined =>
  QUANTUM_EXAMPLES.find((example) => example.id === id);
