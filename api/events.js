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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const user = authenticateToken(req);
    const db = new sqlite3.Database(dbPath);
    await initDatabase(db);
    
    if (req.method === 'GET') {
      const { upcoming } = req.query;
      
      if (upcoming === 'true') {
        // Get upcoming events (next 7 days)
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const events = await new Promise((resolve, reject) => {
          db.all(
            `SELECT e.*, u.username as creator_name 
             FROM events e 
             JOIN users u ON e.creator_id = u.id 
             WHERE e.event_date BETWEEN ? AND ? 
             ORDER BY e.event_date ASC`,
            [today, nextWeek],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });
        
        db.close();
        res.json(events);
      } else {
        // Get all events
        const events = await new Promise((resolve, reject) => {
          db.all(
            `SELECT e.*, u.username as creator_name 
             FROM events e 
             JOIN users u ON e.creator_id = u.id 
             ORDER BY e.event_date ASC`,
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });
        
        db.close();
        res.json(events);
      }
    } 
    
    else if (req.method === 'POST') {
      const { title, description, event_date, event_type, reminder_days, is_recurring } = req.body;
      
      if (!title || !event_date) {
        db.close();
        return res.status(400).json({ error: 'Title and event date are required' });
      }

      const result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO events (creator_id, title, description, event_date, event_type, reminder_days, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [user.id || user.userId, title, description, event_date, event_type || 'birthday', reminder_days || 1, is_recurring || 0],
          function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID });
          }
        );
      });
      
      db.close();
      res.status(201).json({ id: result.lastID, message: 'Event created successfully' });
    } 
    
    else {
      db.close();
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    if (error.message === 'Access token required' || error.message === 'Invalid token') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};