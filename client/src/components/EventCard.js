import React from 'react';
import { Edit3, Trash2, User, Calendar, Clock, Repeat, Gift, Heart, TreePine, Briefcase, Coffee, Shield } from 'lucide-react';
import axios from 'axios';

function EventCard({ event, onEdit, onDelete, formatDate, getDaysUntil, currentUser, onAdminDelete }) {
  // Safe date formatting
  const safeFormatDate = (dateString) => {
    if (!dateString) return 'Invalid Date';
    try {
      return formatDate(dateString);
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return 'Invalid Date';
    }
  };

  // Safe days until calculation
  const safeGetDaysUntil = (dateString) => {
    if (!dateString) return 'Invalid Date';
    try {
      return getDaysUntil(dateString);
    } catch (error) {
      console.error('Days until error:', error, dateString);
      return 'Invalid Date';
    }
  };
  const getEventTypeColor = (type) => {
    const colors = {
      birthday: '#ff6b6b',
      anniversary: '#ff9ff3',
      holiday: '#51cf66',
      appointment: '#339af0',
      meeting: '#ffd43b',
      general: '#667eea'
    };
    return colors[type] || colors.general;
  };

  const getEventTypeIcon = (type) => {
    const icons = {
      birthday: Gift,
      anniversary: Heart,
      holiday: TreePine,
      appointment: Briefcase,
      meeting: Coffee,
      general: Calendar
    };
    const IconComponent = icons[type] || icons.general;
    return <IconComponent size={16} />;
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      onDelete(event.id);
    }
  };

  const handleAdminDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${event.title}" as an admin? This action cannot be undone.`)) {
      try {
        await axios.delete(`/api/admin/events/${event.id}`);
        if (onAdminDelete) {
          onAdminDelete(event.id);
        }
      } catch (error) {
        console.error('Error deleting event as admin:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  // In a family app, everyone can edit/delete any event
  const canEdit = currentUser && true; // All logged-in users can edit
  const canDelete = currentUser && true; // All logged-in users can delete

  return (
    <div className="event-card">
      <div className="event-card-header">
        <h3>{event.title}</h3>
        <div 
          className="event-type-badge" 
          style={{ backgroundColor: getEventTypeColor(event.event_type) }}
        >
          {getEventTypeIcon(event.event_type)}
          {event.event_type}
        </div>
      </div>
      
      <div className="event-card-body">
        <div className="event-date">
          <Calendar size={16} />
          {safeFormatDate(event.event_date)}
        </div>
        
        <div className="event-countdown">
          <Clock size={16} />
          <span style={{ 
            color: safeGetDaysUntil(event.event_date).includes('ago') ? '#dc3545' : '#28a745'
          }}>
            {safeGetDaysUntil(event.event_date)}
          </span>
        </div>
        
        <div className="event-creator">
          <User size={14} />
          Created by {event.creator_name || 'Unknown'}
        </div>
        
        {event.description && (
          <p className="event-description">{event.description}</p>
        )}
        
        <div className="event-meta">
          <span className="reminder-info">
            <Clock size={12} />
            Reminder: {event.reminder_days || 1} days before
          </span>
          {event.is_recurring && (
            <span className="recurring-info">
              <Repeat size={12} />
              Recurring
            </span>
          )}
        </div>
      </div>
      
      {(canEdit || canDelete) && (
        <div className="event-actions">
          {canEdit && (
            <button
              className="btn btn-small btn-warning"
              onClick={() => onEdit(event)}
            >
              <Edit3 size={14} />
              Edit
            </button>
          )}
          {canDelete && (
            <button
              className="btn btn-small btn-danger"
              onClick={handleDelete}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      )}
      {!canEdit && !canDelete && (
        <div className="event-permissions-notice">
          Please log in to edit events
        </div>
      )}
    </div>
  );
}

export default EventCard;