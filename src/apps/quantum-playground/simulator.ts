export type Complex = {
  re: number;
  im: number;
};

const ZERO: Complex = { re: 0, im: 0 };
const ONE: Complex = { re: 1, im: 0 };

const complex = (re: number, im = 0): Complex => ({ re, im });

const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const mul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const scale = (a: Complex, factor: number): Complex => ({ re: a.re * factor, im: a.im * factor });

const magnitudeSquared = (a: Complex): number => a.re * a.re + a.im * a.im;

const cos = Math.cos;
const sin = Math.sin;

const TWO_PI = Math.PI * 2;

const createRotationMatrix = (axis: 'x' | 'y' | 'z', theta: number): Complex[][] => {
  const half = theta / 2;
  switch (axis) {
    case 'x': {
      const c = cos(half);
      const s = sin(half);
      return [
        [complex(c, 0), complex(0, -s)],
        [complex(0, -s), complex(c, 0)],
      ];
    }
    case 'y': {
      const c = cos(half);
      const s = sin(half);
      return [
        [complex(c, 0), complex(-s, 0)],
        [complex(s, 0), complex(c, 0)],
      ];
    }
    case 'z': {
      const phasePos = complex(cos(half), sin(half));
      const phaseNeg = complex(cos(half), -sin(half));
      return [
        [phaseNeg, ZERO],
        [ZERO, phasePos],
      ];
    }
    default:
      throw new Error(`Unsupported rotation axis: ${axis}`);
  }
};

const hadamardMatrix: Complex[][] = [
  [scale(ONE, Math.SQRT1_2), scale(ONE, Math.SQRT1_2)],
  [scale(ONE, Math.SQRT1_2), scale(complex(-1, 0), Math.SQRT1_2)],
];

const pauliX: Complex[][] = [
  [ZERO, ONE],
  [ONE, ZERO],
];

const pauliY: Complex[][] = [
  [ZERO, complex(0, -1)],
  [complex(0, 1), ZERO],
];

const pauliZ: Complex[][] = [
  [ONE, ZERO],
  [ZERO, complex(-1, 0)],
];

const identity2: Complex[][] = [
  [ONE, ZERO],
  [ZERO, ONE],
];

const controlledPhaseMatrix = (angle: number): Complex[][] => {
  const phase = complex(cos(angle), sin(angle));
  return [
    [ONE, ZERO, ZERO, ZERO],
    [ZERO, ONE, ZERO, ZERO],
    [ZERO, ZERO, ONE, ZERO],
    [ZERO, ZERO, ZERO, phase],
  ];
};

const swapMatrix: Complex[][] = [
  [ONE, ZERO, ZERO, ZERO],
  [ZERO, ZERO, ONE, ZERO],
  [ZERO, ONE, ZERO, ZERO],
  [ZERO, ZERO, ZERO, ONE],
];

const cnotMatrix: Complex[][] = [
  [ONE, ZERO, ZERO, ZERO],
  [ZERO, ONE, ZERO, ZERO],
  [ZERO, ZERO, ZERO, ONE],
  [ZERO, ZERO, ONE, ZERO],
];

const czMatrix: Complex[][] = [
  [ONE, ZERO, ZERO, ZERO],
  [ZERO, ONE, ZERO, ZERO],
  [ZERO, ZERO, ONE, ZERO],
  [ZERO, ZERO, ZERO, complex(-1, 0)],
];

const qftMatrix2: Complex[][] = (() => {
  const factor = 0.5;
  const roots = [0, 1, 2, 3].map((k) => complex(Math.cos((TWO_PI * k) / 4), Math.sin((TWO_PI * k) / 4)));
  const rows: Complex[][] = [];
  for (let j = 0; j < 4; j += 1) {
    const row: Complex[] = [];
    for (let k = 0; k < 4; k += 1) {
      const exponent = (j * k) % 4;
      row.push(scale(roots[exponent], factor));
    }
    rows.push(row);
  }
  return rows;
})();

const lcg = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 0x100000000;
    return state / 0x100000000;
  };
};

export type QuantumOperation =
  | { type: 'H'; target: number }
  | { type: 'X'; target: number }
  | { type: 'Y'; target: number }
  | { type: 'Z'; target: number }
  | { type: 'RX'; target: number; theta: number }
  | { type: 'RY'; target: number; theta: number }
  | { type: 'RZ'; target: number; theta: number }
  | { type: 'PHASE'; target: number; theta: number }
  | { type: 'CPHASE'; control: number; target: number; theta: number }
  | { type: 'CNOT'; control: number; target: number }
  | { type: 'CZ'; control: number; target: number }
  | { type: 'SWAP'; targets: [number, number] }
  | { type: 'QFT2'; targets: [number, number] };

