import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, X, Calendar, Clock, Type, AlignLeft, Repeat } from 'lucide-react';

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
        response = await axios.put(`/api/events/${event.id}`, formData);
        onSave({ ...event, ...formData });
      } else {
        response = await axios.post('/api/events', formData);
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
        <div className="modal-header">
          <h2>
            <Calendar size={24} />
            {event ? 'Edit Event' : 'Add New Event'}
          </h2>
          <button className="modal-close" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="enhanced-form">
          <div className="form-group">
            <label htmlFor="title">
              <Type size={16} />
              Event Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Mom's Birthday, Anniversary"
              required
              autoComplete="off"
              autoCapitalize="words"
              maxLength="255"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="event_date">
                <Calendar size={16} />
                Date *
              </label>
              <input
                type="date"
                id="event_date"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                required
                autoComplete="off"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="event_type">
                <Type size={16} />
                Type
              </label>
              <select
                id="event_type"
                name="event_type"
                value={formData.event_type}
                onChange={handleChange}
              >
                <option value="birthday">🎂 Birthday</option>
                <option value="anniversary">💖 Anniversary</option>
                <option value="holiday">🎄 Holiday</option>
                <option value="appointment">💼 Appointment</option>
                <option value="meeting">☕ Meeting</option>
                <option value="general">📅 General Event</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="reminder_days">
              <Clock size={16} />
              Remind me (days before)
            </label>
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
            <label htmlFor="description">
              <AlignLeft size={16} />
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Additional details about the event"
              rows={3}
              autoComplete="off"
              autoCapitalize="sentences"
              maxLength="1000"
            />
          </div>
          
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_recurring"
                checked={formData.is_recurring}
                onChange={handleChange}
              />
              <span className="checkmark">
                <Repeat size={16} />
              </span>
              Recurring annually (for birthdays, anniversaries)
            </label>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} />
              {loading ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventForm;