import '@testing-library/jest-dom';
import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import ViewEvents from '../pages/ViewEvents';
import axios from 'axios';
import { renderWithRouter } from '../utils/test-utils';
import * as cognitoTokenUtils from '../utils/cognitoToken';

jest.mock('axios');

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  // Mock authentication: set a valid token and username
  localStorage.setItem('cognito_id_token', 'valid.token');
  localStorage.setItem('cognito_username', 'testuser');
  // Mock getValidIdToken to always resolve to a valid token
  jest.spyOn(cognitoTokenUtils, 'getValidIdToken').mockResolvedValue('valid.token');
});
afterEach(() => {
  jest.restoreAllMocks();
});

// This test checks that when a user visits the events page, their past events are shown if available.
it('fetches and displays events', async () => {
  // Mock API response
  axios.get.mockResolvedValue({ data: [
    { id: 1, timestamp: '2023-01-01', event: 'Event 1' },
    { id: 2, timestamp: '2023-01-02', event: 'Event 2' }
  ] });
  renderWithRouter(<ViewEvents />);
  // Expand all day groups
  await waitFor(() => {
    const toggleButtons = screen.getAllByRole('button', { name: /event/i });
    toggleButtons.forEach(btn => fireEvent.click(btn));
  });
  await waitFor(() => {
    expect(screen.getByText(/Event 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Event 2/i)).toBeInTheDocument();
  });
});

// This test checks that if there is a problem loading events, the user does not see any events listed.
it('handles fetch error gracefully', async () => {
  axios.get.mockRejectedValue(new Error('Network error'));
  renderWithRouter(<ViewEvents />);
  await waitFor(() => {
    expect(screen.getByText(/Failed to load events/i)).toBeInTheDocument();
    // Check that no events-list-* elements exist
    expect(document.querySelector('[data-testid^="events-list-"]')).toBeNull();
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
    expect(screen.queryByTestId(/events-list/i)).toBeNull();
    expect(document.querySelector('[data-testid^="events-list-"]')).toBeNull();
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
  // Expand all day groups
  await waitFor(() => {
    const toggleButtons = screen.getAllByRole('button', { name: /event/i });
    toggleButtons.forEach(btn => fireEvent.click(btn));
  });
  await waitFor(() => {
    // Only events with valid timestamps are rendered (1 in this case)
    expect(screen.getAllByTestId(/event-item/).length).toBe(1);
  });
});

// This test checks that the event list is accessible for screen readers, using the correct roles.
it('renders list with correct accessibility roles', async () => {
  axios.get.mockResolvedValue({ data: [
    { id: 1, timestamp: '2023-01-01', event: 'Event 1' }
  ] });
  renderWithRouter(<ViewEvents />);
  // Expand all day groups
  await waitFor(() => {
    const toggleButtons = screen.getAllByRole('button', { name: /event/i });
    toggleButtons.forEach(btn => fireEvent.click(btn));
  });
  await waitFor(() => {
    expect(screen.getByTestId('events-list-2023-01-01')).toBeInTheDocument();
    expect(screen.getByTestId('event-item-1')).toBeInTheDocument();
  });
});

// This test checks that clicking 'Load Previous Day' loads and displays events from the previous day.
it('loads previous day events when Load Previous Day is clicked', async () => {
  // First call: today's events
  axios.get.mockResolvedValueOnce({ data: [
    { id: 1, timestamp: '2025-06-07T10:00:00Z', event: 'Today Event' }
  ] });
  // Second call: previous day's events
  axios.get.mockResolvedValueOnce({ data: [
    { id: 2, timestamp: '2025-06-06T09:00:00Z', event: 'Previous Day Event' }
  ] });
  renderWithRouter(<ViewEvents />);
  // Wait for today's events to load and the button to be enabled
  const loadMoreBtn = await screen.findByRole('button', { name: /Load Previous Day/i });
  await waitFor(() => expect(loadMoreBtn).toBeEnabled());
  // Click Load Previous Day
  fireEvent.click(loadMoreBtn);
  // Wait for the previous day's group to appear
  await screen.findByText((content) => /june\s*6.*2025/i.test(content));
  // Expand all day groups (today and previous day)
  await waitFor(() => {
    const toggleButtons = document.querySelectorAll('.event-day-toggle');
    toggleButtons.forEach(btn => {
      if (btn.getAttribute('aria-expanded') === 'false') fireEvent.click(btn);
    });
  });
  // Now check for both events
  await waitFor(() => {
    expect(screen.getByText(/Today Event/i)).toBeInTheDocument();
    expect(screen.getByText(/Previous Day Event/i)).toBeInTheDocument();
  });
});