export type MeasurementOptions = {
  qubits?: number[];
  seed?: number;
};

export type MeasurementResult = {
  probabilities: Record<string, number>;
  counts: Record<string, number>;
};

export class QuantumSimulator {
  private readonly numQubits: number;

  private state: Complex[];

  constructor(qubits: number) {
    if (qubits <= 0 || !Number.isInteger(qubits)) {
      throw new Error('QuantumSimulator requires a positive integer number of qubits');
    }
    this.numQubits = qubits;
    this.state = new Array(1 << qubits).fill(null).map((_, index) => (index === 0 ? ONE : ZERO));
  }

  reset(): void {
    this.state = new Array(1 << this.numQubits)
      .fill(null)
      .map((_, index) => (index === 0 ? ONE : ZERO));
  }

  getQubitCount(): number {
    return this.numQubits;
  }

  getStateVector(): Complex[] {
    return this.state.map((amp) => ({ ...amp }));
  }

  getAmplitude(state: number | string): Complex {
    const index = typeof state === 'number' ? state : parseInt(state, 2);
    if (Number.isNaN(index) || index < 0 || index >= this.state.length) {
      throw new Error(`Invalid basis state: ${state}`);
    }
    const amplitude = this.state[index];
    return { ...amplitude };
  }

  getProbabilities(options?: { qubits?: number[] }): Record<string, number> {
    const { qubits } = options ?? {};
    if (!qubits || qubits.length === 0) {
      return this.state.reduce<Record<string, number>>((acc, amp, index) => {
        const key = index.toString(2).padStart(this.numQubits, '0');
        acc[key] = magnitudeSquared(amp);
        return acc;
      }, {});
    }

    const unique = [...new Set(qubits)].sort((a, b) => b - a);
    const distribution: Record<string, number> = {};
    for (let index = 0; index < this.state.length; index += 1) {
      const key = unique.map((qubit) => ((index >> qubit) & 1).toString()).join('');
      distribution[key] = (distribution[key] ?? 0) + magnitudeSquared(this.state[index]);
    }
    return distribution;
  }

  private applySingleQubit(matrix: Complex[][], qubit: number): void {
    if (qubit < 0 || qubit >= this.numQubits) {
      throw new Error(`Qubit index ${qubit} is out of bounds`);
    }
    const dimension = 1 << this.numQubits;
    const stride = 1 << (qubit + 1);
    const half = 1 << qubit;
    for (let block = 0; block < dimension; block += stride) {
      for (let offset = 0; offset < half; offset += 1) {
        const zeroIndex = block + offset;
        const oneIndex = zeroIndex + half;
        const ampZero = this.state[zeroIndex];
        const ampOne = this.state[oneIndex];
        const newZero = add(mul(matrix[0][0], ampZero), mul(matrix[0][1], ampOne));
        const newOne = add(mul(matrix[1][0], ampZero), mul(matrix[1][1], ampOne));
        this.state[zeroIndex] = newZero;
        this.state[oneIndex] = newOne;
      }
    }
  }

  private applyTwoQubit(matrix: Complex[][], qubits: [number, number]): void {
    const [q0, q1] = qubits;
    if (q0 === q1) {
      throw new Error('Two-qubit gates require distinct qubits');
    }
    if (q0 < 0 || q0 >= this.numQubits || q1 < 0 || q1 >= this.numQubits) {
      throw new Error(`Qubit index out of bounds: ${qubits}`);
    }
    const maskFirst = 1 << q0;
    const maskSecond = 1 << q1;
    const dimension = this.state.length;
    for (let base = 0; base < dimension; base += 1) {
      if ((base & maskFirst) !== 0 || (base & maskSecond) !== 0) {
        continue;
      }
      const indexFor = (bitFirst: number, bitSecond: number) =>
        base | (bitFirst ? maskFirst : 0) | (bitSecond ? maskSecond : 0);
      const i00 = indexFor(0, 0);
      const i01 = indexFor(0, 1);
      const i10 = indexFor(1, 0);
      const i11 = indexFor(1, 1);
      const original = [this.state[i00], this.state[i01], this.state[i10], this.state[i11]];
      const updated: Complex[] = [ZERO, ZERO, ZERO, ZERO].map(() => ZERO);
      for (let row = 0; row < 4; row += 1) {
        let value = complex(0, 0);
        for (let col = 0; col < 4; col += 1) {
          value = add(value, mul(matrix[row][col], original[col]));
        }
        updated[row] = value;
      }
      [this.state[i00], this.state[i01], this.state[i10], this.state[i11]] = updated;
    }
  }

