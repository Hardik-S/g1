import React, { useState, Suspense } from 'react';
import AppLauncher from './AppLauncher';
import './AppContainer.css';

// Lazy load individual apps
const DaySwitcherApp = React.lazy(() => import('../apps/DaySwitcherApp'));
const NPomodoroApp = React.lazy(() => import('../apps/NPomodoroApp'));
const SnakeApp = React.lazy(() => import('../apps/SnakeApp'));
const PongApp = React.lazy(() => import('../apps/PongApp'));

const AppContainer = () => {
  const [currentView, setCurrentView] = useState('launcher'); // 'launcher' or 'app'
  const [currentApp, setCurrentApp] = useState(null);

  const handleLaunchApp = (app) => {
    setCurrentApp(app);
    setCurrentView('app');
  };

  const handleBackToLauncher = () => {
    setCurrentView('launcher');
    setCurrentApp(null);
  };

  const renderCurrentApp = () => {
    if (!currentApp) return null;

    switch (currentApp.id) {
      case 'day-switcher':
        return <DaySwitcherApp onBack={handleBackToLauncher} />;
      case 'n-pomodoro':
        return <NPomodoroApp onBack={handleBackToLauncher} />;
      case 'snake':
        return <SnakeApp onBack={handleBackToLauncher} />;
      case 'pong':
        return <PongApp onBack={handleBackToLauncher} />;
      default:
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
          <main className="app-content">
            <Suspense fallback={
              <div className="loading">
                <div className="loading-spinner"></div>
                <p>Loading app...</p>
              </div>
            }>
              {renderCurrentApp()}
            </Suspense>
          </main>
        </div>
      )}
    </div>
  );
};

export default AppContainer;
