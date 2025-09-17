import {
  AXIAL_DIRECTIONS,
  KEY_DIRECTION_MAP,
  getNextPosition,
  isOppositeDirection,
  detectCollision,
  moveSnake,
  updateSpeedInterval,
  calculateScore,
} from '../logic/hexSnakeLogic';

describe('Hexa Snake logic helpers', () => {
  it('provides six axial directions', () => {
    expect(Object.keys(AXIAL_DIRECTIONS)).toHaveLength(6);
    expect(Object.values(AXIAL_DIRECTIONS)).toContainEqual({ q: 0, r: -1 });
    expect(Object.values(AXIAL_DIRECTIONS)).toContainEqual({ q: 1, r: 0 });
  });

  it('maps control keys to the six axial directions', () => {
    const uniqueDirections = new Set(Object.values(KEY_DIRECTION_MAP));
    expect(uniqueDirections.size).toBe(6);
    expect(KEY_DIRECTION_MAP.w).toBe('north');
    expect(KEY_DIRECTION_MAP.ArrowLeft).toBe('northWest');
  });

  it('computes the next axial position in every direction', () => {
    const origin = { q: 5, r: 5 };
    const expected = {
      north: { q: 5, r: 4 },
      northEast: { q: 6, r: 4 },
      southEast: { q: 6, r: 5 },
      south: { q: 5, r: 6 },
      southWest: { q: 4, r: 6 },
      northWest: { q: 4, r: 5 },
    };

    Object.keys(AXIAL_DIRECTIONS).forEach((direction) => {
      expect(getNextPosition(origin, direction)).toEqual(expected[direction]);
    });
  });

  it('detects opposite directions correctly', () => {
    expect(isOppositeDirection('north', 'south')).toBe(true);
    expect(isOppositeDirection('northEast', 'southWest')).toBe(true);
    expect(isOppositeDirection('north', 'northEast')).toBe(false);
  });

  it('grows the snake body when honey is collected', () => {
    const snake = [
      { q: 3, r: 3 },
      { q: 3, r: 4 },
      { q: 3, r: 5 },
    ];
    const grown = moveSnake(snake, 'north', { grow: true });
    expect(grown).toHaveLength(snake.length + 1);
    expect(grown[0]).toEqual({ q: 3, r: 2 });
    expect(grown.slice(1)).toEqual(snake);
  });

  it('identifies collisions with walls and self', () => {
    const snake = [
      { q: 0, r: 0 },
      { q: 0, r: 1 },
      { q: 0, r: 2 },
    ];

    const bounds = { width: 4, height: 4 };

    const wallCollision = detectCollision(snake, 'northWest', bounds);
    expect(wallCollision.outOfBounds).toBe(true);
    expect(wallCollision.collided).toBe(true);

    const selfCollision = detectCollision(
      [{ q: 2, r: 2 }, { q: 2, r: 3 }, { q: 3, r: 3 }, { q: 3, r: 2 }],
      'southEast',
      bounds
    );
    expect(selfCollision.hitsSelf).toBe(true);
  });

  it('increments score and accelerates over time', () => {
    let score = 0;
    let interval = 0.55;
    const increment = 0.03;
    const minInterval = 0.16;

    for (let i = 0; i < 5; i += 1) {
      score = calculateScore(score, true);
      interval = updateSpeedInterval(0.55, increment, minInterval, i + 1);
    }

    expect(score).toBe(5);
    expect(interval).toBeLessThan(0.55);
    expect(interval).toBeGreaterThan(minInterval - 1e-6);
  });
});
