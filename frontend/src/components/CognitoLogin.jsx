import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import env from '../config/env';
import './CognitoLogin.css';

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

  // Check if token is expired (simple check for exp in JWT)
  function isTokenExpired(token) {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  // On mount, check for expired session and clear if needed
  React.useEffect(() => {
    const idToken = localStorage.getItem('cognito_id_token');
    if (idToken && isTokenExpired(idToken)) {
      localStorage.removeItem('cognito_id_token');
      localStorage.removeItem('cognito_access_token');
      localStorage.removeItem('cognito_refresh_token');
    }
  }, []);

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
          localStorage.setItem('cognito_id_token', result.getIdToken().getJwtToken());
          localStorage.setItem('cognito_access_token', result.getAccessToken().getJwtToken());
          localStorage.setItem('cognito_refresh_token', result.getRefreshToken().getToken());
          setMessage('Login successful!');
          if (onLogin) onLogin();
          navigate('/'); // Redirect to home after login
        },
        onFailure: (err) => {
          setMessage('Login failed: ' + sanitize(err.message));
        }
      });
    });
  };
  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Login</h2>
        <form onSubmit={handleSubmit} className="login-form">
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
            <button type="submit" className="login-button">Login</button>
          </div>
        </form>
        <div className="login-links">
          <Link to="/register" className="auth-link">Register</Link>
          <span className="separator">|</span>
          <Link to="/verify" className="auth-link">Verify</Link>
        </div>
      </div>
    </div>
  );
}

export default CognitoLogin;
