import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div>
      <h1>Welcome to My Daily Log</h1>
      <nav>
        <ul>
          <li><Link to="/log">Log an Event</Link></li>
          <li><Link to="/view">View Events</Link></li>
        </ul>
        <ul>
          <li><Link to="/login">Login</Link></li>
          <li><Link to="/register">Register</Link></li>
          <li><Link to="/verify">Verify</Link></li>
        </ul>
      </nav>
    </div>
  );
}

export default Home;
