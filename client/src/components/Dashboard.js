import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventForm from './EventForm';
import EventCard from './EventCard';

function Dashboard({ user, onLogout }) {
  const [events, setEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
    fetchUpcomingEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/events');
      setEvents(response.data);
    } catch (err) {
      setError('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await axios.get('/upcoming-events');
      setUpcomingEvents(response.data);
    } catch (err) {
      console.error('Failed to fetch upcoming events');
    }
  };

  const handleEventCreated = (newEvent) => {
    setEvents([...events, newEvent]);
    setShowEventForm(false);
    fetchUpcomingEvents();
  };

  const handleEventUpdated = (updatedEvent) => {
    setEvents(events.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    ));
    setEditingEvent(null);
    fetchUpcomingEvents();
  };

  const handleEventDeleted = async (eventId) => {
    try {
      await axios.delete(`/events/${eventId}`);
      setEvents(events.filter(event => event.id !== eventId));
      fetchUpcomingEvents();
    } catch (err) {
      setError('Failed to delete event');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntil = (dateString) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today!';
    if (diffDays === 1) return 'Tomorrow!';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `In ${diffDays} days`;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="auth-form">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Welcome, {user.username}!</h1>
        <div>
          <button
            className="btn btn-small"
            onClick={() => setShowEventForm(true)}
            style={{ marginRight: '10px' }}
          >
            Add Event
          </button>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {upcomingEvents.length > 0 && (
        <div className="upcoming-events">
          <h2>🎉 Upcoming Events (Next 7 Days)</h2>
          <div className="events-grid">
            {upcomingEvents.map(event => (
              <div key={event.id} className="event-card" style={{ border: '2px solid #ffc107' }}>
                <h3>{event.title}</h3>
                <div className="event-date">{formatDate(event.event_date)}</div>
                <div className="event-type">{event.event_type}</div>
                <div style={{ color: '#ffc107', fontWeight: 'bold' }}>
                  {getDaysUntil(event.event_date)}
                </div>
                <div style={{ 
                  marginTop: '10px', 
                  fontSize: '13px', 
                  color: '#667eea',
                  fontWeight: '600',
                  background: 'rgba(102, 126, 234, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'inline-block'
                }}>
                  👤 Created by {event.creator_name}
                </div>
                {event.description && (
                  <p style={{ marginTop: '10px', color: '#666' }}>{event.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px 0 20px 0' }}>
        <h2 style={{ color: 'white' }}>Family Events ({events.length})</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
          All family members can see these events
        </p>
      </div>

      {events.length === 0 ? (
        <div className="no-events">
          <h3>No family events yet!</h3>
          <p>Click "Add Event" to create the first shared family reminder.</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              currentUser={user}
              onEdit={setEditingEvent}
              onDelete={handleEventDeleted}
              formatDate={formatDate}
              getDaysUntil={getDaysUntil}
            />
          ))}
        </div>
      )}

      {(showEventForm || editingEvent) && (
        <EventForm
          event={editingEvent}
          onSave={editingEvent ? handleEventUpdated : handleEventCreated}
          onCancel={() => {
            setShowEventForm(false);
            setEditingEvent(null);
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;