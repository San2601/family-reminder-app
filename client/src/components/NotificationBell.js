import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell } from 'lucide-react';
import NotificationPanel from './NotificationPanel';

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBellClick = () => {
    setShowPanel(!showPanel);
  };

  const handleNotificationRead = () => {
    fetchUnreadCount(); // Refresh count when notifications are marked as read
  };

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell" 
        onClick={handleBellClick}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      
      {showPanel && (
        <NotificationPanel 
          onClose={() => setShowPanel(false)}
          onNotificationRead={handleNotificationRead}
        />
      )}
    </div>
  );
}

export default NotificationBell;