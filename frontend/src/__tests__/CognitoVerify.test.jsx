import '@testing-library/jest-dom';
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CognitoVerify from '../components/CognitoVerify';
import { renderWithRouter } from '../utils/test-utils';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ children, ...props }) => <a {...props}>{children}</a>
}));

// Mock env config
jest.mock('../config/env', () => ({
  VITE_COGNITO_USER_POOL_ID: 'test-pool',
  VITE_COGNITO_USER_POOL_WEB_CLIENT_ID: 'test-client',
}));

const mockConfirmRegistration = jest.fn();
const mockCognitoUserPool = jest.fn().mockImplementation(() => ({}));
const mockCognitoUser = jest.fn().mockImplementation(() => ({
  confirmRegistration: mockConfirmRegistration
}));

jest.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: jest.fn().mockImplementation(() => ({})),
  CognitoUser: jest.fn().mockImplementation((opts) => ({
    confirmRegistration: mockConfirmRegistration
  }))
}));

describe('CognitoVerify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
    // Using the imported renderWithRouter from test-utils.jsx

  // This test checks that the verification form shows the fields and button a user needs to verify their account.
  it('renders verification form fields and button', () => {
    renderWithRouter(<CognitoVerify />);
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Verification Code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify/i })).toBeInTheDocument();
  });
  // This test checks that when a user types in their username and code, the form updates to show what they typed.
  it('handles input changes', () => {
    renderWithRouter(<CognitoVerify />);
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: 'user1' } });
    fireEvent.change(screen.getByPlaceholderText(/Verification Code/i), { target: { value: '123456' } });
    expect(screen.getByPlaceholderText(/Username/i).value).toBe('user1');
    expect(screen.getByPlaceholderText(/Verification Code/i).value).toBe('123456');
  });
  // This test checks that if a user enters the correct code, they see a message telling them the verification was successful.
  it('shows verification successful message on success', async () => {
    mockConfirmRegistration.mockImplementation((code, forceAliasCreation, cb) => {
      cb(null, 'SUCCESS');
    });
    renderWithRouter(<CognitoVerify />);
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: 'user1' } });
    fireEvent.change(screen.getByPlaceholderText(/Verification Code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
    await waitFor(() => {
      expect(screen.getByText(/Verification successful/i)).toBeInTheDocument();
    });
  });
  // This test checks that if a user enters the wrong code, they see a message telling them the verification failed.
  it('shows verification failed message on error', async () => {
    mockConfirmRegistration.mockImplementation((code, forceAliasCreation, cb) => {
      cb({ message: 'Invalid code' }, null);
    });
    renderWithRouter(<CognitoVerify />);
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: 'user1' } });
    fireEvent.change(screen.getByPlaceholderText(/Verification Code/i), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
    await waitFor(() => {
      expect(screen.getByText(/Verification failed: Invalid code/i)).toBeInTheDocument();
    });
  });
  // This test checks that the verification form uses the correct field types and roles for accessibility, so screen readers and browsers know how to handle them.
  it('renders accessibility attributes', () => {
    renderWithRouter(<CognitoVerify />);
    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify/i })).toHaveAttribute('type', 'submit');
  });
});
