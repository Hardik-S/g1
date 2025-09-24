import React from 'react';

export const appLoaderCache = new Map();

export const resolveAppLoader = (app) => {
  if (!app) {
    return null;
  }

  if (typeof app.loader === 'function') {
    return app.loader;
  }

  return null;
};

export const normalizeModule = (module) => {
  if (module && typeof module === 'object' && 'default' in module) {
    return module;
  }

  return { default: module };
};

export const createLazyLoader = (appDef) => {
  if (!appDef) {
    return null;
  }

  if (appLoaderCache.has(appDef.id)) {
    return appLoaderCache.get(appDef.id);
  }

  const loader = resolveAppLoader(appDef);

  if (!loader) {
    return null;
  }

  const lazyComponent = React.lazy(() => loader().then(normalizeModule));
  appLoaderCache.set(appDef.id, lazyComponent);
  return lazyComponent;
};
