import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Calendar, Users, Bell, Loader2, Clock } from 'lucide-react';
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
      const response = await axios.get('/api/events');
      setEvents(response.data);
    } catch (err) {
      setError('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await axios.get('/api/upcoming-events');
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
      await axios.delete(`/api/events/${eventId}`);
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
      <div className="loading-container">
        <div className="loading-content">
          <Loader2 className="loading-icon" size={40} />
          <h2>Loading your events...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <div className="header-info">
            <h1>
              <Calendar className="header-icon" size={32} />
              Welcome, {user.username}!
            </h1>
            <p className="header-subtitle">Manage your family's important events and reminders</p>
          </div>
          <div className="header-actions">
            <button
              className="action-button"
              onClick={() => setShowEventForm(true)}
            >
              <Plus size={20} />
              Add Event
            </button>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className={`dashboard-main ${upcomingEvents.length === 0 ? 'no-sidebar' : ''}`}>
        {upcomingEvents.length > 0 && (
          <div className="dashboard-sidebar">
            <div className="upcoming-events">
              <h2>
                <Bell className="section-icon" size={24} />
                Upcoming Events
              </h2>
              <div className="events-grid">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="event-card" style={{ borderTop: '4px solid #FF6B9D' }}>
                    <div className="event-card-header">
                      <h3>{event.title}</h3>
                    </div>
                    <div className="event-card-body">
                      <div className="event-date">
                        <Calendar size={16} />
                        {formatDate(event.event_date)}
                      </div>
                      <div className="event-countdown" style={{ color: '#FF6B9D', fontWeight: 'bold' }}>
                        <Clock size={16} />
                        {getDaysUntil(event.event_date)}
                      </div>
                      <div className="event-creator">
                        <Users size={14} />
                        {event.creator_name}
                      </div>
                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-content">
          <div className="section-header">
            <h2>
              <Users className="section-icon" size={24} />
              Family Events ({events.length})
            </h2>
            <p className="section-subtitle">
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
        </div>
      </div>

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