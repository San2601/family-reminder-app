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
        if (err) reject(err);
        else resolve();
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
    const { id } = req.query;
    const db = new sqlite3.Database(dbPath);
    await initDatabase(db);
    
    if (req.method === 'PUT') {
      // Allow any user to edit any event (family app)
      const { title, description, event_date, event_type, reminder_days, is_recurring } = req.body;
      
      if (!title || !event_date) {
        db.close();
        return res.status(400).json({ error: 'Title and event date are required' });
      }

      const result = await new Promise((resolve, reject) => {
        db.run(
          'UPDATE events SET title = ?, description = ?, event_date = ?, event_type = ?, reminder_days = ?, is_recurring = ? WHERE id = ?',
          [title, description, event_date, event_type || 'birthday', reminder_days || 1, is_recurring || 0, id],
          function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          }
        );
      });
      
      if (result.changes === 0) {
        db.close();
        return res.status(404).json({ error: 'Event not found' });
      }
      
      db.close();
      res.json({ message: 'Event updated successfully' });
    } 
    
    else if (req.method === 'DELETE') {
      // Allow any user to delete any event (family app)
      console.log('Attempting to delete event with ID:', id);

      const result = await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM events WHERE id = ?',
          [id],
          function(err) {
            if (err) {
              console.error('Delete error:', err);
              reject(err);
            } else {
              console.log('Delete result - changes:', this.changes);
              resolve({ changes: this.changes });
            }
          }
        );
      });
      
      if (result.changes === 0) {
        db.close();
        return res.status(404).json({ error: 'Event not found' });
      }
      
      db.close();
      res.json({ message: 'Event deleted successfully' });
    }
    
    else {
      db.close();
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Event API Error:', error);
    if (error.message === 'Access token required' || error.message === 'Invalid token') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};