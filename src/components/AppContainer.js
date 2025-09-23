import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  const [appLoadAttempt, setAppLoadAttempt] = useState(0);
  const lastLoadedAppIdRef = useRef(null);
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
      if (typeof window !== 'undefined') {
        window.location.replace('https://hardik-s.github.io/g1');
      }
    }
  }, [activeApp, normalizedPath]);

  const handleBackToLauncher = useCallback(() => {
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const activeAppId = activeApp ? activeApp.id : null;
    if (lastLoadedAppIdRef.current !== activeAppId) {
      lastLoadedAppIdRef.current = activeAppId;
      setAppLoadAttempt(0);
    }
  }, [activeApp]);

  const handleRetryLoad = useCallback(() => {
    setAppLoadAttempt((attempt) => attempt + 1);
  }, []);

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

    const attemptKey = `${activeApp.id}-${appLoadAttempt}`;

    return (
      <AppErrorBoundary
        key={attemptKey}
        onBack={handleBackToLauncher}
        onRetry={handleRetryLoad}
      >
        <LazyAppComponent
          onBack={handleBackToLauncher}
        />
      </AppErrorBoundary>
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
