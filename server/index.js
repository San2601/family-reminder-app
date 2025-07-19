const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type TEXT DEFAULT 'general',
    reminder_days INTEGER DEFAULT 7,
    is_recurring BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users (id)
  )`);

  // Migration: Check if old user_id column exists and migrate data
  db.all("PRAGMA table_info(events)", (err, columns) => {
    if (err) return;
    
    const hasUserIdColumn = columns.some(col => col.name === 'user_id');
    const hasCreatorIdColumn = columns.some(col => col.name === 'creator_id');
    
    if (hasUserIdColumn && !hasCreatorIdColumn) {
      console.log('Migrating events table from user_id to creator_id...');
      db.run(`ALTER TABLE events ADD COLUMN creator_id INTEGER`, () => {
        db.run(`UPDATE events SET creator_id = user_id WHERE creator_id IS NULL`, () => {
          console.log('Migration completed successfully');
        });
      });
    }
  });
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Registration failed' });
        }
        
        const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET);
        res.status(201).json({ 
          message: 'User registered successfully',
          token,
          user: { id: this.lastID, username, email }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Login failed' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ 
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  });
});

app.get('/api/events', authenticateToken, (req, res) => {
  db.all(
    `SELECT e.*, u.username as creator_name 
     FROM events e 
     JOIN users u ON e.creator_id = u.id 
     ORDER BY e.event_date ASC`,
    [],
    (err, events) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch events' });
      }
      res.json(events);
    }
  );
});

app.post('/api/events', authenticateToken, (req, res) => {
  const { title, description, event_date, event_type, reminder_days, is_recurring } = req.body;
  
  if (!title || !event_date) {
    return res.status(400).json({ error: 'Title and event date are required' });
  }

  db.run(
    'INSERT INTO events (creator_id, title, description, event_date, event_type, reminder_days, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, title, description, event_date, event_type || 'general', reminder_days || 7, is_recurring || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create event' });
      }
      
      db.get(
        `SELECT e.*, u.username as creator_name 
         FROM events e 
         JOIN users u ON e.creator_id = u.id 
         WHERE e.id = ?`, 
        [this.lastID], 
        (err, event) => {
          if (err) {
            return res.status(500).json({ error: 'Event created but failed to retrieve' });
          }
          res.status(201).json(event);
        }
      );
    }
  );
});

app.put('/api/events/:id', authenticateToken, (req, res) => {
  const { title, description, event_date, event_type, reminder_days, is_recurring } = req.body;
  const eventId = req.params.id;

  db.run(
    'UPDATE events SET title = ?, description = ?, event_date = ?, event_type = ?, reminder_days = ?, is_recurring = ? WHERE id = ? AND creator_id = ?',
    [title, description, event_date, event_type, reminder_days, is_recurring, eventId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update event' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Event not found or you are not the creator' });
      }
      
      res.json({ message: 'Event updated successfully' });
    }
  );
});

app.delete('/api/events/:id', authenticateToken, (req, res) => {
  const eventId = req.params.id;

  db.run(
    'DELETE FROM events WHERE id = ? AND creator_id = ?',
    [eventId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete event' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Event not found or you are not the creator' });
      }
      
      res.json({ message: 'Event deleted successfully' });
    }
  );
});

app.get('/api/upcoming-events', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  db.all(
    `SELECT e.*, u.username as creator_name 
     FROM events e 
     JOIN users u ON e.creator_id = u.id 
     WHERE e.event_date BETWEEN ? AND ? 
     ORDER BY e.event_date ASC`,
    [today, nextWeek],
    (err, events) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch upcoming events' });
      }
      res.json(events);
    }
  );
});

cron.schedule('0 9 * * *', () => {
  console.log('Checking for upcoming events to remind...');
  const today = new Date().toISOString().split('T')[0];
  
  db.all(
    `SELECT e.*, creator.email as creator_email, creator.username as creator_name 
     FROM events e 
     JOIN users creator ON e.creator_id = creator.id 
     WHERE DATE(e.event_date, '-' || e.reminder_days || ' days') = ?`,
    [today],
    (err, events) => {
      if (err) {
        console.error('Error checking reminders:', err);
        return;
      }
      
      events.forEach(event => {
        console.log(`Reminder: ${event.title} created by ${event.creator_name} is in ${event.reminder_days} days`);
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});