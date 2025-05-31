// Mock env config
jest.mock('../config/env', () => ({
  VITE_COGNITO_USER_POOL_ID: 'test-pool',
  VITE_COGNITO_USER_POOL_WEB_CLIENT_ID: 'test-client',
}));

// Mock CognitoUserPool as a jest mock function
jest.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: jest.fn(),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
import AppWithRouter from '../App';

describe('App routing (authenticated)', () => {
  beforeEach(() => {
    CognitoUserPool.mockImplementation(() => ({
      getCurrentUser: () => ({ signOut: jest.fn() }),
      signUp: jest.fn()
    }));
    // Mock localStorage to simulate authentication
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => {
      if (key === 'cognito_id_token') return 'mock-token';
      return null;
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test that the App renders Home page by default
  it('renders Home page on default route', () => {    render(<AppWithRouter />);
    expect(screen.getByRole('heading', { name: /Welcome to Daily Notes/i })).toBeInTheDocument();
  });

  // Test that the App renders LogEvent page on /log route
  it('renders LogEvent page on /log route', () => {
    window.history.pushState({}, '', '/log');    render(<AppWithRouter />);
    // There are multiple elements with 'Log an Event', so check for the heading
    expect(screen.getByRole('heading', { name: /Log an Event/i })).toBeInTheDocument();
  });

  // Test that the App renders ViewEvents page on /view route
  it('renders ViewEvents page on /view route', () => {
    window.history.pushState({}, '', '/view');    render(<AppWithRouter />);
    // There are multiple elements with 'View Events', so check for the heading
    expect(screen.getByRole('heading', { name: /View Events/i })).toBeInTheDocument();
  });
});
