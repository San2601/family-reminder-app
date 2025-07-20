const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

// Database path for serverless environment
const dbPath = path.join('/tmp', 'database.db');

const initDatabase = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error('Users table error:', err);
      });
      
      db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        event_type TEXT DEFAULT 'birthday',
        reminder_days INTEGER DEFAULT 1,
        is_recurring BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users (id)
      )`, (err) => {
        if (err) console.error('Events table error:', err);
      });
      
      db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        event_id INTEGER,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (event_id) REFERENCES events (id)
      )`, (err) => {
        if (err) {
          console.error('Notifications table error:', err);
          reject(err);
        } else {
          console.log('Database tables initialized successfully');
          resolve();
        }
      });
    });
  });
};

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

// Generate notifications for upcoming events
const generateNotifications = async (db, userId = null) => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 30); // Look 30 days ahead
  
  const todayStr = today.toISOString().split('T')[0];
  const futureDateStr = futureDate.toISOString().split('T')[0];
  
  // Get events that need notifications
  const events = await new Promise((resolve, reject) => {
    let query = `
      SELECT e.*, COALESCE(u.username, 'Unknown User') as creator_name 
      FROM events e 
      LEFT JOIN users u ON e.creator_id = u.id 
      WHERE e.event_date BETWEEN ? AND ?
    `;
    let params = [todayStr, futureDateStr];
    
    if (userId) {
      // For specific user, we can show all events since it's a family app
      // But we'll generate notifications for all users for all events
    }
    
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
  
  // Get all users to generate notifications for everyone
  const users = await new Promise((resolve, reject) => {
    db.all('SELECT id FROM users', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
  
  // Generate notifications for each event and each user
  for (const event of events) {
    const eventDate = new Date(event.event_date);
    const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    
    // Create notification if event is due for reminder
    if (daysUntil <= event.reminder_days && daysUntil >= 0) {
      for (const user of users) {
        // Check if notification already exists
        const existingNotification = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM notifications WHERE user_id = ? AND event_id = ? AND DATE(created_at) = DATE(?)',
            [user.id, event.id, todayStr],
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
          
          // Create notification
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO notifications (user_id, event_id, title, message) VALUES (?, ?, ?, ?)',
              [user.id, event.id, `Upcoming: ${event.title}`, message],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }
    }
  }
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = authenticateToken(req);
    const db = new sqlite3.Database(dbPath);
    await initDatabase(db);
    
    // Generate fresh notifications
    await generateNotifications(db, user.id || user.userId);
    
    if (req.method === 'GET') {
      const { path } = req.url.split('?')[0];
      
      if (path.endsWith('/unread-count')) {
        // Get unread notification count
        const count = await new Promise((resolve, reject) => {
          db.get(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [user.id || user.userId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row.count || 0);
            }
          );
        });
        
        db.close();
        res.json({ count });
      } else {
        // Get all notifications for user
        const notifications = await new Promise((resolve, reject) => {
          db.all(
            `SELECT n.*, e.title as event_title, e.event_date 
             FROM notifications n 
             LEFT JOIN events e ON n.event_id = e.id 
             WHERE n.user_id = ? 
             ORDER BY n.created_at DESC 
             LIMIT 50`,
            [user.id || user.userId],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });
        
        db.close();
        res.json(notifications);
      }
    } else if (req.method === 'PUT') {
      // Mark notification as read
      const { id } = req.query;
      
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
          [id, user.id || user.userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      db.close();
      res.json({ message: 'Notification marked as read' });
    } else if (req.method === 'POST' && req.url.includes('mark-all-read')) {
      // Mark all notifications as read
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
          [user.id || user.userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      db.close();
      res.json({ message: 'All notifications marked as read' });
    } else {
      db.close();
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Notifications API Error:', error);
    if (error.message === 'Access token required' || error.message === 'Invalid token') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};