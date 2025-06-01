// Mock env config
jest.mock('../config/env', () => ({
  VITE_COGNITO_USER_POOL_ID: 'test-pool',
  VITE_COGNITO_USER_POOL_WEB_CLIENT_ID: 'test-client',
}));

// Mock CognitoUserPool and CognitoUser with getSession/getUserAttributes
const mockGetSession = jest.fn((cb) => cb(null, true));
const mockGetUserAttributes = jest.fn((cb) => cb(null, [
  { getName: () => 'given_name', getValue: () => 'TestUser' }
]));
const mockSignOut = jest.fn();

jest.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: jest.fn().mockImplementation(() => ({
    getCurrentUser: () => ({
      getSession: mockGetSession,
      getUserAttributes: mockGetUserAttributes,
      signOut: mockSignOut
    }),
    signUp: jest.fn()
  })),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppWithRouter from '../App';

describe('App routing (authenticated)', () => {
  beforeEach(() => {
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
  it('renders Home page on default route', () => {
    render(<AppWithRouter />);
    expect(screen.getByRole('heading', { name: /Welcome, TestUser to Daily Notes/i })).toBeInTheDocument();
  });

  // Test that the App renders LogEvent page on /log route
  it('renders LogEvent page on /log route', () => {
    window.history.pushState({}, '', '/log');
    render(<AppWithRouter />);
    expect(screen.getByRole('heading', { name: /Log an Event/i })).toBeInTheDocument();
  });

  // Test that the App renders ViewEvents page on /view route
  it('renders ViewEvents page on /view route', () => {
    window.history.pushState({}, '', '/view');
    render(<AppWithRouter />);
    expect(screen.getByRole('heading', { name: /View Events/i })).toBeInTheDocument();
  });
});
