import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppContainer from './components/AppContainer';
import './App.css';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/*" element={<AppContainer />} />
      </Routes>
    </div>
  );
}

export default App;
