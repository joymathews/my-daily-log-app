import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { COGNITO_ID_TOKEN, clearCognitoStorage } from '../utils/cognitoToken';
import '../styles/Header.css';

function Header({ onSignOut }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem(COGNITO_ID_TOKEN);
  const [menuOpen, setMenuOpen] = useState(false);
  const handleSignOut = () => {
    clearCognitoStorage();
    // If parent provided onSignOut callback, call it
    if (onSignOut) {
      onSignOut();
    } else {
      // Otherwise, navigate to login page
      navigate('/login');
    }
  };
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="app-header">
      <div className="header-row">
        <h1 className="header-title">
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            Daily Notes
          </Link>
        </h1>
        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((m) => !m)}
        >
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
        </button>
        <nav
          className={`main-nav${menuOpen ? ' open' : ''}`}
          id="main-nav"
          onClick={closeMenu}
        >
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
