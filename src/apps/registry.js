// App Registry - Central place to manage all 64 apps
export const APP_REGISTRY = {
  'day-switcher': {
    id: 'day-switcher',
    title: 'Day Switcher',
    description: 'Switch between days of the week with beautiful animations',
    icon: '📅',
    category: 'Utilities',
    component: null, // Will be lazy loaded
    path: '/apps/day-switcher',
    tags: ['react', 'ui', 'interactive'],
    version: '1.0.0',
    author: 'Hardik-S',
    created: '2024-01-01',
    featured: true
  },
  // Placeholder for future apps
  'n-pomodoro': {
    id: 'n-pomodoro',
    title: 'N-Pomodoro Timer',
    description: 'Customizable Pomodoro timer with N activities and deep space theme',
    icon: '🍅',
    category: 'Productivity',
    component: null,
    path: '/apps/n-pomodoro',
    tags: ['productivity', 'timer', 'space', 'customizable'],
    version: '1.0.0',
    author: 'Hardik-S',
    created: '2024-01-01',
    featured: true
  },
  'app-3': {
    id: 'app-3',
    title: 'Coming Soon',
    description: 'This app is under development',
    icon: '🚧',
    category: 'Development',
    component: null,
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
