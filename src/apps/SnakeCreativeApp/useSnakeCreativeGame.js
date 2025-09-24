import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DIRECTIONS,
  MODE_DEFINITIONS,
  DEFAULT_GRID_SIZE,
  COMBO_WINDOW_MS,
  COMBO_DECAY_RATE,
  FOOD_TYPES,
  STORAGE_KEYS
} from './constants';
import { getTheme } from './themePresets';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrap = (value, size) => {
  if (value < 0) {
    return size + (value % size);
  }
  if (value >= size) {
    return value % size;
  }
  return value;
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randFloat = (min, max) => min + Math.random() * (max - min);

const storageAvailable = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readRecord = (key) => {
  if (!storageAvailable) {
    return {};
  }
  try {
    const value = window.localStorage.getItem(key);
    if (!value) {
      return {};
    }
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Failed to read storage', error);
    return {};
  }
};

const writeRecordValue = (key, modeId, value) => {
  if (!storageAvailable) {
    return;
  }
  try {
    const current = readRecord(key);
    const next = { ...current, [modeId]: value };
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch (error) {
    console.warn('Failed to persist storage', error);
  }
};

const FOOD_CONFIG = {
  [FOOD_TYPES.Primary]: {
    score: 10,
    growth: 1,
    comboBoost: 0,
    ttl: null
  },
  [FOOD_TYPES.Special]: {
    score: 24,
    growth: 2,
    comboBoost: 1,
    ttl: 10000
  },
  [FOOD_TYPES.Zen]: {
    score: 14,
    growth: 1,
    comboBoost: 0,
    ttl: null
  },
  [FOOD_TYPES.Blitz]: {
    score: 8,
    growth: 0,
    comboBoost: 2,
    ttl: 6000
  }
};

const createSnake = ({ id, name, start, direction, colorIndex }) => {
  const segments = [
    { x: start.x, y: start.y },
    { x: start.x - direction.x, y: start.y - direction.y },
    { x: start.x - direction.x * 2, y: start.y - direction.y * 2 }
  ];
  return {
    id,
    name,
    segments,
    prevSegments: segments.map((segment) => ({ ...segment })),
    direction: { ...direction },
    pendingDirection: { ...direction },
    colorIndex,
    alive: true,
    growth: 0,
    score: 0,
    combo: 1,
    maxCombo: 1,
    comboTimer: 0,
    lastFoodAt: null,
    burstTimer: 0
  };
};

const occupiedKey = (x, y) => `${x}:${y}`;

const createEngine = ({ mode, theme }) => {
  const gridSize = DEFAULT_GRID_SIZE;
  const center = Math.floor(gridSize / 2);

  const snakes = [];
  if (mode.players === 2) {
    snakes.push(
      createSnake({
        id: 'alpha',
        name: 'Player One',
        start: { x: Math.floor(gridSize * 0.25), y: center },
        direction: DIRECTIONS.Right,
        colorIndex: 0
      })
    );
    snakes.push(
      createSnake({
        id: 'beta',
        name: 'Player Two',
        start: { x: Math.floor(gridSize * 0.75), y: center },
        direction: DIRECTIONS.Left,
        colorIndex: 2
      })
    );
  } else {
    snakes.push(
      createSnake({
        id: 'solo',
        name: 'Aurora',
        start: { x: Math.floor(gridSize * 0.35), y: center },
        direction: DIRECTIONS.Right,
        colorIndex: 0
      })
    );
  }

  const engine = {
    mode,
    theme,
    gridSize,
    boundsMargin: 0,
    snakes,
    foods: [],
    hazards: [],
    particles: [],
    pulses: [],
    elapsed: 0,
    stepDuration: 1000 / mode.speed,
    accumulator: 0,
    hazardTimer: mode.hazardIntervalMs ?? null,
    shrinkTimer: mode.shrinkIntervalMs ?? null,
    comboDecay: COMBO_DECAY_RATE,
    blitzCooldown: 0,
    lastScoreDelta: 0,
    status: 'idle',
    message: 'Press any direction or hit start to play'
  };

  return engine;
};

const findFreeCell = (engine) => {
  const { gridSize, boundsMargin } = engine;
  const occupied = new Set();
  engine.snakes.forEach((snake) => {
    snake.segments.forEach((segment) => {
      occupied.add(occupiedKey(segment.x, segment.y));
    });
  });
  engine.hazards.forEach((hazard) => {
    occupied.add(occupiedKey(hazard.x, hazard.y));
  });
  engine.foods.forEach((food) => {
    occupied.add(occupiedKey(food.x, food.y));
  });

  const candidates = [];
  for (let y = boundsMargin; y < gridSize - boundsMargin; y += 1) {
    for (let x = boundsMargin; x < gridSize - boundsMargin; x += 1) {
      const key = occupiedKey(x, y);
      if (!occupied.has(key)) {
        candidates.push({ x, y });
      }
    }
  }

  if (!candidates.length) {
    return null;
  }

  return pick(candidates);
};

const spawnFood = (engine, explicitType) => {
  const position = findFreeCell(engine);
  if (!position) {
    return;
  }
  let type = explicitType;
  if (!type) {
    const roll = Math.random();
    if (engine.mode.id === 'zen') {
      type = Math.random() > 0.65 ? FOOD_TYPES.Zen : FOOD_TYPES.Primary;
    } else if (roll > 0.88) {
      type = FOOD_TYPES.Special;
    } else if (roll > 0.72 && engine.blitzCooldown <= 0) {
      type = FOOD_TYPES.Blitz;
      engine.blitzCooldown = 8000;
    } else {
      type = FOOD_TYPES.Primary;
    }
  }

  const config = FOOD_CONFIG[type];
  engine.foods.push({
    id: `food-${Date.now()}-${Math.random()}`,
    ...position,
    type,
    score: config.score,
    growth: config.growth,
    comboBoost: config.comboBoost,
    ttl: config.ttl,
    age: 0
  });
};

const spawnInitialFood = (engine) => {
  const foodCount = engine.mode.players === 2 ? 3 : 2;
  for (let i = 0; i < foodCount; i += 1) {
    spawnFood(engine);
  }
};

const spawnHazard = (engine) => {
  const cell = findFreeCell(engine);
  if (!cell) {
    return;
  }
  const lifetime = engine.mode.hazardLifetimeMs ?? 10000;
  engine.hazards.push({
    id: `hazard-${Date.now()}-${Math.random()}`,
    ...cell,
    ttl: lifetime,
    maxTtl: lifetime
  });
};

const spawnBurst = (engine, snake, palette) => {
  const body = snake.segments;
  for (let i = 0; i < body.length; i += Math.max(1, Math.floor(body.length / 12))) {
    const segment = body[i];
    engine.particles.push({
      x: segment.x + randFloat(-0.1, 0.1),
      y: segment.y + randFloat(-0.1, 0.1),
      vx: randFloat(-0.8, 0.8),
      vy: randFloat(-0.8, 0.8),
      life: randFloat(420, 780),
      maxLife: randFloat(420, 780),
      color: pick(palette.particle)
    });
  }
};

const spawnPulse = (engine, segment, palette) => {
  engine.pulses.push({
    x: segment.x,
    y: segment.y,
    age: 0,
    duration: 800,
    color: palette.snakePulse
  });
};

const updateParticles = (engine, delta) => {
  engine.particles = engine.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * (delta / 1000),
      y: particle.y + particle.vy * (delta / 1000),
      life: particle.life - delta
    }))
    .filter((particle) => particle.life > 0);
};

