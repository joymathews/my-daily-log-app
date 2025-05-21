import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import LogEvent from './pages/LogEvent.jsx';
import ViewEvents from './pages/ViewEvents.jsx';
import CognitoLogin from './components/CognitoLogin.jsx';
import CognitoRegister from './components/CognitoRegister.jsx';
import CognitoVerify from './components/CognitoVerify.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/log" element={<LogEvent />} />
        <Route path="/view" element={<ViewEvents />} />
        <Route path="/login" element={<CognitoLogin />} />
        <Route path="/register" element={<CognitoRegister />} />
        <Route path="/verify" element={<CognitoVerify />} />
      </Routes>
    </Router>
  );
}

export default App;
