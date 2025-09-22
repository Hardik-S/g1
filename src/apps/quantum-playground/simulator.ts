import type { MutableRefObject } from 'react';

export type GateType =
  | 'H'
  | 'X'
  | 'Y'
  | 'Z'
  | 'S'
  | 'T'
  | 'Rx'
  | 'Ry'
  | 'Rz'
  | 'CNOT'
  | 'CZ'
  | 'SWAP';

export interface GateOperation {
  id?: string;
  type: GateType;
  targets: number[];
  controls?: number[];
  angle?: number;
  label?: string;
}

export interface CircuitStep {
  id?: string;
  description?: string;
  operations: GateOperation[];
}

export type QuantumCircuit = CircuitStep[];

export interface ComplexNumber {
  re: number;
  im: number;
}

export interface StateVectorEntry {
  index: number;
  basis: string;
  amplitude: ComplexNumber;
  probability: number;
  phase: number;
}

export interface ProbabilityEntry {
  state: string;
  probability: number;
}

export interface MeasurementResult {
  histogram: Record<string, number>;
  probabilities: Record<string, number>;
  shots: number;
  measuredQubits: number[];
  collapsedOutcome: string | null;
}

const EPSILON = 1e-12;
const DEFAULT_STORAGE_KEY = 'quantum-playground:circuit';

type Matrix2x2 = [
  [ComplexNumber, ComplexNumber],
  [ComplexNumber, ComplexNumber]
];

const ZERO_COMPLEX: ComplexNumber = { re: 0, im: 0 };

const ensureWindow = () => (typeof window !== 'undefined' ? window : undefined);

const createComplex = (re: number, im = 0): ComplexNumber => ({ re, im });

const complexAdd = (a: ComplexNumber, b: ComplexNumber): ComplexNumber => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

const complexMul = (a: ComplexNumber, b: ComplexNumber): ComplexNumber => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

const normalizeAngle = (angle?: number) => (typeof angle === 'number' ? angle : 0);

export class QuantumSimulator {
  private readonly qubitCount: number;

  private readonly dimension: number;

  private readonly real: Float64Array;

  private readonly imag: Float64Array;

  constructor(qubitCount = 4) {
    this.qubitCount = qubitCount;
    this.dimension = 1 << qubitCount;
    this.real = new Float64Array(this.dimension);
    this.imag = new Float64Array(this.dimension);
    this.reset();
  }

  getQubitCount(): number {
    return this.qubitCount;
  }

  reset(): void {
    this.real.fill(0);
    this.imag.fill(0);
    this.real[0] = 1;
  }

  cloneState(): { real: Float64Array; imag: Float64Array } {
    return {
      real: new Float64Array(this.real),
      imag: new Float64Array(this.imag),
    };
  }

  restoreState(state: { real: Float64Array; imag: Float64Array }): void {
    this.real.set(state.real);
    this.imag.set(state.imag);
  }

  getAmplitude(index: number): ComplexNumber {
    return { re: this.real[index], im: this.imag[index] };
  }

  getStateVector(): StateVectorEntry[] {
    const entries: StateVectorEntry[] = [];
    for (let index = 0; index < this.dimension; index += 1) {
      const amplitude = this.getAmplitude(index);
      const probability = amplitude.re * amplitude.re + amplitude.im * amplitude.im;
      const phase = Math.atan2(amplitude.im, amplitude.re);
      entries.push({
        index,
        basis: this.formatBasis(index),
        amplitude,
        probability,
        phase,
      });
    }
    return entries;
  }

  getProbabilityDistribution(): ProbabilityEntry[] {
    const distribution: ProbabilityEntry[] = [];
    for (let index = 0; index < this.dimension; index += 1) {
      const amplitude = this.getAmplitude(index);
      const probability = amplitude.re * amplitude.re + amplitude.im * amplitude.im;
      if (probability > EPSILON) {
        distribution.push({ state: this.formatBasis(index), probability });
      }
    }
    return distribution;
  }

  runCircuit(circuit: QuantumCircuit): void {
    this.reset();
    circuit.forEach((step) => this.applyStep(step));
  }

  applyStep(step: CircuitStep | null | undefined): void {
    if (!step || !Array.isArray(step.operations)) {
      return;
    }

    const occupiedQubits = new Set<number>();
    step.operations.forEach((operation) => {
      const involved = [
        ...(operation.targets ?? []),
        ...(operation.controls ?? []),
      ];

      involved.forEach((qubit) => {
        if (occupiedQubits.has(qubit)) {
          throw new Error(`Conflicting gate placement on qubit ${qubit}`);
        }
        occupiedQubits.add(qubit);
      });

      this.applyGate(operation);
    });
  }

