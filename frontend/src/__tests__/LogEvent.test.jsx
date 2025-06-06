import '@testing-library/jest-dom';
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LogEvent from '../pages/LogEvent';
import axios from 'axios';
import { renderWithRouter } from '../utils/test-utils';
import * as cognitoTokenUtils from '../utils/cognitoToken';

jest.mock('axios');

// Suppress console.error in LogEvent tests
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

// This test checks that the event logging page shows the form fields a user needs to log an event.
it('renders form elements', () => {
  renderWithRouter(<LogEvent />);
  expect(screen.getByPlaceholderText(/Describe your event/i)).toBeInTheDocument();
  expect(screen.getByText(/Submit/i)).toBeInTheDocument();
});

// This test checks that when a user writes a description and submits, they see a success message if it works.
it('submits form and shows success message', async () => {
  axios.post.mockResolvedValue({ status: 200, data: 'Event logged successfully' });
  renderWithRouter(<LogEvent />);
  fireEvent.change(screen.getByPlaceholderText(/Describe your event/i), { target: { value: 'Test event' } });
  fireEvent.click(screen.getByText(/Submit/i));
  await waitFor(() => expect(screen.getByText(/Event logged successfully/i)).toBeInTheDocument());
});

// This test checks that if something goes wrong when submitting, the user sees an error message.
it('shows error message on failed submit', async () => {
  axios.post.mockRejectedValue(new Error('Network error'));
  renderWithRouter(<LogEvent />);
  fireEvent.change(screen.getByPlaceholderText(/Describe your event/i), { target: { value: 'Test event' } });
  fireEvent.click(screen.getByText(/Submit/i));
  await waitFor(() => expect(screen.getByText(/Error logging event/i)).toBeInTheDocument());
});

// This test checks that when a user selects a file, the file is recognized by the form.
it('handles file input change', () => {
  renderWithRouter(<LogEvent />);
  const file = new File(['dummy content'], 'example.txt', { type: 'text/plain' });
  const input = screen.getByTestId('file-input');
  // Simulate file selection
  fireEvent.change(input, { target: { files: [file] } });
  expect(input.files[0]).toBe(file);
});

// This test checks that a user can submit both a description and a file, and sees a success message.
it('submits form with text and file', async () => {
  axios.post.mockResolvedValue({ status: 200, data: 'Event logged successfully' });
  renderWithRouter(<LogEvent />);
  fireEvent.change(screen.getByPlaceholderText(/Describe your event/i), { target: { value: 'Test event' } });
  const file = new File(['dummy content'], 'example.txt', { type: 'text/plain' });
  fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });
  fireEvent.click(screen.getByText(/Submit/i));
  await waitFor(() => expect(screen.getByText(/Event logged successfully/i)).toBeInTheDocument());
});

// This test checks that if a user tries to submit without entering anything, they are told to fill in the form.
it('shows validation or error when submitting with neither text nor file', async () => {
  renderWithRouter(<LogEvent />);
  fireEvent.click(screen.getByText(/Submit/i));
  await waitFor(() => {
    expect(screen.getByText(/Please enter an event description or select a file./i)).toBeInTheDocument();
  });
});

// This test checks that after a successful submission, the form is cleared so the user can enter a new event.
it('clears form after successful submit', async () => {
  axios.post.mockResolvedValue({ status: 200, data: 'Event logged successfully' });
  renderWithRouter(<LogEvent />);
  const textarea = screen.getByPlaceholderText(/Describe your event/i);
  fireEvent.change(textarea, { target: { value: 'Test event' } });
  fireEvent.click(screen.getByText(/Submit/i));
  await waitFor(() => expect(screen.getByText(/Event logged successfully/i)).toBeInTheDocument());
  // The textarea should be cleared if the form resets (currently not implemented, so this will fail)
  expect(textarea.value).toBe('');
});
