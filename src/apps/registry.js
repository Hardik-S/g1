import React from 'react';

const DEFAULT_AUTHOR = 'Hardik-s';
const VERSION_CONSTRAINTS = {
  majors: [1, 2, 3, 4, 5],
  minorPrefixes: [0, 1],
  minorSuffixes: [2, 3, 4, 5, 6, 7, 8],
  patch: '00',
};

const pickRandom = (values) => values[Math.floor(Math.random() * values.length)];

const generateRandomVersion = () => {
  const major = pickRandom(VERSION_CONSTRAINTS.majors);
  const minorPrefix = pickRandom(VERSION_CONSTRAINTS.minorPrefixes);
  const minorSuffix = pickRandom(VERSION_CONSTRAINTS.minorSuffixes);
  const minor = `${minorPrefix}${minorSuffix}`;
  return `${major}.${minor}.${VERSION_CONSTRAINTS.patch}`;
};

const withDefaults = (app) => ({
  ...app,
  version: generateRandomVersion(),
  author: DEFAULT_AUTHOR,
});

// App Registry - Central place to manage all 64 apps
export const APP_REGISTRY = {
  'day-switcher': withDefaults({
    id: 'day-switcher',
    title: 'Day Switcher',
    description: 'Switch between days of the week with beautiful animations',
    icon: '📅',
    category: 'Utilities',
    component: null, // Will be lazy loaded
    loader: () => import('./DaySwitcherApp'),
    path: '/apps/day-switcher',
    tags: ['react', 'ui', 'interactive'],
    created: '2025-09-16',
    featured: true
  }),
  catpad: withDefaults({
    id: 'catpad',
    title: 'CatPad',
    description: 'Feline-themed notepad with cloud sync across every browser.',
    icon: '😺',
    category: 'Productivity',
    component: null,
    loader: () => import('./CatPadApp'),
    path: '/apps/catpad',
    tags: ['notes', 'editor', 'sync', 'cats'],
    created: '2025-09-21',
    featured: true,
  }),
  'cat-connect-four': withDefaults({
    id: 'cat-connect-four',
    title: 'Cat Connect Four',
    description: 'Drop custom paws against friends or café cats with animated sparkle wins.',
    icon: '🐾',
    category: 'Games',
    component: null,
    loader: () => import('./CatConnectFourApp'),
    path: '/apps/cat-connect-four',
    tags: ['game', 'board', 'connect-four', 'cats'],
    created: '2025-09-22',
    featured: true,
  }),
  'zen-do': withDefaults({
    id: 'zen-do',
    title: 'Zen Do',
    description: 'Minimalist to-do garden with weekly buckets, focus mode, and gist sync.',
    icon: '🌿',
    category: 'Productivity',
    component: null,
    loader: () => import('./ZenDoApp'),
    path: '/apps/zen-do',
    tags: ['tasks', 'productivity', 'gist', 'drag-and-drop'],
    created: '2025-09-21',
    featured: true,
  }),
  'cat-typing-speed-test': withDefaults({
    id: 'cat-typing-speed-test',
    title: 'Cat Typing Speed Test',
    description: 'Sprint through cat-themed sentences to measure WPM, CPM, and accuracy.',
    icon: '⌨️',
    category: 'Education',
    component: null,
    loader: () => import('./CatTypingSpeedTestApp'),
    path: '/apps/cat-typing-speed-test',
    tags: ['typing', 'speed', 'practice', 'cats'],
    created: '2025-09-21',
    featured: true,
  }),
  'quantum-playground': withDefaults({
    id: 'quantum-playground',
    title: 'Quantum Playground',
    description: 'Design circuits, run a four-qubit simulator, and visualize state-vector measurements.',
    icon: '⚛️',
    category: 'Education',
    component: null,
    loader: () => import('./quantum-playground'),
    path: '/apps/quantum-playground',
    tags: ['quantum', 'simulator', 'visualization', 'education'],
    created: '2025-09-22',
    featured: true,
  }),
  // Placeholder for future apps
  'n-pomodoro': withDefaults({
    id: 'n-pomodoro',
    title: 'N-Pomodoro Timer',
    description: 'Customizable Pomodoro timer with N activities and deep space theme',
    icon: '🍅',
    category: 'Productivity',
    component: null,
    loader: () => import('./NPomodoroApp'),
    path: '/apps/n-pomodoro',
    tags: ['productivity', 'timer', 'space', 'customizable'],
    created: '2025-09-16',
    featured: true
  }),
  'snake': withDefaults({
    id: 'snake',
    title: 'Snake Game',
    description: 'Classic Snake game with keyboard controls and modern design',
    icon: '🐍',
    category: 'Games',
    component: null,
    loader: () => import('./SnakeApp'),
    path: '/apps/snake',
    tags: ['game', 'classic', 'keyboard', 'arcade'],
    created: '2025-09-17',
    featured: true
  }),
  'hexa-snake-bee': withDefaults({
    id: 'hexa-snake-bee',
    title: 'Hexa-Snake (Bee Edition)',
    description: 'Guide a bee through a honeycomb hex-grid and collect golden nectar',
    icon: '🐝',
    category: 'Games',
    component: null,
    loader: () => import('./HexaSnakeApp'),
    path: '/apps/hexa-snake',
    tags: ['game', 'python', 'pygame', 'hex', 'arcade'],
    created: '2025-09-17',
    featured: true
  }),
  'pong': withDefaults({
    id: 'pong',
    title: 'Neon Pong',
    description: 'Fast-paced neon Pong with solo and versus modes plus session history',
    icon: '🏓',
    category: 'Games',
    component: null,
    loader: () => import('./PongApp'),
    path: '/apps/pong',
    tags: ['game', 'arcade', 'canvas', 'retro'],
    created: '2025-09-17',
    featured: true
  }),
  'pong-ring': withDefaults({
    id: 'pong-ring',
    title: 'Pong Ring',
    description: 'Circular quartz arena pong with marble glow and solo/versus modes',
    icon: '🪩',
    category: 'Games',
    component: null,
    loader: () => import('./PongRingApp'),
    path: '/apps/pong-ring',
    tags: ['game', 'canvas', 'futuristic'],
    created: '2025-09-17',
    featured: true
  }),
  'sudoku-coffee': withDefaults({
    id: 'sudoku-coffee',
    title: 'Sudoku Roast',
    description: 'A cozy coffeehouse Sudoku with handcrafted generator, solver, and notes',
    icon: '☕',
    category: 'Games',
    component: null,
    loader: () => import('./SudokuApp'),
    path: '/apps/sudoku-coffee',
    tags: ['game', 'puzzle', 'canvas', 'tailwind'],
    created: '2025-09-17',
    featured: true
  }),
  'zen-go': withDefaults({
    id: 'zen-go',
    title: 'Zen Go',
    description: 'Play 9×9 Go against a lightweight GNU Go engine with rank presets and handicaps.',
    icon: '⚫',
    category: 'Games',
    component: null,
    loader: () => import('./ZenGoApp'),
    path: '/apps/zen-go',
    tags: ['game', 'board', 'go', 'ai', 'wasm'],
    created: '2025-09-22',
    featured: true,
  }),
  cosmos: withDefaults({
    id: 'cosmos',
    title: 'Cosmos Simulator',
    description: 'Navigate a scaled solar system with Newtonian physics, trails, and teleport controls.',
    icon: '🪐',
    category: 'Exploration',
    component: null,
    loader: () => import('./CosmosApp'),
    path: '/apps/cosmos',
    tags: ['three.js', 'simulation', 'space', 'physics'],
    created: '2025-09-22',
    featured: true,
  }),
  'catnap-leap': withDefaults({

    id: 'catnap-leap',
    title: 'CatNap Leap',
    description: 'Guide a drowsy cat through floating pillows, chase scores, and sip dreamy powerups.',
    icon: '🐱',
    category: 'Games',
    component: null,
    loader: () => import('./CatNapLeapApp'),
    path: '/apps/catnap-leap',
    tags: ['game', 'canvas', 'flappy', 'cat'],
    created: '2025-09-21',
    featured: true
  }),
  'cache-lab': withDefaults({
    id: 'cache-lab',
    title: 'Cache Lab',
    description: 'Interactive cache memory learning lab with mapping, replacement, hierarchy, and assessments.',
    icon: '💾',
    category: 'Education',
    component: null,
    loader: () => import('./CacheLabApp'),
    path: '/cache-lab',
    tags: ['cache', 'education', 'react', 'interactive'],
    created: '2025-09-21',
    featured: true
  }),
  'app-3': withDefaults({
    id: 'app-3',
    title: 'Coming Soon',
    description: 'This app is under development',
    icon: '🚧',
    category: 'Development',
    component: null,
    loader: null,
    path: '/apps/app-3',
    tags: ['coming-soon'],
    created: '2025-09-16',
    featured: false,
    disabled: true
  }),
  // Add more apps here as we build them...
};