  applyGate(operation: GateOperation): void {
    const { type, targets, controls } = operation;
    const target = targets?.[0];

    switch (type) {
      case 'H':
        this.applySingleQubitGate(getHadamardMatrix(), target);
        break;
      case 'X':
        this.applySingleQubitGate(getPauliXMatrix(), target);
        break;
      case 'Y':
        this.applySingleQubitGate(getPauliYMatrix(), target);
        break;
      case 'Z':
        this.applySingleQubitGate(getPauliZMatrix(), target);
        break;
      case 'S':
        this.applySingleQubitGate(getPhaseMatrix(Math.PI / 2), target);
        break;
      case 'T':
        this.applySingleQubitGate(getPhaseMatrix(Math.PI / 4), target);
        break;
      case 'Rx':
        this.applySingleQubitGate(getRxMatrix(normalizeAngle(operation.angle)), target);
        break;
      case 'Ry':
        this.applySingleQubitGate(getRyMatrix(normalizeAngle(operation.angle)), target);
        break;
      case 'Rz':
        this.applySingleQubitGate(getRzMatrix(normalizeAngle(operation.angle)), target);
        break;
      case 'CNOT': {
        const control = controls?.[0];
        if (control === undefined) {
          throw new Error('CNOT gate missing control qubit');
        }
        this.applyControlledNot(control, target);
        break;
      }
      case 'CZ': {
        const control = controls?.[0];
        if (control === undefined) {
          throw new Error('CZ gate missing control qubit');
        }
        this.applyControlledZ(control, target);
        break;
      }
      case 'SWAP': {
        const targetB = targets?.[1];
        if (targetB === undefined) {
          throw new Error('SWAP gate requires two target qubits');
        }
        this.applySwap(target, targetB);
        break;
      }
      default:
        throw new Error(`Unsupported gate type: ${type}`);
    }
  }

