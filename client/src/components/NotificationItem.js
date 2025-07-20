import React from 'react';
import { useSwipeable } from 'react-swipeable';
import { Calendar, User, Check } from 'lucide-react';

function NotificationItem({ notification, onMarkAsRead, formatTimeAgo }) {
  // Swipe handlers for individual notifications
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!notification.is_read) {
        onMarkAsRead(notification.id);
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackTouch: true,
    trackMouse: false
  });

  return (
    <div 
      className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
      {...swipeHandlers}
    >
      <div className="notification-icon">
        <Calendar size={20} />
      </div>
      <div className="notification-body">
        <h4>{notification.title}</h4>
        <p>{notification.message}</p>
        <div className="notification-meta">
          <span className="notification-time">
            {formatTimeAgo(notification.created_at)}
          </span>
          <span className="notification-creator">
            <User size={12} />
            {notification.creator_name}
          </span>
        </div>
      </div>
      {!notification.is_read && (
        <button 
          className="mark-read-btn"
          onClick={() => onMarkAsRead(notification.id)}
          title="Mark as read"
        >
          <Check size={14} />
        </button>
      )}
    </div>
  );
}

export default NotificationItem;