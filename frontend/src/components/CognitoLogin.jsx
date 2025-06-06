import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import env from '../config/env';
import '../styles/CognitoShared.css';
import { COGNITO_ID_TOKEN, COGNITO_ACCESS_TOKEN, COGNITO_REFRESH_TOKEN, COGNITO_USERNAME, clearCognitoStorage, isTokenExpired } from '../utils/cognitoToken';

// Helper to sanitize error messages (basic)
function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>]/g, '');
}

function CognitoLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // On mount, check for expired session and clear if needed
  React.useEffect(() => {
    const idToken = localStorage.getItem(COGNITO_ID_TOKEN);
    
    // Clear any existing tokens
    if (idToken && isTokenExpired(idToken)) {
      clearCognitoStorage();
    } else if (idToken) {
      // If we have a valid token, redirect to the home page
      if (onLogin) onLogin();
      navigate('/');
    }
  }, [navigate, onLogin]);

  const handleSubmit = (e) => {
    e.preventDefault();
    import('amazon-cognito-identity-js').then(({ CognitoUserPool, CognitoUser, AuthenticationDetails }) => {
      const poolData = {
        UserPoolId: env.VITE_COGNITO_USER_POOL_ID,
        ClientId: env.VITE_COGNITO_USER_POOL_WEB_CLIENT_ID
      };
      const userPool = new CognitoUserPool(poolData);
      const user = new CognitoUser({ Username: username, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: username, Password: password });
      user.authenticateUser(authDetails, {
        onSuccess: (result) => {
          // Store tokens in localStorage for session management
          localStorage.setItem(COGNITO_ID_TOKEN, result.getIdToken().getJwtToken());
          localStorage.setItem(COGNITO_ACCESS_TOKEN, result.getAccessToken().getJwtToken());
          localStorage.setItem(COGNITO_REFRESH_TOKEN, result.getRefreshToken().getToken());
          localStorage.setItem(COGNITO_USERNAME, username); // Store username for refresh
          setMessage('Login successful!');
          if (onLogin) onLogin();
          navigate('/'); // Redirect to home after login
        },
        onFailure: (err) => {
          setMessage('Login failed: ' + sanitize(err.message));
        }
      });
    });
  };  return (
    <div className="auth-container">
      <h1 className="page-title ">Daily Notes</h1>
      <div className="auth-card">
        <h2 className="auth-title">Login</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-content">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="form-input"
              />
            </div>
            {message && (
              <div className={message.includes('failed') ? 'error-message' : 'success-message'}>
                {message}
              </div>
            )}
            <button type="submit" className="auth-button">Login</button>
          </div>
        </form>
        <div className="auth-links">
          <Link to="/register" className="auth-link">Register</Link>
          <span className="separator">|</span>
          <Link to="/verify" className="auth-link">Verify</Link>
        </div>
      </div>
    </div>
  );
}

export default CognitoLogin;
