import React, { useState } from 'react';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
import { Link } from 'react-router-dom';
import env from '../config/env';
import '../styles/CognitoShared.css';

const poolData = {
  UserPoolId: env.VITE_COGNITO_USER_POOL_ID,
  ClientId: env.VITE_COGNITO_USER_POOL_WEB_CLIENT_ID
};

function CognitoRegister() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [message, setMessage] = useState('');

  // Move userPool instantiation here so tests can mock it
  const userPool = new CognitoUserPool(poolData);

  const handleSubmit = (e) => {
    e.preventDefault();
    userPool.signUp(
      username,
      password,
      [
        { Name: 'given_name', Value: firstName }
      ],
      null,
      (err, result) => {
        if (err) {
          setMessage('Registration failed: ' + err.message);
        } else {
          setMessage('Registration successful! Please check your email for a verification code.');
        }
      }
    );
  };
  return (
    <div className="auth-container">
      <h1 className="page-title">Daily Notes</h1>
      <div className="auth-card">
        <h2 className="auth-title">Register</h2>
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
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                className="form-input"
              />
            </div>
            {message && (
              <div className={message.includes('failed') ? 'error-message' : 'success-message'}>
                {message}
              </div>
            )}
            <button type="submit" className="auth-button">Register</button>
          </div>
        </form>
        <div className="auth-links">
          <Link to="/login" className="auth-link">Login</Link>
          <span className="separator">|</span>
          <Link to="/verify" className="auth-link">Verify</Link>
        </div>
      </div>
    </div>
  );
}

export default CognitoRegister;