const updatePulses = (engine, delta) => {
  engine.pulses = engine.pulses
    .map((pulse) => ({
      ...pulse,
      age: pulse.age + delta
    }))
    .filter((pulse) => pulse.age < pulse.duration);
};

const updateHazards = (engine, delta) => {
  if (!engine.mode.hazards) {
    return;
  }
  if (engine.hazardTimer != null) {
    engine.hazardTimer -= delta;
    if (engine.hazardTimer <= 0) {
      spawnHazard(engine);
      engine.hazardTimer = engine.mode.hazardIntervalMs ?? 7000;
    }
  }

  engine.hazards = engine.hazards
    .map((hazard) => ({
      ...hazard,
      ttl: hazard.ttl - delta
    }))
    .filter((hazard) => hazard.ttl > 0);
};

const updateFoods = (engine, delta) => {
  engine.foods = engine.foods
    .map((food) => ({
      ...food,
      age: food.age + delta,
      ttl: food.ttl != null ? food.ttl - delta : null
    }))
    .filter((food) => food.ttl == null || food.ttl > 0);

  const desired = engine.mode.players === 2 ? 3 : 2;
  while (engine.foods.length < desired) {
    spawnFood(engine);
  }

  if (engine.blitzCooldown > 0) {
    engine.blitzCooldown -= delta;
  }
};

