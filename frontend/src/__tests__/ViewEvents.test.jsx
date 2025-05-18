import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ViewEvents from '../pages/ViewEvents';
import axios from 'axios';

jest.mock('axios');

// Test that ViewEvents page renders and fetches events
it('fetches and displays events', async () => {
  // Mock API response
  axios.get.mockResolvedValue({ data: [
    { id: 1, timestamp: '2023-01-01', event: 'Event 1' },
    { id: 2, timestamp: '2023-01-02', event: 'Event 2' }
  ] });
  render(<ViewEvents />);
  await waitFor(() => {
    expect(screen.getByText(/Event 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Event 2/i)).toBeInTheDocument();
  });
});

// Test that ViewEvents page handles fetch error gracefully
it('handles fetch error gracefully', async () => {
  axios.get.mockRejectedValue(new Error('Network error'));
  render(<ViewEvents />);
  // No events should be rendered
  await waitFor(() => {
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});

// Test that ViewEvents page renders title
it('renders title', () => {
  render(<ViewEvents />);
  expect(screen.getByText(/View Events/i)).toBeInTheDocument();
});
