// Utility for rendering components with router context in tests
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

export function renderWithRouter(
  ui,
  { route = '/', ...renderOptions } = {}
) {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: ({ children }) => <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>, ...renderOptions });
}
