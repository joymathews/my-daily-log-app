import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LogEvent from '../pages/LogEvent';
import axios from 'axios';

jest.mock('axios');

// Test that LogEvent page renders form elements
it('renders form elements', () => {
  render(<LogEvent />);
  expect(screen.getByPlaceholderText(/Describe your event/i)).toBeInTheDocument();
  expect(screen.getByText(/Submit/i)).toBeInTheDocument();
});

// Test submitting the form with text only
it('submits form and shows success message', async () => {
  axios.post.mockResolvedValue({ status: 200, data: 'Event logged successfully' });
  render(<LogEvent />);
  fireEvent.change(screen.getByPlaceholderText(/Describe your event/i), { target: { value: 'Test event' } });
  fireEvent.click(screen.getByText(/Submit/i));
  await waitFor(() => expect(screen.getByText(/Event logged successfully/i)).toBeInTheDocument());
});

// Test submitting the form with an error
it('shows error message on failed submit', async () => {
  axios.post.mockRejectedValue(new Error('Network error'));
  render(<LogEvent />);
  fireEvent.change(screen.getByPlaceholderText(/Describe your event/i), { target: { value: 'Test event' } });
  fireEvent.click(screen.getByText(/Submit/i));
  await waitFor(() => expect(screen.getByText(/Error logging event/i)).toBeInTheDocument());
});

// Test file input change
it('handles file input change', () => {
  render(<LogEvent />);
  const file = new File(['dummy content'], 'example.txt', { type: 'text/plain' });
  const input = screen.getByTestId('file-input');
  // Simulate file selection
  fireEvent.change(input, { target: { files: [file] } });
  expect(input.files[0]).toBe(file);
});
