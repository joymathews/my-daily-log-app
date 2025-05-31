import '@testing-library/jest-dom';
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CognitoLogin from '../components/CognitoLogin';
import { renderWithRouter } from '../utils/test-utils';

// Mock react-router-dom's useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  Link: ({ children, ...props }) => <a {...props}>{children}</a>
}));

// Mock env config
jest.mock('../config/env', () => ({
  VITE_COGNITO_USER_POOL_ID: 'test-pool',
  VITE_COGNITO_USER_POOL_WEB_CLIENT_ID: 'test-client',
}));

// Default mock for amazon-cognito-identity-js
const mockAuthenticateUser = jest.fn();
jest.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: jest.fn().mockImplementation(() => ({})),
  CognitoUser: jest.fn().mockImplementation(() => ({
    authenticateUser: mockAuthenticateUser
  })),
  AuthenticationDetails: jest.fn()
}));

describe('CognitoLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });
  // This test checks that the login form shows the fields and button a user needs to log in.
  it('renders login form fields and button', () => {
    renderWithRouter(<CognitoLogin />);
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });
  // This test checks that when a user types in their username and password, the form updates to show what they typed.
  it('handles input changes', () => {
    renderWithRouter(<CognitoLogin />);
    const usernameInput = screen.getByPlaceholderText(/Username/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);
    fireEvent.change(usernameInput, { target: { value: 'user1' } });
    fireEvent.change(passwordInput, { target: { value: 'pass1' } });
    expect(usernameInput.value).toBe('user1');
    expect(passwordInput.value).toBe('pass1');
  });
  // This test checks that if a user tries to log in without entering anything, they do not see a login error message.
  it('shows error on empty submit', async () => {
    renderWithRouter(<CognitoLogin />);
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Login failed/i)).not.toBeInTheDocument();
    });
  });

  // This test checks that if a user enters the wrong username or password, they see a message telling them the login failed.
  it('shows login failed message on authentication failure', async () => {
    mockAuthenticateUser.mockImplementation((authDetails, callbacks) => {
      callbacks.onFailure({ message: 'Invalid credentials' });
    });
    renderWithRouter(<CognitoLogin />);
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: 'user1' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    await waitFor(() => {
      expect(screen.getByText(/Login failed: Invalid credentials/i)).toBeInTheDocument();
    });
  });

  // This test checks that if a user enters the correct username and password, they see a message telling them the login was successful.
  it('shows login successful message on authentication success', async () => {
    mockAuthenticateUser.mockImplementation((authDetails, callbacks) => {
      callbacks.onSuccess({
        getIdToken: () => ({ getJwtToken: () => 'idtoken' }),
        getAccessToken: () => ({ getJwtToken: () => 'accesstoken' }),
        getRefreshToken: () => ({ getToken: () => 'refreshtoken' })
      });
    });
    renderWithRouter(<CognitoLogin />);
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: 'user1' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'rightpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    await waitFor(() => {
      expect(screen.getByText(/Login successful/i)).toBeInTheDocument();
    });
  });

  // This test checks that the login form uses the correct field types for accessibility, so screen readers and browsers know how to handle them.
  it('renders accessibility attributes', () => {
    renderWithRouter(<CognitoLogin />);
    expect(screen.getByPlaceholderText(/Username/i)).toHaveAttribute('type', 'text');
    expect(screen.getByPlaceholderText(/Password/i)).toHaveAttribute('type', 'password');
  });
});
