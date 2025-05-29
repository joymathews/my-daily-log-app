import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import LogEvent from './pages/LogEvent.jsx';
import ViewEvents from './pages/ViewEvents.jsx';
import CognitoLogin from './components/CognitoLogin.jsx';
import CognitoRegister from './components/CognitoRegister.jsx';
import CognitoVerify from './components/CognitoVerify.jsx';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
import env from './config/env';

// Utility to get CognitoUserPool instance
function getUserPool() {
  const poolData = {
    UserPoolId: env.VITE_COGNITO_USER_POOL_ID,
    ClientId: env.VITE_COGNITO_USER_POOL_WEB_CLIENT_ID
  };
  return new CognitoUserPool(poolData);
}

function ProtectedRoute({ children }) {
  const userPool = getUserPool();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  useEffect(() => {
    const user = userPool.getCurrentUser();
    setIsAuthenticated(!!user);
  }, []);
  if (isAuthenticated === null) return null; // or a loader
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function Header({ onSignOut }) {
  return (
    <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
      <Link to="/">Home</Link>
      <Link to="/log">Log an Event</Link>
      <Link to="/view">View Events</Link>
      <button onClick={onSignOut} style={{ marginLeft: 'auto' }}>Sign Out</button>
    </nav>
  );
}

function HomeWithHeader({ onSignOut }) {
  return <><Header onSignOut={onSignOut} /><Home /></>;
}
function LogEventWithHeader({ onSignOut }) {
  return <><Header onSignOut={onSignOut} /><LogEvent /></>;
}
function ViewEventsWithHeader({ onSignOut }) {
  return <><Header onSignOut={onSignOut} /><ViewEvents /></>;
}

function App() {
  const userPool = getUserPool();
  const [isAuthenticated, setIsAuthenticated] = useState(!!userPool.getCurrentUser());
  const navigate = useNavigate();

  // Listen for login/logout changes
  useEffect(() => {
    const user = userPool.getCurrentUser();
    setIsAuthenticated(!!user);
  }, []);

  const handleSignOut = () => {
    const user = userPool.getCurrentUser();
    if (user) user.signOut();
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> :
        <CognitoLogin onLogin={() => { setIsAuthenticated(true); navigate('/'); }} />
      } />
      <Route path="/register" element={<CognitoRegister />} />
      <Route path="/verify" element={<CognitoVerify />} />
      <Route path="/" element={
        <ProtectedRoute>
          <HomeWithHeader onSignOut={handleSignOut} />
        </ProtectedRoute>
      } />
      <Route path="/log" element={
        <ProtectedRoute>
          <LogEventWithHeader onSignOut={handleSignOut} />
        </ProtectedRoute>
      } />
      <Route path="/view" element={
        <ProtectedRoute>
          <ViewEventsWithHeader onSignOut={handleSignOut} />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
