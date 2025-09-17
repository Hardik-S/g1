export const AXIAL_DIRECTIONS = {
  north: { q: 0, r: -1 },
  northEast: { q: 1, r: -1 },
  southEast: { q: 1, r: 0 },
  south: { q: 0, r: 1 },
  southWest: { q: -1, r: 1 },
  northWest: { q: -1, r: 0 },
};

export const KEY_DIRECTION_MAP = {
  w: 'north',
  ArrowUp: 'north',
  d: 'northEast',
  ArrowRight: 'southEast',
  s: 'south',
  ArrowDown: 'south',
  a: 'southWest',
  ArrowLeft: 'northWest',
};

export const getNextPosition = (position, directionName) => {
  const direction = AXIAL_DIRECTIONS[directionName];
  if (!direction) {
    throw new Error(`Unknown direction: ${directionName}`);
  }
  return {
    q: position.q + direction.q,
    r: position.r + direction.r,
  };
};

export const isOppositeDirection = (dirA, dirB) => {
  if (!dirA || !dirB) return false;
  const first = AXIAL_DIRECTIONS[dirA];
  const second = AXIAL_DIRECTIONS[dirB];
  if (!first || !second) return false;
  return first.q + second.q === 0 && first.r + second.r === 0;
};

export const detectCollision = (snake, directionName, bounds) => {
  const nextHead = getNextPosition(snake[0], directionName);
  const outOfBounds =
    nextHead.q < 0 ||
    nextHead.q >= bounds.width ||
    nextHead.r < 0 ||
    nextHead.r >= bounds.height;
  const hitsSelf = snake.some(
    (segment) => segment.q === nextHead.q && segment.r === nextHead.r
  );

  return {
    nextHead,
    outOfBounds,
    hitsSelf,
    collided: outOfBounds || hitsSelf,
  };
};

export const moveSnake = (snake, directionName, options = {}) => {
  const { grow = false } = options;
  const { nextHead } = detectCollision(snake, directionName, {
    width: Number.POSITIVE_INFINITY,
    height: Number.POSITIVE_INFINITY,
  });
  const updated = [nextHead, ...snake];
  if (!grow) {
    updated.pop();
  }
  return updated;
};

export const updateSpeedInterval = (
  baseInterval,
  increment,
  minimumInterval,
  level
) => {
  const next = baseInterval - increment * level;
  return next < minimumInterval ? minimumInterval : next;
};

export const calculateScore = (currentScore, collectedHoney) =>
  collectedHoney ? currentScore + 1 : currentScore;
