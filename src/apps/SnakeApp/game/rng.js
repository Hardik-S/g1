const DEFAULT_SEED = () => `${Date.now()}-${Math.random()}`;

const cyrb128 = (str) => {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = (h2 ^ Math.imul(h1 ^ k, 597399067)) >>> 0;
    h2 = (h3 ^ Math.imul(h2 ^ k, 2869860233)) >>> 0;
    h3 = (h4 ^ Math.imul(h3 ^ k, 951274213)) >>> 0;
    h4 = (h1 ^ Math.imul(h4 ^ k, 2716044179)) >>> 0;
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067) >>> 0;
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233) >>> 0;
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213) >>> 0;
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179) >>> 0;
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, h2, h3, h4];
};

const sfc32 = (a, b, c, d) => {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
};

export class DeterministicRng {
  constructor(seed = DEFAULT_SEED(), offset = 0) {
    this.seed = String(seed);
    const [a, b, c, d] = cyrb128(this.seed);
    this._generator = sfc32(a, b, c, d);
    this.offset = 0;
    if (offset > 0) {
      this.advance(offset);
    }
  }

  next() {
    const value = this._generator();
    this.offset += 1;
    return value;
  }

  nextInt(maxExclusive) {
    if (maxExclusive <= 0) {
      throw new Error('maxExclusive must be greater than 0');
    }
    return Math.floor(this.next() * maxExclusive);
  }

  nextRange(min, max) {
    if (max <= min) {
      throw new Error('max must be greater than min');
    }
    return min + this.next() * (max - min);
  }

  advance(steps) {
    for (let i = 0; i < steps; i++) {
      this._generator();
    }
    this.offset += steps;
  }

  getState() {
    return { seed: this.seed, offset: this.offset };
  }

  clone() {
    return new DeterministicRng(this.seed, this.offset);
  }

  static fromState(state) {
    if (!state || typeof state.seed === 'undefined') {
      throw new Error('Invalid RNG state');
    }
    return new DeterministicRng(state.seed, state.offset ?? 0);
  }
}

export const createDeterministicRng = (seed, offset = 0) =>
  new DeterministicRng(seed, offset);
