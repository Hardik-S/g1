import React, { useState, useEffect, useRef } from 'react';
import './NPomodoroApp.css';

const NPomodoroApp = ({ onBack }) => {
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activities, setActivities] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef(null);

  // Default presets
  const presets = {
    2: [
      { name: 'Work', duration: 25, color: '#667eea' },
      { name: 'Break', duration: 5, color: '#4ecdc4' }
    ],
    3: [
      { name: 'Work', duration: 25, color: '#667eea' },
      { name: 'Break', duration: 5, color: '#4ecdc4' },
      { name: 'Stretch', duration: 5, color: '#ff6b6b' }
    ],
    4: [
      { name: 'Work', duration: 25, color: '#667eea' },
      { name: 'Chore', duration: 10, color: '#96ceb4' },
      { name: 'Break', duration: 10, color: '#4ecdc4' },
      { name: 'Stretch', duration: 5, color: '#ff6b6b' }
    ]
  };

  useEffect(() => {
    if (activities.length === 0) {
      setActivities(presets[2]);
      setTimeLeft(presets[2][0].duration * 60);
    }
  }, [activities.length]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!isRunning) {
      return () => {};
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleActivityComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, currentActivityIndex]);

  const handleActivityComplete = () => {
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex(prev => prev + 1);
      setTimeLeft(activities[currentActivityIndex + 1].duration * 60);
    } else {
      setCycleCount(prev => prev + 1);
      setIsComplete(true);
      setIsRunning(false);
    }
  };

  const startTimer = () => {
    setIsRunning(true);
    setIsPaused(false);
    setIsComplete(false);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    setIsPaused(true);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentActivityIndex(0);
    setTimeLeft(activities[0].duration * 60);
    setIsComplete(false);
    setCycleCount(0);
  };

  const nextActivity = () => {
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex(prev => prev + 1);
      setTimeLeft(activities[currentActivityIndex + 1].duration * 60);
    }
  };

  const loadPreset = (presetKey) => {
    setActivities(presets[presetKey]);
    setCurrentActivityIndex(0);
    setTimeLeft(presets[presetKey][0].duration * 60);
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setCycleCount(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    const totalTime = activities[currentActivityIndex]?.duration * 60 || 1;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  const getStarCount = () => {
    const totalStars = 200;
    const progress = getProgressPercentage() / 100;
    return Math.floor(totalStars * (1 - progress));
  };

  return (
    <div className="n-pomodoro-app">
      <div className="space-background">
        <div className="stars" style={{ '--star-count': getStarCount() }}></div>
      </div>
      
      <div className="app-content">
        <header className="app-header">
          <button 
            className="config-btn"
            onClick={() => setShowConfig(!showConfig)}
          >
            ⚙️
          </button>
        </header>

        {showConfig ? (
          <div className="config-panel">
            <h3>Configure Activities</h3>
            <div className="presets">
              <h4>Quick Presets</h4>
              <div className="preset-buttons">
                {Object.keys(presets).map(key => (
                  <button 
                    key={key}
                    className="preset-btn"
                    onClick={() => loadPreset(parseInt(key))}
                  >
                    {key} Activities
                  </button>
                ))}
              </div>
            </div>
            <button 
              className="close-config-btn"
              onClick={() => setShowConfig(false)}
            >
              Close Configuration
            </button>
          </div>
        ) : (
          <div className="timer-interface">
            <div className="activity-info">
              <h2 className="current-activity">
                {activities[currentActivityIndex]?.name || 'No Activity'}
              </h2>
              <p className="activity-progress">
                Activity {currentActivityIndex + 1} of {activities.length}
              </p>
            </div>

            <div className="timer-display">
              <div className="time-circle">
                <div className="time-text">{formatTime(timeLeft)}</div>
                <div className="progress-ring">
                  <svg className="progress-ring-svg" width="200" height="200">
                    <circle
                      className="progress-ring-circle"
                      stroke={activities[currentActivityIndex]?.color || '#667eea'}
                      strokeWidth="8"
                      fill="transparent"
                      r="96"
                      cx="100"
                      cy="100"
                      style={{
                        strokeDasharray: `${2 * Math.PI * 96}`,
                        strokeDashoffset: `${2 * Math.PI * 96 * (1 - getProgressPercentage() / 100)}`
                      }}
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="timer-controls">
              {!isRunning && !isPaused && (
                <button className="control-btn start-btn" onClick={startTimer}>
                  ▶️ Start
                </button>
              )}
              {isRunning && (
                <button className="control-btn pause-btn" onClick={pauseTimer}>
                  ⏸️ Pause
                </button>
              )}
              {isPaused && (
                <button className="control-btn resume-btn" onClick={startTimer}>
                  ▶️ Resume
                </button>
              )}
              <button className="control-btn reset-btn" onClick={resetTimer}>
                🔄 Reset
              </button>
              {currentActivityIndex < activities.length - 1 && (
                <button className="control-btn next-btn" onClick={nextActivity}>
                  ⏭️ Next
                </button>
              )}
            </div>

            {isComplete && (
              <div className="completion-message">
                <h3>🎉 Cycle Complete!</h3>
                <p>Completed {cycleCount} cycle{cycleCount !== 1 ? 's' : ''}</p>
                <button className="control-btn" onClick={resetTimer}>
                  Start New Cycle
                </button>
              </div>
            )}

            <div className="activity-list">
              <h4>Activities in this cycle:</h4>
              <div className="activities">
                {activities.map((activity, index) => (
                  <div 
                    key={index}
                    className={`activity-item ${index === currentActivityIndex ? 'active' : ''} ${index < currentActivityIndex ? 'completed' : ''}`}
                    style={{ '--activity-color': activity.color }}
                  >
                    <span className="activity-name">{activity.name}</span>
                    <span className="activity-duration">{activity.duration}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NPomodoroApp;
