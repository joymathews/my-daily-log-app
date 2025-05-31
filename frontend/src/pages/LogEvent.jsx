import React, { useState, useRef } from 'react';
import axios from 'axios';
import env from '../config/env';
import Header from '../components/Header';
import '../styles/Pages.css';

function LogEvent({ onSignOut }) {
  const [event, setEvent] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef(null);

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
      setIsLoading(true);
      const token = localStorage.getItem('cognito_id_token');
      const response = await axios.post(`${env.VITE_API_BASE_URL}/log-event`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      if (response.status === 200) {
        setMessage(response.data);
        setEvent('');
        setFile(null);
        formRef.current?.reset();
      } else {
        setMessage('Unexpected response from server');
      }
    } catch (error) {
      console.error('Error logging event:', error.response || error.message);
      setMessage('Error logging event');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      <Header onSignOut={onSignOut} />
      <main className="page-container">
        <h2 className="page-title fade-in">Log an Event</h2>
        <div className="form-container slide-in-bottom">
          <form onSubmit={handleSubmit} ref={formRef}>
            <div className="form-group">
              <label htmlFor="event-description">Event Description</label>
              <textarea
                id="event-description"
                placeholder="Describe your event"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
              />
            </div>
            
            <div className="file-input-container">
              <label htmlFor="file-upload">Attach a File (Optional)</label>
              <input
                id="file-upload"
                className="file-input"
                type="file"
                name="file"
                data-testid="file-input"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>
            
            <button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner" style={{ marginRight: '8px' }}></span>
                  Submitting...
                </>
              ) : (
                'Submit Event'
              )}
            </button>
          </form>
          
          {validationError && <div className="error-message slide-in-right">{validationError}</div>}
          {message && <div className="success-message slide-in-right">{message}</div>}
        </div>
      </main>
    </>
  );
}

export default LogEvent;
