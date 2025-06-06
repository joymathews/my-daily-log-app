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
import './styles/Utilities.css';
import './styles/Pages.css';
import './styles/Animation.css';
import { COGNITO_ID_TOKEN } from './utils/cognitoToken';

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
    const hasToken = localStorage.getItem(COGNITO_ID_TOKEN);
    setIsAuthenticated(!!(user && hasToken));
  }, []);
  
  if (isAuthenticated === null) {
    return <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading...</p>
    </div>;
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Sign out button component to be used in the Header
function SignOutButton({ onSignOut }) {
  return (
    <button 
      onClick={onSignOut} 
      className="sign-out-button"
    >
      Sign Out
    </button>
  );
}

function App() {
  const userPool = getUserPool();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  // Only check authentication status on mount
  useEffect(() => {
    const user = userPool.getCurrentUser();
    const hasToken = localStorage.getItem(COGNITO_ID_TOKEN);
    setIsAuthenticated(!!(user && hasToken));
    if (user && hasToken) {
      fetchAndSetUserName();
    } else {
      setUserName('');
    }
  }, []);

  // Helper to fetch and set user's given_name
  const fetchAndSetUserName = () => {
    const user = userPool.getCurrentUser();
    if (user) {
      user.getSession((err, session) => {
        if (!err && session) {
          user.getUserAttributes((err, attributes) => {
            if (!err && attributes) {
              const givenNameAttr = attributes.find(attr => attr.getName() === 'given_name');
              setUserName(givenNameAttr ? givenNameAttr.getValue() : '');
            }
          });
        }
      });
    }
  };

  const handleSignOut = () => {
    const user = userPool.getCurrentUser();
    if (user) user.signOut();
    setIsAuthenticated(false);
    setUserName('');
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> :
        <CognitoLogin onLogin={() => {
          setIsAuthenticated(true);
          fetchAndSetUserName();
          navigate('/');
        }} />
      } />
      <Route path="/register" element={<CognitoRegister />} />
      <Route path="/verify" element={<CognitoVerify />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Home onSignOut={handleSignOut} userName={userName} />
        </ProtectedRoute>
      } />
      <Route path="/log" element={
        <ProtectedRoute>
          <LogEvent onSignOut={handleSignOut} />
        </ProtectedRoute>
      } />
      <Route path="/view" element={
        <ProtectedRoute>
          <ViewEvents onSignOut={handleSignOut} />
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
