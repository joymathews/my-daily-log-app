import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // Import jest-dom matchers
import App from '../App';

// Test that the App renders Home page by default
it('renders Home page on default route', () => {
  render(<App />);
  expect(screen.getByText(/Welcome to My Daily Log/i)).toBeInTheDocument();
});

// Test that the App renders LogEvent page on /log route
it('renders LogEvent page on /log route', () => {
  window.history.pushState({}, '', '/log');
  render(<App />);
  expect(screen.getByText(/Log an Event/i)).toBeInTheDocument();
});

// Test that the App renders ViewEvents page on /view route
it('renders ViewEvents page on /view route', () => {
  window.history.pushState({}, '', '/view');
  render(<App />);
  expect(screen.getByText(/View Events/i)).toBeInTheDocument();
});
