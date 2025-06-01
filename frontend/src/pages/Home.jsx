import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import '../styles/Pages.css';

function Home({ onSignOut, userName }) {
  return (
    <>
      <Header onSignOut={onSignOut} />
      <main className="page-container">
        <section className="home-hero fade-in">
          <h2 className="page-title">Welcome{userName ? `, ${userName}` : ''} to Daily Notes</h2>
          <p className="home-intro slide-in-bottom">
            Note down your daily activities, thoughts, and experiences in one place.
          </p>
          
          <div className="home-features">
            <div className="feature-card slide-in-bottom" style={{ animationDelay: '0.1s' }}>
              <h3>Log Events</h3>
              <p>Record events with text descriptions and optional file attachments.</p>
              <Link to="/log" className="feature-link">Log an Event</Link>
            </div>
            
            <div className="feature-card slide-in-bottom" style={{ animationDelay: '0.2s' }}>
              <h3>View Events</h3>
              <p>Browse through your past logs in chronological order.</p>
              <Link to="/view" className="feature-link">View Events</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default Home;
