import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LogEvent from './pages/LogEvent';
import ViewEvents from './pages/ViewEvents';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/log" element={<LogEvent />} />
        <Route path="/view" element={<ViewEvents />} />
      </Routes>
    </Router>
  );
}

export default App;
