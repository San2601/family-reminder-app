import React, { useState, useEffect } from 'react';
import axios from 'axios';

function EventForm({ event, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_type: 'birthday',
    reminder_days: 7,
    is_recurring: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        event_date: event.event_date || '',
        event_type: event.event_type || 'birthday',
        reminder_days: event.reminder_days || 7,
        is_recurring: Boolean(event.is_recurring)
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (event) {
        response = await axios.put(`/events/${event.id}`, formData);
        onSave({ ...event, ...formData });
      } else {
        response = await axios.post('/events', formData);
        onSave(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{event ? 'Edit Event' : 'Add New Event'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Event Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Mom's Birthday, Anniversary"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="event_date">Date *</label>
            <input
              type="date"
              id="event_date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="event_type">Type</label>
            <select
              id="event_type"
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
            >
              <option value="birthday">Birthday</option>
              <option value="anniversary">Anniversary</option>
              <option value="holiday">Holiday</option>
              <option value="appointment">Appointment</option>
              <option value="meeting">Meeting</option>
              <option value="general">General Event</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="reminder_days">Remind me (days before)</label>
            <select
              id="reminder_days"
              name="reminder_days"
              value={formData.reminder_days}
              onChange={handleChange}
            >
              <option value={1}>1 day before</option>
              <option value={3}>3 days before</option>
              <option value={7}>1 week before</option>
              <option value={14}>2 weeks before</option>
              <option value={30}>1 month before</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Additional details about the event"
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px',
                resize: 'vertical'
              }}
            />
          </div>
          
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                name="is_recurring"
                checked={formData.is_recurring}
                onChange={handleChange}
              />
              Recurring annually (for birthdays, anniversaries)
            </label>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventForm;