import { QuantumSimulator } from './simulator';

describe('QuantumSimulator', () => {
  const extractAmplitudes = (sim: QuantumSimulator) =>
    sim.getStateVector().map(({ re, im }) => [re, im]);

  it('applies single-qubit Hadamard gate', () => {
    const simulator = new QuantumSimulator(1);
    simulator.applyHadamard(0);
    const amplitudes = extractAmplitudes(simulator);
    expect(amplitudes[0][0]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(amplitudes[0][1]).toBeCloseTo(0, 5);
    expect(amplitudes[1][0]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(amplitudes[1][1]).toBeCloseTo(0, 5);
  });

  it('creates Bell state with H and CNOT', () => {
    const simulator = new QuantumSimulator(2);
    simulator.applyHadamard(0);
    simulator.applyCNOT(0, 1);
    const amplitudes = extractAmplitudes(simulator);
    const [amp00, amp01, amp10, amp11] = amplitudes;
    expect(amp00[0]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(amp11[0]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(amp01[0]).toBeCloseTo(0, 5);
    expect(amp10[0]).toBeCloseTo(0, 5);
    expect(amp00[1]).toBeCloseTo(0, 5);
    expect(amp11[1]).toBeCloseTo(0, 5);
  });

  it('supports RX, RY, and RZ rotations', () => {
    const simulator = new QuantumSimulator(1);
    simulator.applyRotation('x', 0, Math.PI);
    let amplitude = simulator.getAmplitude('1');
    expect(amplitude.re).toBeCloseTo(0, 5);
    expect(amplitude.im).toBeCloseTo(-1, 5);

    simulator.reset();
    simulator.applyRotation('y', 0, Math.PI);
    amplitude = simulator.getAmplitude('1');
    expect(amplitude.re).toBeCloseTo(1, 5);
    expect(amplitude.im).toBeCloseTo(0, 5);

    simulator.reset();
    simulator.applyRotation('z', 0, Math.PI / 2);
    amplitude = simulator.getAmplitude('0');
    expect(amplitude.re).toBeCloseTo(Math.cos(Math.PI / 4), 5);
    expect(amplitude.im).toBeCloseTo(-Math.sin(Math.PI / 4), 5);
  });

  it('executes multi-step GHZ circuit using runCircuit', () => {
    const simulator = new QuantumSimulator(3);
    simulator.runCircuit([
      { type: 'H', target: 0 },
      { type: 'CNOT', control: 0, target: 1 },
      { type: 'CNOT', control: 1, target: 2 },
    ]);

    const probabilities = simulator.getProbabilities();
    expect(probabilities['000']).toBeCloseTo(0.5, 5);
    expect(probabilities['111']).toBeCloseTo(0.5, 5);
    expect(probabilities['001']).toBeCloseTo(0, 5);
    expect(probabilities['010']).toBeCloseTo(0, 5);
    expect(probabilities['100']).toBeCloseTo(0, 5);
  });

  it('samples measurements with configurable shots', () => {
    const simulator = new QuantumSimulator(2);
    simulator.applyHadamard(0);
    simulator.applyCNOT(0, 1);

    const { counts, probabilities } = simulator.sampleMeasurements(2048, { seed: 123 });
    const expected = probabilities['00'];
    const totalShots = Object.values(counts).reduce((acc, value) => acc + value, 0);
    const frequency00 = counts['00'] / totalShots;
    const frequency11 = counts['11'] / totalShots;

    expect(expected).toBeCloseTo(0.5, 3);
    expect(Math.abs(frequency00 - expected)).toBeLessThan(0.03);
    expect(Math.abs(frequency11 - expected)).toBeLessThan(0.03);
    expect(counts['01']).toBe(0);
    expect(counts['10']).toBe(0);
  });

  it('resets state vector to |000⟩', () => {
    const simulator = new QuantumSimulator(3);
    simulator.applyHadamard(0);
    simulator.applyCNOT(0, 1);
    simulator.applyCNOT(1, 2);

    simulator.reset();

    const probabilities = simulator.getProbabilities();
    expect(probabilities['000']).toBe(1);
    expect(probabilities['001']).toBe(0);
    expect(probabilities['010']).toBe(0);
    expect(probabilities['100']).toBe(0);
  });

  it('generates expected amplitudes for a two-qubit QFT snippet', () => {
    const simulator = new QuantumSimulator(2);
    simulator.applyPauliX(0);

    simulator.runCircuit([
      { type: 'H', target: 1 },
      { type: 'CPHASE', control: 1, target: 0, theta: Math.PI / 2 },
      { type: 'H', target: 0 },
      { type: 'SWAP', targets: [0, 1] },
    ]);

    const amplitudes = extractAmplitudes(simulator);
    const expected = [
      [0.5, 0],
      [0, 0.5],
      [-0.5, 0],
      [0, -0.5],
    ];

    amplitudes.forEach(([re, im], index) => {
      expect(re).toBeCloseTo(expected[index][0], 4);
      expect(im).toBeCloseTo(expected[index][1], 4);
    });
  });

  it('applies predefined QFT matrix correctly', () => {
    const simulator = new QuantumSimulator(2);
    simulator.applyPauliX(1);
    simulator.applyQFT2([0, 1]);

    const probabilities = simulator.getProbabilities();
    const amplitudes = extractAmplitudes(simulator);
    const expected = [
      [0.5, 0],
      [-0.5, 0],
      [0.5, 0],
      [-0.5, 0],
    ];

    expect(probabilities['00']).toBeCloseTo(0.25, 5);
    expect(probabilities['01']).toBeCloseTo(0.25, 5);
    expect(probabilities['10']).toBeCloseTo(0.25, 5);
    expect(probabilities['11']).toBeCloseTo(0.25, 5);
    amplitudes.forEach(([re, im], index) => {
      expect(re).toBeCloseTo(expected[index][0], 5);
      expect(im).toBeCloseTo(expected[index][1], 5);
    });
  });
});
