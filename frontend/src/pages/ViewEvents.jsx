import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import env from '../config/env';
import Header from '../components/Header';
import { getValidIdToken } from '../utils/cognitoToken';
import '../styles/Pages.css';

// Helper to get today's date string
const getTodayStr = () => new Date().toISOString().slice(0, 10);

function ViewEvents({ onSignOut }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventDates, setEventDates] = useState([]); // Dates with data for date picker
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // Fetch events for a specific date
  const fetchEventsByDate = async (date) => {
    try {
      setLoading(true);
      const token = await getValidIdToken();
      const response = await axios.get(`${env.VITE_API_BASE_URL}/view-events-by-date`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { date }
      });
      // Append new events, avoiding duplicates by event id
      setEvents(prevEvents => {
        const existingIds = new Set(prevEvents.map(ev => ev.id));
        const newEvents = response.data.filter(ev => !existingIds.has(ev.id));
        return [...prevEvents, ...newEvents];
      });
      setError(null);
    } catch (error) {
      setError('Failed to load events. Please try again later.');
      // Do not clear events on error
    } finally {
      setLoading(false);
    }
  };

  // On mount, load today's events
  useEffect(() => {
    fetchEventsByDate(getTodayStr());
    // eslint-disable-next-line
  }, []);
  // Detect user locale, fallback to 'en-US' if unavailable
  const userLocale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

  // Format the timestamp for better readability
  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date available';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid date';
      return new Intl.DateTimeFormat(userLocale, {
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

  // Fetch event dates for date picker on mount
  useEffect(() => {
    async function fetchEventDates() {
      try {
        const token = await getValidIdToken();
        const response = await axios.get(`${env.VITE_API_BASE_URL}/event-dates`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setEventDates(response.data);
      } catch (err) {
        // Ignore error for now, just don't show indicators
      }
    }
    fetchEventDates();
  }, []);

  // Handler for date picker change
  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    // Fetch and append events for the selected date
    fetchEventsByDate(date);
  };

  return (
    <>
      <Header onSignOut={onSignOut} />
      <main className="page-container">
        <h2 className="page-title fade-in">View Events</h2>
        {/* Date Picker UI */}
        <div className="date-picker-container">
          <label htmlFor="event-date-input" className="visually-hidden">Select date to view events</label>
          <input
            id="event-date-input"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min={eventDates.length > 0 ? eventDates.slice().sort()[0] : undefined}
            max={eventDates.length > 0 ? eventDates.slice().sort().reverse()[0] : undefined}
            list="event-dates-list"
          />
          {/* Datalist for browser-native suggestions/highlighting */}
          <datalist id="event-dates-list">
            {eventDates.map(date => (
              <option key={date} value={date} />
            ))}
          </datalist>
        </div>
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
                  <span className="event-day-label">{new Date(dayKey).toLocaleDateString(userLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
                              {event.fileUrl.split('?')[0].match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? (
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