  applyHadamard(qubit: number): void {
    this.applySingleQubit(hadamardMatrix, qubit);
  }

  applyPauliX(qubit: number): void {
    this.applySingleQubit(pauliX, qubit);
  }

  applyPauliY(qubit: number): void {
    this.applySingleQubit(pauliY, qubit);
  }

  applyPauliZ(qubit: number): void {
    this.applySingleQubit(pauliZ, qubit);
  }

  applyRotation(axis: 'x' | 'y' | 'z', qubit: number, theta: number): void {
    this.applySingleQubit(createRotationMatrix(axis, theta), qubit);
  }

  applyPhase(qubit: number, theta: number): void {
    const matrix = [
      [ONE, ZERO],
      [ZERO, complex(Math.cos(theta), Math.sin(theta))],
    ];
    this.applySingleQubit(matrix, qubit);
  }

  applyControlledPhase(control: number, target: number, theta: number): void {
    this.applyTwoQubit(controlledPhaseMatrix(theta), [control, target]);
  }

  applyCNOT(control: number, target: number): void {
    this.applyTwoQubit(cnotMatrix, [control, target]);
  }

  applyCZ(control: number, target: number): void {
    this.applyTwoQubit(czMatrix, [control, target]);
  }

  applySwap(a: number, b: number): void {
    this.applyTwoQubit(swapMatrix, [a, b]);
  }

  applyQFT2(targets: [number, number]): void {
    this.applyTwoQubit(qftMatrix2, [targets[1], targets[0]]);
  }

  runCircuit(operations: QuantumOperation[]): void {
    for (const op of operations) {
      switch (op.type) {
        case 'H':
          this.applyHadamard(op.target);
          break;
        case 'X':
          this.applyPauliX(op.target);
          break;
        case 'Y':
          this.applyPauliY(op.target);
          break;
        case 'Z':
          this.applyPauliZ(op.target);
          break;
        case 'RX':
          this.applyRotation('x', op.target, op.theta);
          break;
        case 'RY':
          this.applyRotation('y', op.target, op.theta);
          break;
        case 'RZ':
          this.applyRotation('z', op.target, op.theta);
          break;
        case 'PHASE':
          this.applyPhase(op.target, op.theta);
          break;
        case 'CPHASE':
          this.applyControlledPhase(op.control, op.target, op.theta);
          break;
        case 'CNOT':
          this.applyCNOT(op.control, op.target);
          break;
        case 'CZ':
          this.applyCZ(op.control, op.target);
          break;
        case 'SWAP':
          this.applySwap(op.targets[0], op.targets[1]);
          break;
        case 'QFT2':
          this.applyQFT2(op.targets);
          break;
        default:
          throw new Error(`Unsupported operation: ${(op as { type: string }).type}`);
      }
    }
  }

  sampleMeasurements(shots: number, options?: MeasurementOptions): MeasurementResult {
    if (!Number.isInteger(shots) || shots <= 0) {
      throw new Error('Number of shots must be a positive integer');
    }
    const { qubits, seed } = options ?? {};
    const probabilities = this.getProbabilities({ qubits });
    const outcomes = Object.keys(probabilities).sort();
    const weights = outcomes.map((key) => probabilities[key]);

    const totalProbability = weights.reduce((sum, value) => sum + value, 0);
    if (Math.abs(totalProbability - 1) > 1e-9) {
      throw new Error('State is not normalised');
    }

    const cumulative: number[] = [];
    weights.reduce((acc, value, index) => {
      cumulative[index] = acc + value;
      return cumulative[index];
    }, 0);

    const random = seed != null ? lcg(seed) : Math.random;
    const counts: Record<string, number> = Object.fromEntries(outcomes.map((key) => [key, 0]));

    for (let shot = 0; shot < shots; shot += 1) {
      const r = random();
      const idx = cumulative.findIndex((threshold) => r < threshold);
      const outcome = idx === -1 ? outcomes[outcomes.length - 1] : outcomes[idx];
      counts[outcome] += 1;
    }

    return { probabilities, counts };
  }
}

export const Gates = {
  hadamard: hadamardMatrix,
  pauliX,
  pauliY,
  pauliZ,
  identity2,
};

export const Rotations = {
  rx: (theta: number) => createRotationMatrix('x', theta),
  ry: (theta: number) => createRotationMatrix('y', theta),
  rz: (theta: number) => createRotationMatrix('z', theta),
};

export const TwoQubitGates = {
  cnot: cnotMatrix,
  cz: czMatrix,
  cphase: controlledPhaseMatrix,
  swap: swapMatrix,
  qft2: qftMatrix2,
};
