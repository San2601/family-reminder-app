// Simple API handler for Vercel
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

// Database setup
const db = new sqlite3.Database('./database.db');

// Initialize database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
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
  )`);
});

// Routes
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'User already exists' });
        }
        
        const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: this.lastID, username, email } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/api/events', verifyToken, (req, res) => {
  db.all(`
    SELECT e.*, u.username as creator_name 
    FROM events e 
    JOIN users u ON e.creator_id = u.id 
    ORDER BY e.event_date ASC
  `, (err, events) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(events);
  });
});

app.post('/api/events', verifyToken, (req, res) => {
  const { title, description, event_date, event_type, reminder_days, is_recurring } = req.body;
  
  db.run(
    'INSERT INTO events (creator_id, title, description, event_date, event_type, reminder_days, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.userId, title, description, event_date, event_type || 'birthday', reminder_days || 1, is_recurring || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create event' });
      }
      res.json({ id: this.lastID, message: 'Event created successfully' });
    }
  );
});

module.exports = app;