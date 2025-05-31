import React, { useState } from 'react';
import { CognitoUserPool, CognitoUser } from 'amazon-cognito-identity-js';
import { Link } from 'react-router-dom';
import env from '../config/env';
import '../styles/CognitoShared.css';

const poolData = {
  UserPoolId: env.VITE_COGNITO_USER_POOL_ID,
  ClientId: env.VITE_COGNITO_USER_POOL_WEB_CLIENT_ID
};

function CognitoVerify() {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  // Move userPool instantiation here so tests can mock it
  const userPool = new CognitoUserPool(poolData);

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = new CognitoUser({ Username: username, Pool: userPool });
    user.confirmRegistration(code, true, (err, result) => {
      if (err) {
        setMessage('Verification failed: ' + err.message);
      } else {
        setMessage('Verification successful! You can now log in.');
      }
    });
  };
  return (
    <div className="auth-container">
      <h1 className="page-title">Daily Notes</h1>
      <div className="auth-card">
        <h2 className="auth-title">Verify Account</h2>
        <form role="form" onSubmit={handleSubmit} className="auth-form">
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
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                placeholder="Verification Code"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                className="form-input"
              />
            </div>
            {message && (
              <div className={message.includes('failed') ? 'error-message' : 'success-message'}>
                {message}
              </div>
            )}
            <button type="submit" className="auth-button">Verify</button>
          </div>
        </form>
        <div className="auth-links">
          <Link to="/login" className="auth-link">Login</Link>
          <span className="separator">|</span>
          <Link to="/register" className="auth-link">Register</Link>
        </div>
      </div>
    </div>
  );
}

export default CognitoVerify;
