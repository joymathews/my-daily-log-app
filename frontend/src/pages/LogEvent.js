import React, { useState } from 'react';
import axios from 'axios';

function LogEvent() {
  const [event, setEvent] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('event', event);
    if (file) {
      formData.append('file', file);
    }

    try {
      const response = await axios.post('http://localhost:3001/log-event', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(response.data);
    } catch (error) {
      console.error('Error logging event:', error);
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
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button type="submit">Submit</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default LogEvent;
