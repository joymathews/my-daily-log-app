import React, { useState } from 'react';
import axios from 'axios';
import env from '../config/env';

function LogEvent() {
  const [event, setEvent] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    if (!event && !file) {
      setValidationError('Please enter an event description or select a file.');
      return;
    }
    const formData = new FormData();
    formData.append('event', event);
    if (file) {
      formData.append('file', file);
    }

    try {
      const response = await axios.post(`${env.VITE_API_BASE_URL}/log-event`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.status === 200) {
        setMessage(response.data);
        setEvent('');
        setFile(null);
        // Reset file input value
        if (document.querySelector('[data-testid="file-input"]')) {
          document.querySelector('[data-testid="file-input"]').value = '';
        }
      } else {
        setMessage('Unexpected response from server');
      }
    } catch (error) {
      console.error('Error logging event:', error.response || error.message);
      setMessage('Error logging event');
    }
  };

  return (
    <div>
      <h1>Log an Event</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="Describe your event"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
        />
        <input
          type="file"
          data-testid="file-input"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button type="submit">Submit</button>
      </form>
      {validationError && <p style={{ color: 'red' }}>{validationError}</p>}
      {message && <p>{message}</p>}
    </div>
  );
}

export default LogEvent;
