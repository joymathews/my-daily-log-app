import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ViewEvents from '../pages/ViewEvents';
import axios from 'axios';

jest.mock('axios');

// This test checks that when a user visits the events page, their past events are shown if available.
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

// This test checks that if there is a problem loading events, the user does not see any events listed.
it('handles fetch error gracefully', async () => {
  axios.get.mockRejectedValue(new Error('Network error'));
  render(<ViewEvents />);
  // No events should be rendered
  await waitFor(() => {
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});

// This test checks that the page always shows the title so users know what the page is for.
it('renders title', () => {
  render(<ViewEvents />);
  expect(screen.getByText(/View Events/i)).toBeInTheDocument();
});

// This test checks that if there are no events, the user sees an empty list (or no events).
it('renders empty state when no events', async () => {
  axios.get.mockResolvedValue({ data: [] });
  render(<ViewEvents />);
  await waitFor(() => {
    // The list should be empty, so no list items
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    // Optionally, check for a message (not implemented in component)
  });
});

// This test checks that even if some event details are missing, the user still sees a list for each event.
it('handles events with missing or malformed data', async () => {
  axios.get.mockResolvedValue({ data: [
    { id: 1, timestamp: '2023-01-01' }, // missing event
    { id: 2, event: 'Event 2' }, // missing timestamp
    { id: 3 } // missing both
  ] });
  render(<ViewEvents />);
  await waitFor(() => {
    // Should render something for each event, even if data is missing
    expect(screen.getAllByRole('listitem').length).toBe(3);
  });
});

// This test checks that the event list is accessible for screen readers, using the correct roles.
it('renders list with correct accessibility roles', async () => {
  axios.get.mockResolvedValue({ data: [
    { id: 1, timestamp: '2023-01-01', event: 'Event 1' }
  ] });
  render(<ViewEvents />);
  await waitFor(() => {
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });
});
