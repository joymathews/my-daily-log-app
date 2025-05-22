import React, { useState } from 'react';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
import env from '../config/env';

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
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
        />
        <button type="submit">Register</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default CognitoRegister;
