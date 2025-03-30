import React from 'react';
import Publisher from './Publisher';
import { Routes, Route } from 'react-router';
import HomePage from './HomePage';

function App() {
  <Routes>
    <Route path="/p" element={<Publisher />} />
  </Routes>

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to the React App</h1>
        <HomePage/>
      </header>
    </div>
  );
}

export default App; 