const setSnakeDirection = (snake, direction, allowSelfPass) => {
  if (!snake.alive) {
    return;
  }
  if (direction.x === 0 && direction.y === 0) {
    return;
  }
  const current = snake.direction;
  if (!allowSelfPass && current.x === -direction.x && current.y === -direction.y) {
    return;
  }
  snake.pendingDirection = { ...direction };
};

const resolveCollisions = (engine, snake, nextHead) => {
  const { gridSize, mode, boundsMargin } = engine;
  let headX = nextHead.x;
  let headY = nextHead.y;

  if (mode.wrap) {
    headX = wrap(headX, gridSize);
    headY = wrap(headY, gridSize);
  }

  if (!mode.wrap) {
    if (headX < boundsMargin || headX >= gridSize - boundsMargin || headY < boundsMargin || headY >= gridSize - boundsMargin) {
      return { collision: true, type: 'wall' };
    }
  }

  if (mode.wrap) {
    headX = wrap(clamp(headX, -gridSize, gridSize * 2), gridSize);
    headY = wrap(clamp(headY, -gridSize, gridSize * 2), gridSize);
  }

  const hazards = engine.hazards;
  const hazardHit = hazards.find((hazard) => hazard.x === headX && hazard.y === headY);
  if (hazardHit) {
    return { collision: true, type: 'hazard', hazard: hazardHit };
  }

  const occupied = new Set();
  engine.snakes.forEach((candidate) => {
    candidate.segments.forEach((segment, index) => {
      const key = occupiedKey(segment.x, segment.y);
      if (candidate === snake && index === candidate.segments.length - 1 && snake.growth <= 0) {
        return;
      }
      occupied.add(key);
    });
  });

  const headKey = occupiedKey(headX, headY);
  if (occupied.has(headKey)) {
    if (mode.allowSelfPass) {
      return { collision: false, x: headX, y: headY };
    }
    return { collision: true, type: 'self' };
  }

  return { collision: false, x: headX, y: headY };
};

const advanceSnake = (engine, snake) => {
  if (!snake.alive) {
    return;
  }

  snake.prevSegments = snake.segments.map((segment) => ({ ...segment }));

  if (snake.pendingDirection) {
    snake.direction = { ...snake.pendingDirection };
  }

  const head = snake.segments[0];
  const nextHead = {
    x: head.x + snake.direction.x,
    y: head.y + snake.direction.y
  };

  const result = resolveCollisions(engine, snake, nextHead);

  if (result.collision) {
    if (engine.mode.allowSelfPass && result.type === 'self') {
      // gracefully pass through self in zen mode
    } else {
      snake.alive = false;
      spawnBurst(engine, snake, engine.theme.palette);
      return;
    }
  }

  const newHead = { x: result.x ?? nextHead.x, y: result.y ?? nextHead.y };
  snake.segments.unshift(newHead);

  if (snake.growth > 0) {
    snake.growth -= 1;
  } else {
    snake.segments.pop();
  }

  const foodIndex = engine.foods.findIndex((food) => food.x === newHead.x && food.y === newHead.y);
  if (foodIndex >= 0) {
    const food = engine.foods.splice(foodIndex, 1)[0];
    snake.growth += food.growth;
    const now = engine.elapsed;
    if (snake.lastFoodAt != null && now - snake.lastFoodAt < COMBO_WINDOW_MS) {
      snake.combo += 1 + food.comboBoost;
    } else {
      snake.combo = 1 + food.comboBoost;
    }
    snake.comboTimer = COMBO_WINDOW_MS;
    snake.maxCombo = Math.max(snake.maxCombo, snake.combo);
    snake.lastFoodAt = now;

    const comboMultiplier = 1 + (snake.combo - 1) * 0.35;
    const deltaScore = Math.round(food.score * comboMultiplier);
    snake.score += deltaScore;
    engine.lastScoreDelta = deltaScore;
    spawnPulse(engine, newHead, engine.theme.palette);
    spawnFood(engine);
    return { ate: true, food };
  }

  return { ate: false };
};

