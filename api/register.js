const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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
        if (err) reject(err);
        else resolve();
      });
    });
  });
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = new sqlite3.Database(dbPath);
  
  try {
    await initDatabase(db);
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });
    
    const token = jwt.sign({ id: result.lastID, userId: result.lastID }, JWT_SECRET, { expiresIn: '24h' });
    db.close();
    
    res.json({ token, user: { id: result.lastID, username, email } });
  } catch (error) {
    console.error('Registration error:', error);
    db.close();
    
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'User already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
};