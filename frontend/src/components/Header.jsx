import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Header.css';

function Header({ onSignOut }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('cognito_id_token');
  const handleSignOut = () => {
    // Always clear local storage tokens
    localStorage.removeItem('cognito_id_token');
    localStorage.removeItem('cognito_access_token');
    localStorage.removeItem('cognito_refresh_token');
    
    // If parent provided onSignOut callback, call it
    if (onSignOut) {
      onSignOut();
    } else {
      // Otherwise, navigate to login page
      navigate('/login');
    }
  };

  return (
    <header className="app-header">
      <div className="header-row">
        <h1 className="header-title">Daily Notes</h1>
        <nav className="main-nav">
          <ul className="nav-links">
            <li className={location.pathname === '/' ? 'active' : ''}>
              <Link to="/">Home</Link>
            </li>
            <li className={location.pathname === '/log' ? 'active' : ''}>
              <Link to="/log">Log Event</Link>
            </li>
            <li className={location.pathname === '/view' ? 'active' : ''}>
              <Link to="/view">View Events</Link>
            </li>
            {isAuthenticated ? (
              <li className="auth-link">
                <button className="sign-out-btn" onClick={handleSignOut}>
                  Sign Out
                </button>
              </li>
            ) : (
              <li className="auth-link">
                <Link to="/login">Login</Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;
