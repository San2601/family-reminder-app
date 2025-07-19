import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { openDB } from '../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const db = await openDB();
  
  if (req.method === 'POST') {
    const { action, username, email, password } = req.body;
    
    if (action === 'register') {
      try {
        if (!username || !email || !password) {
          return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        const existingUser = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existingUser) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.run(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hashedPassword]
        );
        
        const token = jwt.sign({ id: result.lastID, username }, JWT_SECRET);
        res.status(201).json({ 
          message: 'User registered successfully',
          token,
          user: { id: result.lastID, username, email }
        });
      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
      }
    } 
    
    else if (action === 'login') {
      try {
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        
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
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}