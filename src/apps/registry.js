import React from 'react';

// App Registry - Central place to manage all 64 apps
export const APP_REGISTRY = {
  'day-switcher': {
    id: 'day-switcher',
    title: 'Day Switcher',
    description: 'Switch between days of the week with beautiful animations',
    icon: '📅',
    category: 'Utilities',
    component: null, // Will be lazy loaded
    loader: () => import('./DaySwitcherApp'),
    path: '/apps/day-switcher',
    tags: ['react', 'ui', 'interactive'],
    version: '1.0.0',
    author: 'Hardik-S',
    created: '2024-01-01',
    featured: true
  },
  catpad: {
    id: 'catpad',
    title: 'CatPad',
    description: 'Feline-themed notepad with cloud sync across every browser.',
    icon: '😺',
    category: 'Productivity',
    component: null,
    loader: () => import('./CatPadApp'),
    path: '/apps/catpad',
    tags: ['notes', 'editor', 'sync', 'cats'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2024-06-01',
    featured: true,
  },
  'zen-do': {
    id: 'zen-do',
    title: 'Zen Do',
    description: 'Minimalist to-do garden with weekly buckets, focus mode, and gist sync.',
    icon: '🌿',
    category: 'Productivity',
    component: null,
    loader: () => import('./ZenDoApp'),
    path: '/apps/zen-do',
    tags: ['tasks', 'productivity', 'gist', 'drag-and-drop'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2024-10-05',
    featured: true,
  },
  'cat-typing-speed-test': {
    id: 'cat-typing-speed-test',
    title: 'Cat Typing Speed Test',
    description: 'Sprint through cat-themed sentences to measure WPM, CPM, and accuracy.',
    icon: '⌨️',
    category: 'Education',
    component: null,
    loader: () => import('./CatTypingSpeedTestApp'),
    path: '/apps/cat-typing-speed-test',
    tags: ['typing', 'speed', 'practice', 'cats'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2024-09-23',
    featured: true,
  },
  // Placeholder for future apps
  'n-pomodoro': {
    id: 'n-pomodoro',
    title: 'N-Pomodoro Timer',
    description: 'Customizable Pomodoro timer with N activities and deep space theme',
    icon: '🍅',
    category: 'Productivity',
    component: null,
    loader: () => import('./NPomodoroApp'),
    path: '/apps/n-pomodoro',
    tags: ['productivity', 'timer', 'space', 'customizable'],
    version: '1.0.0',
    author: 'Hardik-S',
    created: '2024-01-01',
    featured: true
  },
  'snake': {
    id: 'snake',
    title: 'Snake Game',
    description: 'Classic Snake game with keyboard controls and modern design',
    icon: '🐍',
    category: 'Games',
    component: null,
    loader: () => import('./SnakeApp'),
    path: '/apps/snake',
    tags: ['game', 'classic', 'keyboard', 'arcade'],
    version: '1.0.0',
    author: 'Hardik-S',
    created: '2024-01-01',
    featured: true
  },
  'hexa-snake-bee': {
    id: 'hexa-snake-bee',
    title: 'Hexa-Snake (Bee Edition)',
    description: 'Guide a bee through a honeycomb hex-grid and collect golden nectar',
    icon: '🐝',
    category: 'Games',
    component: null,
    loader: () => import('./HexaSnakeApp'),
    path: '/apps/hexa-snake',
    tags: ['game', 'python', 'pygame', 'hex', 'arcade'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2024-03-01',
    featured: true
  },
  'pong': {
    id: 'pong',
    title: 'Neon Pong',
    description: 'Fast-paced neon Pong with solo and versus modes plus session history',
    icon: '🏓',
    category: 'Games',
    component: null,
    loader: () => import('./PongApp'),
    path: '/apps/pong',
    tags: ['game', 'arcade', 'canvas', 'retro'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2024-01-01',
    featured: true
  },
  'pong-ring': {
    id: 'pong-ring',
    title: 'Pong Ring',
    description: 'Circular quartz arena pong with marble glow and solo/versus modes',
    icon: '🪩',
    category: 'Games',
    component: null,
    loader: () => import('./PongRingApp'),
    path: '/apps/pong-ring',
    tags: ['game', 'canvas', 'futuristic'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2024-05-01',
    featured: true
  },
  'sudoku-coffee': {
    id: 'sudoku-coffee',
    title: 'Sudoku Roast',
    description: 'A cozy coffeehouse Sudoku with handcrafted generator, solver, and notes',
    icon: '☕',
    category: 'Games',
    component: null,
    loader: () => import('./SudokuApp'),
    path: '/apps/sudoku-coffee',
    tags: ['game', 'puzzle', 'canvas', 'tailwind'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2024-04-01',
    featured: true
  },
  chess: {
    id: 'chess',
    title: 'Chessboard Summit',
    description: 'Challenge a friend locally or face Stockfish with adjustable strength.',
    icon: '♟️',
    category: 'Games',
    component: null,
    loader: () => import('./ChessApp'),
    path: '/apps/chess',
    tags: ['game', 'board', 'stockfish', 'ai'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2024-05-01',
    featured: true
  },
  'zen-go': {
    id: 'zen-go',
    title: 'Zen Go',
    description: 'Play 9×9 Go against a lightweight GNU Go engine with rank presets and handicaps.',
    icon: '⚫',
    category: 'Games',
    component: null,
    loader: () => import('./ZenGoApp'),
    path: '/apps/zen-go',
    tags: ['game', 'board', 'go', 'ai', 'wasm'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2025-09-22',
    featured: true,
  },
  'catnap-leap': {
    id: 'catnap-leap',
    title: 'CatNap Leap',
    description: 'Guide a drowsy cat through floating pillows, chase scores, and sip dreamy powerups.',
    icon: '🐱',
    category: 'Games',
    component: null,
    loader: () => import('./CatNapLeapApp'),
    path: '/apps/catnap-leap',
    tags: ['game', 'canvas', 'flappy', 'cat'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2024-06-01',
    featured: true
  },
  'cache-lab': {
    id: 'cache-lab',
    title: 'Cache Lab',
    description: 'Interactive cache memory learning lab with mapping, replacement, hierarchy, and assessments.',
    icon: '💾',
    category: 'Education',
    component: null,
    loader: () => import('./CacheLabApp'),
    path: '/cache-lab',
    tags: ['cache', 'education', 'react', 'interactive'],
    version: '1.0.0',
    author: 'OpenAI Assistant',
    created: '2024-07-01',
    featured: true
  },
  'app-3': {
    id: 'app-3',
    title: 'Coming Soon',
    description: 'This app is under development',
    icon: '🚧',
    category: 'Development',
    component: null,
    loader: null,
    path: '/apps/app-3',
    tags: ['coming-soon'],
    version: '0.0.0',
    author: 'Hardik-S',
    created: '2024-01-01',
    featured: false,
    disabled: true
  },
  // Add more apps here as we build them...
};

// Categories for organizing apps
export const APP_CATEGORIES = {
  'Utilities': { icon: '🔧', color: '#667eea' },
  'Games': { icon: '🎮', color: '#ff6b6b' },
  'Tools': { icon: '🛠️', color: '#4ecdc4' },
  'Creative': { icon: '🎨', color: '#45b7d1' },
  'Education': { icon: '📚', color: '#96ceb4' },
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