  measure(
    qubits: number[],
    shots = 1024,
    collapse = false,
  ): MeasurementResult {
    const measuredQubits = this.normalizeMeasurementTargets(qubits);
    if (measuredQubits.length === 0) {
      return {
        histogram: {},
        probabilities: {},
        shots: 0,
        measuredQubits,
        collapsedOutcome: null,
      };
    }

    const probabilitiesMap = this.computeMeasurementProbabilities(measuredQubits);
    const entries = Array.from(probabilitiesMap.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const cumulative: number[] = [];
    let runningTotal = 0;
    entries.forEach(([, probability]) => {
      runningTotal += probability;
      cumulative.push(runningTotal);
    });

    const histogram: Record<string, number> = {};

    if (shots > 0 && entries.length > 0) {
      for (let shot = 0; shot < shots; shot += 1) {
        const sample = Math.random();
        let index = 0;
        while (index < cumulative.length && sample > cumulative[index]) {
          index += 1;
        }
        const outcomeKey = entries[Math.min(index, entries.length - 1)][0];
        histogram[outcomeKey] = (histogram[outcomeKey] ?? 0) + 1;
      }
    }

    let collapsedOutcome: string | null = null;
    if (collapse && entries.length > 0) {
      const sample = Math.random();
      let index = 0;
      while (index < cumulative.length && sample > cumulative[index]) {
        index += 1;
      }
      const selected = entries[Math.min(index, entries.length - 1)][0];
      collapsedOutcome = selected;
      this.collapseState(measuredQubits, selected, probabilitiesMap.get(selected) ?? 0);
    }

    const probabilities: Record<string, number> = {};
    entries.forEach(([key, probability]) => {
      probabilities[key] = probability;
    });

    return {
      histogram,
      probabilities,
      shots,
      measuredQubits,
      collapsedOutcome,
    };
  }

  private normalizeMeasurementTargets(qubits: number[]): number[] {
    const unique = new Set<number>();
    qubits.forEach((qubit) => {
      if (Number.isInteger(qubit) && qubit >= 0 && qubit < this.qubitCount) {
        unique.add(qubit);
      }
    });
    if (unique.size === 0) {
      for (let qubit = 0; qubit < this.qubitCount; qubit += 1) {
        unique.add(qubit);
      }
    }
    return Array.from(unique).sort((a, b) => a - b);
  }

  private computeMeasurementProbabilities(qubits: number[]): Map<string, number> {
    const probabilities = new Map<string, number>();
    const totalStates = this.dimension;

    for (let index = 0; index < totalStates; index += 1) {
      const amplitude = this.getAmplitude(index);
      const probability = amplitude.re * amplitude.re + amplitude.im * amplitude.im;
      if (probability < EPSILON) {
        continue;
      }
      const outcomeKey = this.formatMeasurementOutcome(qubits, index);
      probabilities.set(outcomeKey, (probabilities.get(outcomeKey) ?? 0) + probability);
    }

    let total = 0;
    probabilities.forEach((value) => {
      total += value;
    });

    if (total > 0) {
      probabilities.forEach((value, key) => {
        probabilities.set(key, value / total);
      });
    }

    return probabilities;
  }

  private collapseState(qubits: number[], outcome: string, outcomeProbability: number): void {
    if (outcomeProbability <= EPSILON) {
      return;
    }

    const mask = this.createMask(qubits);
    const outcomeBits = this.outcomeStringToBits(qubits, outcome);

    let norm = 0;
    for (let index = 0; index < this.dimension; index += 1) {
      if ((index & mask) !== outcomeBits) {
        this.real[index] = 0;
        this.imag[index] = 0;
      } else {
        norm += this.real[index] * this.real[index] + this.imag[index] * this.imag[index];
      }
    }

    const scale = norm > 0 ? 1 / Math.sqrt(norm) : 1;
    for (let index = 0; index < this.dimension; index += 1) {
      if ((index & mask) === outcomeBits) {
        this.real[index] *= scale;
        this.imag[index] *= scale;
      }
    }
  }

  private formatBasis(index: number): string {
    const bits = index.toString(2).padStart(this.qubitCount, '0');
    return `|${bits}>`;
  }

  private formatMeasurementOutcome(qubits: number[], index: number): string {
    const descending = [...qubits].sort((a, b) => b - a);
    const bits = descending
      .map((qubit) => ((index >> qubit) & 1).toString())
      .join('');
    return bits || '0';
  }

  private outcomeStringToBits(qubits: number[], outcome: string): number {
    const descending = [...qubits].sort((a, b) => b - a);
    let bits = 0;
    for (let i = 0; i < descending.length; i += 1) {
      const qubit = descending[i];
      const bit = outcome[i] === '1' ? 1 : 0;
      const mask = 1 << qubit;
      if (bit) {
        bits |= mask;
      }
    }
    return bits;
  }

  private createMask(qubits: number[]): number {
    return qubits.reduce((mask, qubit) => mask | (1 << qubit), 0);
  }

  private applySingleQubitGate(matrix: Matrix2x2, target: number): void {
    if (!Number.isInteger(target) || target < 0 || target >= this.qubitCount) {
      throw new Error(`Invalid target qubit: ${target}`);
    }

    const stride = 1 << target;
    const span = stride << 1;

    for (let base = 0; base < this.dimension; base += span) {
      for (let offset = 0; offset < stride; offset += 1) {
        const index0 = base + offset;
        const index1 = index0 + stride;

        const a0 = { re: this.real[index0], im: this.imag[index0] };
        const a1 = { re: this.real[index1], im: this.imag[index1] };

        const r0 = complexAdd(
          complexMul(matrix[0][0], a0),
          complexMul(matrix[0][1], a1),
        );
        const r1 = complexAdd(
          complexMul(matrix[1][0], a0),
          complexMul(matrix[1][1], a1),
        );

        this.real[index0] = r0.re;
        this.imag[index0] = r0.im;
        this.real[index1] = r1.re;
        this.imag[index1] = r1.im;
      }
    }
  }

  private applyControlledNot(control: number, target: number): void {
    if (!Number.isInteger(control) || !Number.isInteger(target)) {
      throw new Error('Control and target must be integers');
    }
    if (control === target) {
      throw new Error('Control and target qubits must differ for CNOT');
    }

    const controlMask = 1 << control;
    const targetMask = 1 << target;

    for (let index = 0; index < this.dimension; index += 1) {
      if ((index & controlMask) !== 0) {
        const flippedIndex = index ^ targetMask;
        if (index < flippedIndex) {
          const realTemp = this.real[index];
          const imagTemp = this.imag[index];
          this.real[index] = this.real[flippedIndex];
          this.imag[index] = this.imag[flippedIndex];
          this.real[flippedIndex] = realTemp;
          this.imag[flippedIndex] = imagTemp;
        }
      }
    }
  }

  private applyControlledZ(control: number, target: number): void {
    if (!Number.isInteger(control) || !Number.isInteger(target)) {
      throw new Error('Control and target must be integers');
    }

    const controlMask = 1 << control;
    const targetMask = 1 << target;

    for (let index = 0; index < this.dimension; index += 1) {
      if ((index & controlMask) !== 0 && (index & targetMask) !== 0) {
        this.real[index] = -this.real[index];
        this.imag[index] = -this.imag[index];
      }
    }
  }

  private applySwap(qubitA: number, qubitB: number): void {
    if (qubitA === qubitB) {
      return;
    }

    const maskA = 1 << qubitA;
    const maskB = 1 << qubitB;

    for (let index = 0; index < this.dimension; index += 1) {
      const hasA = (index & maskA) !== 0;
      const hasB = (index & maskB) !== 0;
      if (hasA !== hasB) {
        const swapIndex = index ^ (maskA | maskB);
        if (index < swapIndex) {
          const realTemp = this.real[index];
          const imagTemp = this.imag[index];
          this.real[index] = this.real[swapIndex];
          this.imag[index] = this.imag[swapIndex];
          this.real[swapIndex] = realTemp;
          this.imag[swapIndex] = imagTemp;
        }
      }
    }
  }
}

const getHadamardMatrix = (): Matrix2x2 => {
  const factor = 1 / Math.sqrt(2);
  return [
    [createComplex(factor), createComplex(factor)],
    [createComplex(factor), createComplex(-factor)],
  ];
};

const getPauliXMatrix = (): Matrix2x2 => ([
  [ZERO_COMPLEX, createComplex(1)],
  [createComplex(1), ZERO_COMPLEX],
]);

const getPauliYMatrix = (): Matrix2x2 => ([
  [ZERO_COMPLEX, createComplex(0, -1)],
  [createComplex(0, 1), ZERO_COMPLEX],
]);

const getPauliZMatrix = (): Matrix2x2 => ([
  [createComplex(1), ZERO_COMPLEX],
  [ZERO_COMPLEX, createComplex(-1)],
]);

const getPhaseMatrix = (angle: number): Matrix2x2 => ([
  [createComplex(1), ZERO_COMPLEX],
  [ZERO_COMPLEX, createComplex(Math.cos(angle), Math.sin(angle))],
]);

const getRxMatrix = (angle: number): Matrix2x2 => {
  const half = angle / 2;
  const cos = Math.cos(half);
  const sin = Math.sin(half);
  return [
    [createComplex(cos), createComplex(0, -sin)],
    [createComplex(0, -sin), createComplex(cos)],
  ];
};

const getRyMatrix = (angle: number): Matrix2x2 => {
  const half = angle / 2;
  const cos = Math.cos(half);
  const sin = Math.sin(half);
  return [
    [createComplex(cos), createComplex(-sin)],
    [createComplex(sin), createComplex(cos)],
  ];
};

const getRzMatrix = (angle: number): Matrix2x2 => {
  const half = angle / 2;
  return [
    [createComplex(Math.cos(half), -Math.sin(half)), ZERO_COMPLEX],
    [ZERO_COMPLEX, createComplex(Math.cos(half), Math.sin(half))],
  ];
};

export const saveCircuitToStorage = (
  circuit: QuantumCircuit,
  storageKey = DEFAULT_STORAGE_KEY,
): void => {
  const storageHost = ensureWindow();
  if (!storageHost?.localStorage) {
    return;
  }

  try {
    const serialized = JSON.stringify(circuit);
    storageHost.localStorage.setItem(storageKey, serialized);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to persist circuit', error);
  }
};

export const loadCircuitFromStorage = (
  storageKey = DEFAULT_STORAGE_KEY,
): QuantumCircuit | null => {
  const storageHost = ensureWindow();
  if (!storageHost?.localStorage) {
    return null;
  }

  try {
    const serialized = storageHost.localStorage.getItem(storageKey);
    if (!serialized) {
      return null;
    }
    const parsed = JSON.parse(serialized) as QuantumCircuit;
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.map((step) => ({
      ...step,
      operations: Array.isArray(step?.operations) ? step.operations.map((operation) => ({ ...operation })) : [],
    }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to read circuit from storage', error);
    return null;
  }
};

export const clearCircuitFromStorage = (storageKey = DEFAULT_STORAGE_KEY): void => {
  const storageHost = ensureWindow();
  if (!storageHost?.localStorage) {
    return;
  }
  storageHost.localStorage.removeItem(storageKey);
};

export const attachSimulatorToRef = <T extends QuantumSimulator>(
  ref: MutableRefObject<T | null>,
  simulator: T,
): void => {
  // eslint-disable-next-line no-param-reassign
  ref.current = simulator;
};

export const formatAngleLabel = (angle?: number): string => {
  if (typeof angle !== 'number') {
    return '';
  }
  if (Math.abs(angle - Math.PI) < 1e-6) {
    return 'π';
  }
  if (Math.abs(angle - Math.PI / 2) < 1e-6) {
    return 'π/2';
  }
  if (Math.abs(angle - Math.PI / 4) < 1e-6) {
    return 'π/4';
  }
  return angle.toFixed(2);
};
