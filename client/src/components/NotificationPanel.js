import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CheckCheck, Bell } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import NotificationItem from './NotificationItem';
import logger from '../utils/logger';

function NotificationPanel({ onClose, onNotificationRead }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications');
      setNotifications(response.data);
    } catch (error) {
      logger.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: 1 } : notif
        )
      );
      onNotificationRead();
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/mark-all-read');
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: 1 }))
      );
      onNotificationRead();
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return notificationDate.toLocaleDateString();
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedRight: onClose,
    onSwipedDown: onClose,
    preventDefaultTouchmoveEvent: true,
    trackTouch: true,
    trackMouse: false
  });

  return (
    <div className="notification-panel-overlay" onClick={onClose}>
      <div 
        className="notification-panel" 
        onClick={(e) => e.stopPropagation()}
        {...swipeHandlers}
      >
        <div className="notification-header">
          <h3>Notifications</h3>
          <div className="notification-header-actions">
            {unreadNotifications.length > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck size={16} />
              </button>
            )}
            <button className="close-panel-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="notification-content">
          {loading ? (
            <div className="notification-loading">
              <div className="loading-spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="no-notifications">
              <Bell size={48} />
              <h4>No notifications yet</h4>
              <p>You'll see family event notifications here</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationPanel;