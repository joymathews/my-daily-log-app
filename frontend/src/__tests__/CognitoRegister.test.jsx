// Mock env config
jest.mock('../config/env', () => ({
  VITE_COGNITO_USER_POOL_ID: 'test-pool',
  VITE_COGNITO_USER_POOL_WEB_CLIENT_ID: 'test-client',
}));

const mockSignUp = jest.fn();
jest.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: jest.fn().mockImplementation(() => ({
    signUp: mockSignUp
  }))
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ children, ...props }) => <a {...props}>{children}</a>
}));

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CognitoRegister from '../components/CognitoRegister';

describe('CognitoRegister', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Wrapper component to provide Router context
  const renderWithRouter = (component) => {
    return render(
      <BrowserRouter>{component}</BrowserRouter>
    );
  };

  // This test checks that the registration form shows all the fields and button a user needs to create an account.
  it('renders registration form fields and button', () => {
    renderWithRouter(<CognitoRegister />);
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
  });
  // This test checks that when a user types in their details, the form updates to show what they typed.
  it('handles input changes', () => {
    renderWithRouter(<CognitoRegister />);
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: 'user1' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'pass1' } });
    fireEvent.change(screen.getByPlaceholderText(/First Name/i), { target: { value: 'John' } });
    expect(screen.getByPlaceholderText(/Username/i).value).toBe('user1');
    expect(screen.getByPlaceholderText(/Password/i).value).toBe('pass1');
    expect(screen.getByPlaceholderText(/First Name/i).value).toBe('John');
  });
  // This test checks that if a user fills out the form correctly and submits, they see a message telling them to check their email for a verification code.
  it('shows registration successful message on success', async () => {
    mockSignUp.mockImplementation((username, password, attributes, _, cb) => {
      cb(null, { user: { getUsername: () => username } });
    });
    renderWithRouter(<CognitoRegister />);
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: 'user1' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'pass1' } });
    fireEvent.change(screen.getByPlaceholderText(/First Name/i), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));
    await waitFor(() => {
      expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
    });
  });
  // This test checks that if a user tries to register with details that are already used, they see a message explaining the problem.
  it('shows registration failed message on error', async () => {
    mockSignUp.mockImplementation((username, password, attributes, _, cb) => {
      cb({ message: 'User already exists' }, null);
    });
    renderWithRouter(<CognitoRegister />);
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: 'user1' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'pass1' } });
    fireEvent.change(screen.getByPlaceholderText(/First Name/i), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));
    await waitFor(() => {
      expect(screen.getByText(/Registration failed: User already exists/i)).toBeInTheDocument();
    });
  });
  // This test checks that the registration form uses the correct field types for accessibility, so screen readers and browsers know how to handle them.
  it('renders accessibility attributes', () => {
    renderWithRouter(<CognitoRegister />);
    expect(screen.getByPlaceholderText(/Username/i)).toHaveAttribute('type', 'text');
    expect(screen.getByPlaceholderText(/Password/i)).toHaveAttribute('type', 'password');
    expect(screen.getByPlaceholderText(/First Name/i)).toHaveAttribute('type', 'text');
  });
});