const reduceComboTimers = (engine, delta) => {
  engine.snakes.forEach((snake) => {
    if (!snake.alive) {
      return;
    }
    if (snake.comboTimer > 0) {
      snake.comboTimer = Math.max(0, snake.comboTimer - delta);
      if (snake.comboTimer === 0) {
        snake.combo = Math.max(1, snake.combo - 1);
      }
    } else if (snake.combo > 1) {
      const reduction = delta * engine.comboDecay;
      if (reduction >= 1) {
        snake.combo = Math.max(1, Math.floor(snake.combo - reduction));
      }
    }
  });
};

const aggregateScoreboard = (engine) => {
  const totalScore = engine.snakes.reduce((sum, snake) => sum + snake.score, 0);
  const longest = engine.snakes.reduce((max, snake) => Math.max(max, snake.segments.length), 0);
  const bestCombo = engine.snakes.reduce((max, snake) => Math.max(max, snake.maxCombo), 1);
  const aliveSnakes = engine.snakes.filter((snake) => snake.alive);

  return {
    score: totalScore,
    length: longest,
    combo: aliveSnakes.reduce((max, snake) => Math.max(max, snake.combo), 1),
    bestCombo,
    players: engine.snakes.map((snake) => ({
      id: snake.id,
      name: snake.name,
      score: snake.score,
      combo: snake.combo,
      maxCombo: snake.maxCombo,
      length: snake.segments.length,
      alive: snake.alive
    })),
    allDead: aliveSnakes.length === 0
  };
};

const ensureEngine = (engineRef, deps) => {
  if (!engineRef.current) {
    engineRef.current = createEngine(deps);
    spawnInitialFood(engineRef.current);
  }
  return engineRef.current;
};

const lerp = (start, end, t) => start + (end - start) * t;

