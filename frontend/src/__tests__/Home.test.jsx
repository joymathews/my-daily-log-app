import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';

// This test checks that when a user visits the home page, they see a welcome message so they know they are in the right place.
it('renders welcome message', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
  expect(screen.getByText(/Welcome to My Daily Log/i)).toBeInTheDocument();
});

// This test checks that the home page shows links to log a new event or view past events, so users can easily navigate.
it('renders navigation links', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
  expect(screen.getByText(/Log an Event/i)).toBeInTheDocument();
  expect(screen.getByText(/View Events/i)).toBeInTheDocument();
});
