import React, { useEffect, useState, useMemo } from 'react';
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
  // Group events by day (YYYY-MM-DD)
  const groupEventsByDay = (events) => {
    return events.reduce((groups, event) => {
      const date = new Date(event.timestamp);
      if (isNaN(date.getTime())) return groups;
      const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(event);
      return groups;
    }, {});
  };

  // Sort day keys latest-first
  const getSortedDayKeys = (grouped) => {
    return Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  };

  // Memoize grouped events and sorted day keys
  const grouped = useMemo(() => groupEventsByDay(events), [events]);
  const sortedDayKeys = useMemo(() => getSortedDayKeys(grouped), [grouped]);

  // Expand/collapse state for each day
  const [expandedDays, setExpandedDays] = useState({});
  const toggleDay = (dayKey) => {
    setExpandedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }));
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
          </div>
        ) : (
          <div className="events-grouped-list" data-testid="events-grouped-list">
            {sortedDayKeys.map((dayKey, groupIdx) => (
              <div key={dayKey} className="event-day-group fade-in" style={{ '--animation-delay': `${groupIdx * 0.08}s` }}>
                <button
                  className="event-day-toggle"
                  onClick={() => toggleDay(dayKey)}
                  aria-expanded={!!expandedDays[dayKey]}
                  aria-controls={`event-list-${dayKey}`}
                >
                  <span className="event-day-label">{new Date(dayKey).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="event-day-count">({grouped[dayKey].length} event{grouped[dayKey].length > 1 ? 's' : ''})</span>
                  <span className="event-day-arrow">{expandedDays[dayKey] ? '▲' : '▼'}</span>
                </button>
                {expandedDays[dayKey] && (
                  <ul className="events-list" id={`event-list-${dayKey}`} data-testid={`events-list-${dayKey}`}>
                    {grouped[dayKey]
                      .slice()
                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                      .map((event, index) => (
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
                              {event.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? (
                                <img
                                  src={event.fileUrl}
                                  alt={event.originalFileName || 'Event Attachment'}
                                  className="event-attachment-img"
                                />
                              ) : (
                                <a href={event.fileUrl} target="_blank" rel="noopener noreferrer">
                                  View Attachment
                                </a>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default ViewEvents;
