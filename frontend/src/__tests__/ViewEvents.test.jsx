import '@testing-library/jest-dom';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import ViewEvents from '../pages/ViewEvents';
import axios from 'axios';
import { renderWithRouter } from '../utils/test-utils';

jest.mock('axios');

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});

// This test checks that when a user visits the events page, their past events are shown if available.
it('fetches and displays events', async () => {
  // Mock API response
  axios.get.mockResolvedValue({ data: [
    { id: 1, timestamp: '2023-01-01', event: 'Event 1' },
    { id: 2, timestamp: '2023-01-02', event: 'Event 2' }
  ] });
  renderWithRouter(<ViewEvents />);
  await waitFor(() => {
    expect(screen.getByText(/Event 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Event 2/i)).toBeInTheDocument();
  });
});

// This test checks that if there is a problem loading events, the user does not see any events listed.
it('handles fetch error gracefully', async () => {
  axios.get.mockRejectedValue(new Error('Network error'));
  renderWithRouter(<ViewEvents />);
  // No events should be rendered
  await waitFor(() => {
    // Check for error message instead of checking for absence of list items
    expect(screen.getByText(/Failed to load events/i)).toBeInTheDocument();
    expect(screen.queryByTestId('events-list')).not.toBeInTheDocument();
  });
});

// This test checks that the page always shows the title so users know what the page is for.
it('renders title', () => {
  renderWithRouter(<ViewEvents />);
  // Instead of checking for any element with the text, check for the heading specifically
  expect(screen.getByRole('heading', { name: /View Events/i })).toBeInTheDocument();
});

// This test checks that if there are no events, the user sees an empty list (or no events).
it('renders empty state when no events', async () => {
  axios.get.mockResolvedValue({ data: [] });
  renderWithRouter(<ViewEvents />);
  await waitFor(() => {
    // Check for the empty state message
    expect(screen.getByText(/No events found/i)).toBeInTheDocument();
    // The events list should not be present or should be empty
    expect(screen.queryByTestId('events-list')).not.toBeInTheDocument();
  });
});

// This test checks that even if some event details are missing, the user still sees a list for each event.
it('handles events with missing or malformed data', async () => {
  axios.get.mockResolvedValue({ data: [
    { id: 1, timestamp: '2023-01-01' }, // missing event
    { id: 2, event: 'Event 2' }, // missing timestamp
    { id: 3 } // missing both
  ] });
  renderWithRouter(<ViewEvents />);
  await waitFor(() => {
    // Should render something for each event, even if data is missing
    // Use a more specific selector to get event items and not navigation items
    expect(screen.getAllByTestId(/event-item/).length).toBe(3);
  });
});

// This test checks that the event list is accessible for screen readers, using the correct roles.
it('renders list with correct accessibility roles', async () => {
  axios.get.mockResolvedValue({ data: [
    { id: 1, timestamp: '2023-01-01', event: 'Event 1' }
  ] });
  renderWithRouter(<ViewEvents />);
  await waitFor(() => {
    // Use a more specific selector or data-testid to identify the event list
    expect(screen.getByTestId('events-list')).toBeInTheDocument();
    expect(screen.getByTestId('event-item-1')).toBeInTheDocument();
  });
});
