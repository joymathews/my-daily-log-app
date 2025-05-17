import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ViewEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get('http://localhost:3001/view-events');
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
