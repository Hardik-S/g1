import React, { useState, Suspense } from 'react';
import AppLauncher from './AppLauncher';
import './AppContainer.css';
import { getAppLoader } from '../apps/registry';
import AppErrorBoundary from './AppErrorBoundary';


const AppContainer = () => {
  const [currentView, setCurrentView] = useState('launcher'); // 'launcher' or 'app'
  const [currentApp, setCurrentApp] = useState(null);
  const [appLoadAttempt, setAppLoadAttempt] = useState(0);

  const handleLaunchApp = (app) => {
    setCurrentApp(app);
    setCurrentView('app');
    setAppLoadAttempt(0);
  };

  const handleBackToLauncher = () => {
    setCurrentView('launcher');
    setCurrentApp(null);
    setAppLoadAttempt(0);
  };

  const handleRetryLoadApp = () => {
    setAppLoadAttempt((attempt) => attempt + 1);
  };

  const renderCurrentApp = () => {
    if (!currentApp) return null;

    const LazyAppComponent = getAppLoader(currentApp.id);

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
      {currentView === 'launcher' ? (
        <AppLauncher 
          onLaunchApp={handleLaunchApp}
          currentView={currentView}
          onBackToLauncher={handleBackToLauncher}
        />
      ) : (
        <div className="app-view">
          <header className="app-header">
            <button 
              className="back-btn"
              onClick={handleBackToLauncher}
            >
              ← Back to Apps
            </button>
            <div className="app-title">
              <span className="app-icon">{currentApp?.icon}</span>
              <h1>{currentApp?.title}</h1>
            </div>
          </header>

          <main className="app-content">
            <AppErrorBoundary
              onRetry={handleRetryLoadApp}
              onBack={handleBackToLauncher}
            >
              <Suspense fallback={
                <div className="loading">
                  <div className="loading-spinner"></div>
                  <p>Loading app...</p>
                </div>
              }>
                {renderCurrentApp()}
              </Suspense>
            </AppErrorBoundary>
          </main>
        </div>
      )}
    </div>
  );
};

export default AppContainer;
