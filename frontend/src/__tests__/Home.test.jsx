import '@testing-library/jest-dom';
import React from 'react';
import { screen } from '@testing-library/react';
import Home from '../pages/Home';
import { renderWithRouter } from '../utils/test-utils';

// This test checks that when a user visits the home page, they see a welcome message so they know they are in the right place.
it('renders welcome message', () => {
  renderWithRouter(<Home />);
  expect(screen.getByText(/Welcome to Daily Notes/i)).toBeInTheDocument();
});

// This test checks that the home page shows links to log a new event or view past events, so users can easily navigate.
it('renders navigation links', () => {
  renderWithRouter(<Home />);
  // Check for feature link section specifically
  expect(screen.getAllByText(/Log an Event/i)[0]).toBeInTheDocument();
  expect(screen.getAllByText(/View Events/i)[0]).toBeInTheDocument();
});
