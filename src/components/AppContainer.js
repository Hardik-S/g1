import React, { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLauncher from './AppLauncher';
import './AppContainer.css';
import { getAllApps, getAppLoader } from '../apps/registry';
import AppErrorBoundary from './AppErrorBoundary';

const normalizePath = (path) => {
  if (!path) {
    return '/';
  }

  const trimmed = path.replace(/\/+$/, '');
  return trimmed.length === 0 ? '/' : trimmed;
};

const AppContainer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const apps = useMemo(() => getAllApps(), []);
  const normalizedPath = useMemo(
    () => normalizePath(location.pathname),
    [location.pathname]
  );

  const activeApp = useMemo(() => {
    if (normalizedPath === '/') {
      return null;
    }


    return apps.find((app) => normalizePath(app.path) === normalizedPath) || null;
  }, [apps, normalizedPath]);

  const LazyAppComponent = useMemo(() => {
    if (!activeApp) {
      return null;
    }

    return getAppLoader(activeApp.id);
  }, [activeApp]);

  useEffect(() => {
    if (!activeApp && normalizedPath !== '/') {
      navigate('/', { replace: true });
    }
  }, [activeApp, navigate, normalizedPath]);

  const handleBackToLauncher = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const renderActiveApp = () => {
    if (!activeApp) {
      return null;
    }

    if (!LazyAppComponent) {
      return (
        <div className="app-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-icon">🚧</div>
            <h2>App Coming Soon</h2>
            <p>This app is under development and will be available soon!</p>
            <button
              className="back-btn"
              onClick={handleBackToLauncher}
              type="button"
            >
              ← Back to Apps
            </button>
          </div>
        </div>
      );
    }

    const attemptKey = `${currentApp.id}-${appLoadAttempt}`;

    return (
      <LazyAppComponent
        key={attemptKey}
        onBack={handleBackToLauncher}
      />
    );
  };

  return (
    <div className="app-container">
      {!activeApp ? (
        <AppLauncher />
      ) : (
        <div className="app-view">
          <header className="app-header">
            <button
              className="back-btn"
              onClick={handleBackToLauncher}
              type="button"
            >
              ← Back to Apps
            </button>
            <div className="app-title">
              <span className="app-icon">{activeApp.icon}</span>
              <h1>{activeApp.title}</h1>
            </div>
          </header>

          <main className="app-content">
            <Suspense
              fallback={(
                <div className="loading">
                  <div className="loading-spinner"></div>
                  <p>Loading app...</p>
                </div>
              )}
            >
              {renderActiveApp()}
            </Suspense>
          </main>
        </div>
      )}
    </div>
  );
};

export default AppContainer;