const drawBackground = (ctx, engine, canvasSize) => {
  const { palette, background } = engine.theme;
  const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
  const stops = palette.backgroundGradient ?? [palette.background, palette.background];
  stops.forEach((color, index) => {
    gradient.addColorStop(index / (stops.length - 1 || 1), color);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  ctx.save();
  ctx.globalAlpha = 0.45;
  const pulse = (Math.sin(engine.elapsed / (background.pulseSpeed ?? 4000) * Math.PI * 2) + 1) / 2;
  ctx.fillStyle = palette.gridAccent;
  ctx.fillRect(0, canvasSize * (0.2 + pulse * 0.1), canvasSize, 1);
  ctx.fillRect(0, canvasSize * (0.8 - pulse * 0.1), canvasSize, 1);
  ctx.restore();
};

const drawGrid = (ctx, engine, canvasSize) => {
  const { palette } = engine.theme;
  const { gridSize, boundsMargin } = engine;
  const cellSize = canvasSize / gridSize;

  ctx.save();
  ctx.strokeStyle = palette.gridPrimary;
  ctx.lineWidth = 1;
  for (let x = 0; x <= gridSize; x += 1) {
    ctx.globalAlpha = x % 2 === 0 ? 0.3 : 0.15;
    const xPos = Math.round(x * cellSize) + 0.5;
    ctx.beginPath();
    ctx.moveTo(xPos, 0);
    ctx.lineTo(xPos, canvasSize);
    ctx.stroke();
  }

  for (let y = 0; y <= gridSize; y += 1) {
    ctx.globalAlpha = y % 2 === 0 ? 0.3 : 0.15;
    const yPos = Math.round(y * cellSize) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, yPos);
    ctx.lineTo(canvasSize, yPos);
    ctx.stroke();
  }
  ctx.restore();

  if (boundsMargin > 0) {
    ctx.save();
    ctx.strokeStyle = palette.borderGlow;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.6;
    const inset = boundsMargin * cellSize;
    ctx.strokeRect(inset + 2, inset + 2, canvasSize - inset * 2 - 4, canvasSize - inset * 2 - 4);
    ctx.restore();
  }
};

const drawFoods = (ctx, engine, canvasSize) => {
  const { palette } = engine.theme;
  const { gridSize } = engine;
  const cellSize = canvasSize / gridSize;

  engine.foods.forEach((food) => {
    const centerX = (food.x + 0.5) * cellSize;
    const centerY = (food.y + 0.5) * cellSize;
    const radius = cellSize * 0.35 + Math.sin(food.age / 300) * cellSize * 0.05;
    ctx.save();
    const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.35, centerX, centerY, radius);
    let color = palette.foodPrimary;
    if (food.type === FOOD_TYPES.Special) {
      color = palette.foodSpecial;
    } else if (food.type === FOOD_TYPES.Zen) {
      color = palette.foodZen;
    }
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    if (food.type === FOOD_TYPES.Blitz) {
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = palette.foodGlow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });
};

const drawHazards = (ctx, engine, canvasSize) => {
  const { palette } = engine.theme;
  const { gridSize } = engine;
  const cellSize = canvasSize / gridSize;

  engine.hazards.forEach((hazard) => {
    const progress = 1 - hazard.ttl / hazard.maxTtl;
    const alpha = 0.55 + 0.45 * Math.sin(progress * Math.PI * 2);
    const x = hazard.x * cellSize;
    const y = hazard.y * cellSize;
    ctx.save();
    ctx.fillStyle = palette.hazard;
    ctx.globalAlpha = alpha;
    ctx.fillRect(x, y, cellSize, cellSize);
    ctx.strokeStyle = palette.hazardGlow;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    ctx.restore();
  });
};

const drawSnake = (ctx, engine, snake, canvasSize, progress, floatingScoreEl) => {
  if (!snake.segments.length) {
    return;
  }
  const { palette } = engine.theme;
  const { gridSize } = engine;
  const cellSize = canvasSize / gridSize;

  const bodyColors = palette.snakeBody;

  snake.segments.forEach((segment, index) => {
    const previous = snake.prevSegments[index] ?? segment;
    const interpX = lerp(previous.x, segment.x, progress);
    const interpY = lerp(previous.y, segment.y, progress);
    const x = interpX * cellSize;
    const y = interpY * cellSize;
    const radius = Math.max(cellSize * 0.42 - index * 0.4, cellSize * 0.24);

    ctx.save();
    ctx.translate(x + cellSize / 2, y + cellSize / 2);
    ctx.beginPath();
    ctx.fillStyle = index === 0 ? palette.snakeHead : bodyColors[(index + snake.colorIndex) % bodyColors.length];
    ctx.globalAlpha = index === 0 ? 1 : Math.max(0.2, 0.9 - index * 0.05);
    ctx.shadowBlur = index === 0 ? 18 : 8;
    ctx.shadowColor = palette.borderGlow;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (index === 0 && floatingScoreEl) {
      floatingScoreEl.style.transform = `translate(${(interpX + 0.5) * cellSize}px, ${(interpY - 0.25) * cellSize}px)`;
    }
  });
};

const drawParticles = (ctx, engine, canvasSize) => {
  const { gridSize } = engine;
  const cellSize = canvasSize / gridSize;
  engine.particles.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc((particle.x + 0.5) * cellSize, (particle.y + 0.5) * cellSize, cellSize * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
};

const drawPulses = (ctx, engine, canvasSize) => {
  const { gridSize } = engine;
  const cellSize = canvasSize / gridSize;
  engine.pulses.forEach((pulse) => {
    const t = pulse.age / pulse.duration;
    const radius = cellSize * (0.6 + t * 1.1);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.4 - t * 0.4);
    ctx.strokeStyle = pulse.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc((pulse.x + 0.5) * cellSize, (pulse.y + 0.5) * cellSize, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
};

const draw = (engine, canvas, progress, floatingScoreEl) => {
  let ctx = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    return;
  }
  if (!ctx) {
    return;
  }
  const canvasSize = canvas.width;
  drawBackground(ctx, engine, canvasSize);
  drawGrid(ctx, engine, canvasSize);
  drawHazards(ctx, engine, canvasSize);
  drawFoods(ctx, engine, canvasSize);
  engine.snakes.forEach((snake) => drawSnake(ctx, engine, snake, canvasSize, progress, floatingScoreEl));
  drawPulses(ctx, engine, canvasSize);
  drawParticles(ctx, engine, canvasSize);
};

const ensureCanvasSize = (canvas, size) => {
  if (!canvas) {
    return;
  }
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
};

const useAudioEngine = (enabled, theme) => {
  const audioContextRef = useRef(null);

  const getContext = useCallback(() => {
    if (!enabled || typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
      return null;
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }
    return audioContextRef.current;
  }, [enabled]);

  const playTone = useCallback(
    (frequency, duration = 0.18, gain = 0.18) => {
      const context = getContext();
      if (!context) {
        return;
      }
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = gain;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.stop(context.currentTime + duration);
    },
    [getContext]
  );

  const playEvent = useCallback(
    (event) => {
      if (!enabled) {
        return;
      }
      const { audio } = theme;
      if (event === 'food') {
        playTone(audio.foodFrequency ?? 440, 0.18, 0.22);
      } else if (event === 'special') {
        playTone(audio.specialFrequency ?? 620, 0.22, 0.25);
      } else if (event === 'hazard') {
        playTone(audio.hazardFrequency ?? 200, 0.26, 0.2);
      } else if (event === 'start') {
        playTone(audio.baseFrequency ?? 260, 0.12, 0.18);
      }
    },
    [enabled, theme, playTone]
  );

  return { playEvent, getContext };
};

export const useSnakeCreativeGame = ({
  themeId,
  modeId,
  canvasSize,
  floatingScoreRef,
  audioEnabled
}) => {
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const mode = useMemo(() => MODE_DEFINITIONS[modeId] ?? MODE_DEFINITIONS.classic, [modeId]);

  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const statusRef = useRef('idle');
  const scoreboardRef = useRef(null);

  const [state, setState] = useState(() => {
    const highScores = readRecord(STORAGE_KEYS.highScore);
    const comboScores = readRecord(STORAGE_KEYS.bestCombo);
    return {
      status: 'idle',
      score: 0,
      combo: 1,
      bestCombo: comboScores[mode.id] ?? 1,
      highScore: highScores[mode.id] ?? 0,
      length: 3,
      mode: mode.id,
      theme: theme.id,
      players: [],
      lastFood: null,
      message: 'Press start or move to begin'
    };
  });

  const { playEvent, getContext } = useAudioEngine(audioEnabled, theme);

  const syncScoreboard = useCallback(
    (engine) => {
      const summary = aggregateScoreboard(engine);
      const highScores = readRecord(STORAGE_KEYS.highScore);
      const comboScores = readRecord(STORAGE_KEYS.bestCombo);
      const previous = scoreboardRef.current;
      scoreboardRef.current = summary;
      const highScore = Math.max(summary.score, highScores[mode.id] ?? 0);
      const bestCombo = Math.max(summary.bestCombo, comboScores[mode.id] ?? 1);
      if (summary.score > (highScores[mode.id] ?? 0)) {
        writeRecordValue(STORAGE_KEYS.highScore, mode.id, summary.score);
      }
      if (summary.bestCombo > (comboScores[mode.id] ?? 1)) {
        writeRecordValue(STORAGE_KEYS.bestCombo, mode.id, summary.bestCombo);
      }

      setState((prev) => ({
        ...prev,
        score: summary.score,
        combo: summary.combo,
        bestCombo,
        highScore,
        length: summary.length,
        players: summary.players,
        lastFood: engine.lastFood,
        status: statusRef.current
      }));

      return previous;
    },
    [mode.id]
  );

  const stopLoop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    lastTimestampRef.current = null;
  }, []);

  const renderFrame = useCallback(
    (timestamp) => {
      const canvas = canvasRef.current;
      const floatingScoreEl = floatingScoreRef?.current ?? null;
      if (!canvas) {
        return;
      }
      const engine = ensureEngine(engineRef, { mode, theme });
      if (canvas.width !== canvasSize) {
        ensureCanvasSize(canvas, canvasSize);
      }
      if (statusRef.current !== 'running') {
        draw(engine, canvas, 0, floatingScoreEl);
        return;
      }
      if (lastTimestampRef.current == null) {
        lastTimestampRef.current = timestamp;
      }
      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;
      engine.elapsed += delta;
      engine.accumulator += delta;

      const stepDuration = engine.stepDuration;
      let ateFood = false;
      while (engine.accumulator >= stepDuration) {
        engine.accumulator -= stepDuration;
        engine.snakes.forEach((snake) => {
          const result = advanceSnake(engine, snake);
          if (result?.ate) {
            ateFood = true;
            engine.lastFood = result.food;
            if (result.food.type === FOOD_TYPES.Special) {
              playEvent('special');
            } else {
              playEvent('food');
            }
          }
        });
        reduceComboTimers(engine, stepDuration);
        updateHazards(engine, stepDuration);
        updateFoods(engine, stepDuration);
        updateParticles(engine, stepDuration);
        updatePulses(engine, stepDuration);
      }

      if (!ateFood && delta > 0) {
        updateParticles(engine, delta);
        updatePulses(engine, delta);
        updateHazards(engine, delta);
        updateFoods(engine, delta);
      }

      const summary = aggregateScoreboard(engine);
      if (summary.allDead && mode.id !== 'zen') {
        statusRef.current = 'game-over';
        engine.status = 'game-over';
        stopLoop();
      }
      draw(engine, canvas, engine.accumulator / stepDuration, floatingScoreEl);
      syncScoreboard(engine);
      if (statusRef.current === 'running') {
        animationRef.current = requestAnimationFrame(renderFrame);
      }
    },
    [canvasSize, mode, playEvent, stopLoop, syncScoreboard, theme, floatingScoreRef]
  );

  const startLoop = useCallback(() => {
    if (animationRef.current) {
      return;
    }
    animationRef.current = requestAnimationFrame(renderFrame);
  }, [renderFrame]);

  const reset = useCallback(
    ({ preserveAudio } = {}) => {
      stopLoop();
      engineRef.current = createEngine({ mode, theme });
      spawnInitialFood(engineRef.current);
      engineRef.current.status = 'idle';
      statusRef.current = 'idle';
      ensureCanvasSize(canvasRef.current, canvasSize);
      draw(engineRef.current, canvasRef.current, 0, floatingScoreRef?.current ?? null);
      syncScoreboard(engineRef.current);
      setState((prev) => ({
        ...prev,
        status: 'idle',
        message: 'Press start or move to begin',
        theme: theme.id,
        mode: mode.id
      }));
      if (!preserveAudio && audioEnabled) {
        getContext()?.suspend?.();
      }
    },
    [audioEnabled, canvasSize, getContext, mode, stopLoop, syncScoreboard, theme, floatingScoreRef]
  );

  useEffect(() => {
    reset({ preserveAudio: true });
  }, [mode, theme, canvasSize, reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      ensureCanvasSize(canvas, canvasSize);
      const engine = ensureEngine(engineRef, { mode, theme });
      draw(engine, canvas, 0, floatingScoreRef?.current ?? null);
    }
  }, [canvasSize, mode, theme, floatingScoreRef]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  const start = useCallback(() => {
    const engine = ensureEngine(engineRef, { mode, theme });
    engine.status = 'running';
    statusRef.current = 'running';
    playEvent('start');
    startLoop();
    setState((prev) => ({ ...prev, status: 'running', message: 'Glide!' }));
    getContext()?.resume?.();
  }, [getContext, mode, playEvent, startLoop, theme]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') {
      return;
    }
    statusRef.current = 'paused';
    stopLoop();
    setState((prev) => ({ ...prev, status: 'paused', message: 'Paused' }));
  }, [stopLoop]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') {
      return;
    }
    statusRef.current = 'running';
    startLoop();
    setState((prev) => ({ ...prev, status: 'running', message: 'Glide!' }));
  }, [startLoop]);

  const setDirection = useCallback(
    (snakeId, direction) => {
      const engine = ensureEngine(engineRef, { mode, theme });
      const snake = engine.snakes.find((candidate) => candidate.id === snakeId) ?? engine.snakes[0];
      if (!snake) {
        return;
      }
      setSnakeDirection(snake, direction, mode.allowSelfPass);
      if (statusRef.current === 'idle') {
        start();
      }
    },
    [mode, start, theme]
  );

  const togglePause = useCallback(() => {
    if (statusRef.current === 'running') {
      pause();
    } else if (statusRef.current === 'paused') {
      resume();
    }
  }, [pause, resume]);

  return {
    canvasRef,
    state,
    actions: {
      start,
      pause,
      resume,
      reset,
      togglePause,
      setDirection
    }
  };
};
