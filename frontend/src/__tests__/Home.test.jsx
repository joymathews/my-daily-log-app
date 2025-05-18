import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';

// Test that Home page renders welcome message
it('renders welcome message', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
  expect(screen.getByText(/Welcome to My Daily Log/i)).toBeInTheDocument();
});

// Test that Home page has navigation links
it('renders navigation links', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
  expect(screen.getByText(/Log an Event/i)).toBeInTheDocument();
  expect(screen.getByText(/View Events/i)).toBeInTheDocument();
});
