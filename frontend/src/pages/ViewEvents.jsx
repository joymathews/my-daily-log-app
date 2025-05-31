import React, { useEffect, useState } from 'react';
import axios from 'axios';
import env from '../config/env';
import Header from '../components/Header';
import '../styles/Pages.css';

function ViewEvents({ onSignOut }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('cognito_id_token');
        const response = await axios.get(`${env.VITE_API_BASE_URL}/view-events`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setEvents(response.data);
        setError(null);
      } catch (error) {
        setError('Failed to load events. Please try again later.');
        setEvents([]); // Clear events on error to avoid showing stale data
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);
  // Format the timestamp for better readability
  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date available';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid date';
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };
  return (
    <>
      <Header onSignOut={onSignOut} />
      <main className="page-container">
        <h2 className="page-title fade-in">View Events</h2>
        
        {loading ? (
          <div className="loading">
            <div className="spinner" role="status" aria-label="Loading events"></div>
            <p>Loading events...</p>
          </div>
        ) : error ? (
          <div className="error-message slide-in-right">{error}</div>
        ) : events.length === 0 ? (
          <div className="no-events fade-in">
            <p>No events found. Start by logging your first event!</p>
          </div>        ) : (
          <ul className="events-list" data-testid="events-list">
            {events.map((event, index) => (
              <li 
                key={event.id} 
                className="event-item slide-in-bottom" 
                data-testid={`event-item-${event.id}`}
                style={{ '--animation-delay': `${index * 0.05}s` }}
              >
                <span className="event-timestamp">{formatDate(event.timestamp)}</span>
                <p className="event-content">{event.event}</p>
                {event.fileUrl && (
                  <div className="event-attachment">
                    <a href={event.fileUrl} target="_blank" rel="noopener noreferrer">
                      View Attachment
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

export default ViewEvents;
