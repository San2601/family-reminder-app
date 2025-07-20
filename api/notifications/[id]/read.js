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
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = authenticateToken(req);
    const { id } = req.query;
    const db = new sqlite3.Database(dbPath);
    
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
  } catch (error) {
    console.error('Mark read API Error:', error);
    if (error.message === 'Access token required' || error.message === 'Invalid token') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};