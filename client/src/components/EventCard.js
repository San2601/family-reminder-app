import React from 'react';
import { Edit3, Trash2, User, Calendar, Clock, Repeat, Gift, Heart, TreePine, Briefcase, Coffee } from 'lucide-react';

function EventCard({ event, onEdit, onDelete, formatDate, getDaysUntil, currentUser }) {
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

  const isCreator = currentUser && event.creator_id === currentUser.id;

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
          {formatDate(event.event_date)}
        </div>
        
        <div className="event-countdown">
          <Clock size={16} />
          <span style={{ 
            color: getDaysUntil(event.event_date).includes('ago') ? '#dc3545' : '#28a745'
          }}>
            {getDaysUntil(event.event_date)}
          </span>
        </div>
        
        <div className="event-creator">
          <User size={14} />
          Created by {event.creator_name}
        </div>
        
        {event.description && (
          <p className="event-description">{event.description}</p>
        )}
        
        <div className="event-meta">
          <span className="reminder-info">
            <Clock size={12} />
            Reminder: {event.reminder_days} days before
          </span>
          {event.is_recurring && (
            <span className="recurring-info">
              <Repeat size={12} />
              Recurring
            </span>
          )}
        </div>
      </div>
      
      {isCreator && (
        <div className="event-actions">
          <button
            className="btn btn-small btn-warning"
            onClick={() => onEdit(event)}
          >
            <Edit3 size={14} />
            Edit
          </button>
          <button
            className="btn btn-small btn-danger"
            onClick={handleDelete}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
      {!isCreator && (
        <div className="event-permissions-notice">
          Only the creator can edit this event
        </div>
      )}
    </div>
  );
}

export default EventCard;