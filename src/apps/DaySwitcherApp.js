import React, { useState } from 'react';
import './DaySwitcherApp.css';

const daysOfWeek = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 
  'Thursday', 'Friday', 'Saturday'
];

const DaySwitcherApp = ({ onBack }) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const switchToNextDay = () => {
    setCurrentDayIndex((prevIndex) => 
      (prevIndex + 1) % daysOfWeek.length
    );
  };

  const switchToPreviousDay = () => {
    setCurrentDayIndex((prevIndex) => 
      prevIndex === 0 ? daysOfWeek.length - 1 : prevIndex - 1
    );
  };

  const switchToRandomDay = () => {
    const randomIndex = Math.floor(Math.random() * daysOfWeek.length);
    setCurrentDayIndex(randomIndex);
  };

  return (
    <div className="day-switcher-app">
      <div className="app-container">
        <div className="day-display">
          <h2 className="current-day">{daysOfWeek[currentDayIndex]}</h2>
          <p className="day-number">Day {currentDayIndex + 1} of 7</p>
        </div>

        <div className="button-container">
          <button 
            className="btn btn-previous" 
            onClick={switchToPreviousDay}
          >
            ← Previous Day
          </button>
          
          <button 
            className="btn btn-next" 
            onClick={switchToNextDay}
          >
            Next Day →
          </button>
        </div>

        <button 
          className="btn btn-random" 
          onClick={switchToRandomDay}
        >
          🎲 Random Day
        </button>

        <div className="all-days">
          <h3>All Days:</h3>
          <div className="days-list">
            {daysOfWeek.map((day, index) => (
              <span 
                key={day}
                className={`day-item ${index === currentDayIndex ? 'active' : ''}`}
                onClick={() => setCurrentDayIndex(index)}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DaySwitcherApp;
