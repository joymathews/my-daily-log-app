import React, { useEffect, useState } from 'react';
import axios from 'axios';
import env from '../config/env';

function ViewEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${env.VITE_API_BASE_URL}/view-events`);
        setEvents(response.data);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div>
      <h1>View Events</h1>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <strong>{event.timestamp}:</strong> {event.event}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ViewEvents;
