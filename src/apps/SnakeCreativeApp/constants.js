export const DIRECTIONS = {
  Up: { x: 0, y: -1 },
  Down: { x: 0, y: 1 },
  Left: { x: -1, y: 0 },
  Right: { x: 1, y: 0 },
  None: { x: 0, y: 0 }
};

export const MODE_DEFINITIONS = {
  classic: {
    id: 'classic',
    name: 'Classic',
    tagline: 'Walls and self-collisions end the run. Build combos and chase high scores.',
    speed: 6.5,
    wrap: false,
    allowSelfPass: false,
    hazards: false,
    players: 1
  },
  zen: {
    id: 'zen',
    name: 'Zen Loop',
    tagline: 'Infinite meditative flow. Wrap through walls and glide through your own trail.',
    speed: 5.5,
    wrap: true,
    allowSelfPass: true,
    hazards: false,
    players: 1
  },
  survival: {
    id: 'survival',
    name: 'Survival',
    tagline: 'Hazards sprout over time. Keep slithering while the arena tightens.',
    speed: 7,
    wrap: false,
    allowSelfPass: false,
    hazards: true,
    hazardIntervalMs: 7000,
    hazardLifetimeMs: 14000,
    shrinkIntervalMs: 18000,
    shrinkAmount: 1,
    minGridSize: 16,
    players: 1
  },
  multiplayer: {
    id: 'multiplayer',
    name: 'Multiplayer',
    tagline: 'Local competitive duel. Outlast your rival or outscore them with daring combos.',
    speed: 6.2,
    wrap: false,
    allowSelfPass: false,
    hazards: false,
    players: 2
  }
};

export const MODE_LIST = Object.values(MODE_DEFINITIONS);

export const DEFAULT_GRID_SIZE = 28;
export const DEFAULT_CANVAS_SIZE = 720;
export const MIN_CANVAS_SIZE = 320;

export const COMBO_WINDOW_MS = 3600;
export const COMBO_DECAY_RATE = 0.0012; // combo shrinks slowly when idle

export const FOOD_TYPES = {
  Primary: 'primary',
  Special: 'special',
  Zen: 'zen',
  Blitz: 'blitz'
};

export const KEY_BINDINGS = {
  arrows: {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight'
  },
  wasd: {
    up: 'w',
    down: 's',
    left: 'a',
    right: 'd'
  }
};

export const STORAGE_KEYS = {
  highScore: 'snake20::highscore',
  bestCombo: 'snake20::bestCombo'
};