// Categories for organizing apps
export const APP_CATEGORIES = {
  'Utilities': { icon: '🔧', color: '#667eea' },
  'Games': { icon: '🎮', color: '#ff6b6b' },
  'Tools': { icon: '🛠️', color: '#4ecdc4' },
  'Creative': { icon: '🎨', color: '#45b7d1' },
  'Education': { icon: '📚', color: '#96ceb4' },
  'Exploration': { icon: '🪐', color: '#7f9cff' },
  'Productivity': { icon: '⚡', color: '#feca57' },
  'Development': { icon: '💻', color: '#ff9ff3' },
  'Entertainment': { icon: '🎭', color: '#54a0ff' }
};

const appLoaderCache = new Map();

const resolveAppLoader = (app) => {
  if (!app) {
    return null;
  }

  if (typeof app.loader === 'function') {
    return app.loader;
  }

  if (typeof app.importPath === 'string' && app.importPath.length > 0) {
    const importPath = app.importPath;
    return () => import(importPath);
  }

  return null;
};

const normalizeModule = (module) => {
  if (module && typeof module === 'object' && 'default' in module) {
    return module;
  }

  return { default: module };
};

// Helper functions
export const getAppsByCategory = (category) => {
  return Object.values(APP_REGISTRY).filter(app => app.category === category);
};

export const getFeaturedApps = () => {
  return Object.values(APP_REGISTRY).filter(app => app.featured);
};

export const getAppById = (id) => {
  return APP_REGISTRY[id] || null;
};

export const getAllApps = () => {
  return Object.values(APP_REGISTRY);
};

export const getAppsCount = () => {
  return Object.keys(APP_REGISTRY).length;
};

export const getAppLoader = (id) => {
  if (appLoaderCache.has(id)) {
    return appLoaderCache.get(id);
  }

  const app = getAppById(id);
  const loader = resolveAppLoader(app);

  if (!loader) {
    return null;
  }

  const lazyComponent = React.lazy(() => loader().then(normalizeModule));
  appLoaderCache.set(id, lazyComponent);
  return lazyComponent;
};
