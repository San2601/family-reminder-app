const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const dbPath = path.join('/tmp', 'database.db');

const authenticateToken = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid token');
  }
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = authenticateToken(req);
    const db = new sqlite3.Database(dbPath);
    
    // First, let's generate some demo notifications for all users
    const today = new Date().toISOString().split('T')[0];
    
    // Get upcoming events for notifications
    const upcomingEvents = await new Promise((resolve, reject) => {
      const futureDate = new Date();
      futureDate.setDate(new Date().getDate() + 7);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      db.all(
        `SELECT e.* FROM events e WHERE e.event_date BETWEEN ? AND ?`,
        [today, futureDateStr],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    // Create notifications if they don't exist
    for (const event of upcomingEvents) {
      const eventDate = new Date(event.event_date);
      const todayDate = new Date();
      const daysUntil = Math.ceil((eventDate - todayDate) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= (event.reminder_days || 1) && daysUntil >= 0) {
        // Check if notification already exists for today
        const existingNotification = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM notifications WHERE user_id = ? AND event_id = ? AND DATE(created_at) = DATE(?)',
            [user.id || user.userId, event.id, today],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        
        if (!existingNotification) {
          let message = '';
          if (daysUntil === 0) {
            message = `${event.title} is today! 🎉`;
          } else if (daysUntil === 1) {
            message = `${event.title} is tomorrow! 📅`;
          } else {
            message = `${event.title} is in ${daysUntil} days! ⏰`;
          }
          
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO notifications (user_id, event_id, title, message) VALUES (?, ?, ?, ?)',
              [user.id || user.userId, event.id, `Upcoming: ${event.title}`, message],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }
    }
    
    // Get unread count
    const count = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        [user.id || user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.count : 0);
        }
      );
    });
    
    db.close();
    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Unread count API Error:', error);
    if (error.message === 'Access token required' || error.message === 'Invalid token') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};