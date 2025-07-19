import jwt from 'jsonwebtoken';
import { openDB } from '../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

  try {
    const user = authenticateToken(req);
    const db = await openDB();
    
    if (req.method === 'GET') {
      const { upcoming } = req.query;
      
      if (upcoming === 'true') {
        // Get upcoming events (next 7 days)
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const events = await db.all(
          `SELECT e.*, u.username as creator_name 
           FROM events e 
           JOIN users u ON e.creator_id = u.id 
           WHERE e.event_date BETWEEN ? AND ? 
           ORDER BY e.event_date ASC`,
          [today, nextWeek]
        );
        
        res.json(events);
      } else {
        // Get all events
        const events = await db.all(
          `SELECT e.*, u.username as creator_name 
           FROM events e 
           JOIN users u ON e.creator_id = u.id 
           ORDER BY e.event_date ASC`
        );
        
        res.json(events);
      }
    } 
    
    else if (req.method === 'POST') {
      const { title, description, event_date, event_type, reminder_days, is_recurring } = req.body;
      
      if (!title || !event_date) {
        return res.status(400).json({ error: 'Title and event date are required' });
      }

      const result = await db.run(
        'INSERT INTO events (creator_id, title, description, event_date, event_type, reminder_days, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.id, title, description, event_date, event_type || 'general', reminder_days || 7, is_recurring || 0]
      );
      
      const event = await db.get(
        `SELECT e.*, u.username as creator_name 
         FROM events e 
         JOIN users u ON e.creator_id = u.id 
         WHERE e.id = ?`, 
        [result.lastID]
      );
      
      res.status(201).json(event);
    } 
    
    else if (req.method === 'PUT') {
      const { id } = req.query;
      const { title, description, event_date, event_type, reminder_days, is_recurring } = req.body;

      const result = await db.run(
        'UPDATE events SET title = ?, description = ?, event_date = ?, event_type = ?, reminder_days = ?, is_recurring = ? WHERE id = ? AND creator_id = ?',
        [title, description, event_date, event_type, reminder_days, is_recurring, id, user.id]
      );
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Event not found or you are not the creator' });
      }
      
      res.json({ message: 'Event updated successfully' });
    } 
    
    else if (req.method === 'DELETE') {
      const { id } = req.query;

      const result = await db.run(
        'DELETE FROM events WHERE id = ? AND creator_id = ?',
        [id, user.id]
      );
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Event not found or you are not the creator' });
      }
      
      res.json({ message: 'Event deleted successfully' });
    } 
    
    else {
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
}