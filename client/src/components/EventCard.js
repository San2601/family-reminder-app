import React from 'react';

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

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      onDelete(event.id);
    }
  };

  const isCreator = currentUser && event.creator_id === currentUser.id;

  return (
    <div className="event-card">
      <h3>{event.title}</h3>
      <div className="event-date">{formatDate(event.event_date)}</div>
      <div 
        className="event-type" 
        style={{ backgroundColor: getEventTypeColor(event.event_type) }}
      >
        {event.event_type}
      </div>
      <div style={{ 
        color: getDaysUntil(event.event_date).includes('ago') ? '#dc3545' : '#28a745',
        fontWeight: 'bold',
        marginTop: '10px'
      }}>
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
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          {event.description}
        </p>
      )}
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
        Reminder: {event.reminder_days} days before
        {event.is_recurring && ' • Recurring'}
      </div>
      {isCreator && (
        <div className="event-actions">
          <button
            className="btn btn-small btn-warning"
            onClick={() => onEdit(event)}
          >
            Edit
          </button>
          <button
            className="btn btn-small btn-danger"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
      {!isCreator && (
        <div style={{ 
          marginTop: '15px', 
          fontSize: '12px', 
          color: '#888',
          fontStyle: 'italic' 
        }}>
          Only the creator can edit this event
        </div>
      )}
    </div>
  );
}

export default EventCard;