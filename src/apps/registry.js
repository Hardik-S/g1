import { APP_METADATA } from './registry/apps';
import { createLazyLoader } from './registry/loaders';

const DEFAULT_AUTHOR = 'Hardik-s';

const withDefaults = (app) => ({
  ...app,
  author: app.author ?? DEFAULT_AUTHOR,
});

export const APP_REGISTRY = APP_METADATA.reduce((registry, app) => {
  const appEntry = withDefaults(app);
  registry[appEntry.id] = appEntry;
  return registry;
}, {});

export const APP_CATEGORIES = {
  Utilities: { icon: '🔧', color: '#667eea' },
  Games: { icon: '🎮', color: '#ff6b6b' },
  Tools: { icon: '🛠️', color: '#4ecdc4' },
  Creative: { icon: '🎨', color: '#45b7d1' },
  Education: { icon: '📚', color: '#96ceb4' },
  Exploration: { icon: '🪐', color: '#7f9cff' },
  Productivity: { icon: '⚡', color: '#feca57' },
  Development: { icon: '💻', color: '#ff9ff3' },
  Entertainment: { icon: '🎭', color: '#54a0ff' },
};

export const getAppsByCategory = (category) => {
  return Object.values(APP_REGISTRY).filter((app) => app.category === category);
};

export const getFeaturedApps = () => {
  return Object.values(APP_REGISTRY).filter((app) => app.featured);
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
  return createLazyLoader(getAppById(id));
};
