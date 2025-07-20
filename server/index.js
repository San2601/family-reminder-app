const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult, param } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security: Ensure JWT_SECRET is set
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  console.error('CRITICAL SECURITY ERROR: JWT_SECRET not properly configured!');
  console.error('Please set a strong JWT_SECRET in your environment variables.');
  process.exit(1);
}

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 'Please wait before making more requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: (process.env.LOGIN_RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 'Account temporarily locked due to multiple failed attempts.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slow down repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: 500 // add 500ms delay per request after delayAfter
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use(speedLimiter);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT 0,
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

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    creator_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'event_created',
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (event_id) REFERENCES events (id),
    FOREIGN KEY (creator_id) REFERENCES users (id)
  )`);

  // Note: Admin users should be created through proper administrative processes
  // Removed hardcoded admin assignment for security
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

const requireAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Helper function to create notifications for all family members
const createNotificationsForEvent = (eventId, creatorId, title, eventType, callback) => {
  // Get all users except the creator
  db.all('SELECT id, username FROM users WHERE id != ?', [creatorId], (err, users) => {
    if (err) {
      console.error('Error fetching users for notifications:', err);
      return callback(err);
    }

    if (users.length === 0) {
      return callback(null); // No other users to notify
    }

    // Get creator's name
    db.get('SELECT username FROM users WHERE id = ?', [creatorId], (err, creator) => {
      if (err) {
        console.error('Error fetching creator info:', err);
        return callback(err);
      }

      const creatorName = creator ? creator.username : 'Someone';
      const message = `${creatorName} created a new ${eventType}: "${title}"`;

      // Create notifications for each family member
      const insertPromises = users.map(user => {
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO notifications (user_id, event_id, creator_id, title, message, type) VALUES (?, ?, ?, ?, ?, ?)',
            [user.id, eventId, creatorId, `New Event: ${title}`, message, 'event_created'],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      });

      Promise.all(insertPromises)
        .then(() => callback(null))
        .catch(callback);
    });
  });
};

// Input validation middleware
const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters, alphanumeric with - and _ allowed'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .notEmpty()
    .withMessage('Password required')
];

// Secure error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => err.msg)
    });
  }
  next();
};

// Generic error handler - don't expose internal details
const handleDatabaseError = (err, operation) => {
  console.error(`Database error in ${operation}:`, err);
  
  if (err.message.includes('UNIQUE constraint failed')) {
    if (err.message.includes('email')) {
      return { status: 400, message: 'Email already registered' };
    }
    if (err.message.includes('username')) {
      return { status: 400, message: 'Username already taken' };
    }
    return { status: 400, message: 'User already exists' };
  }
  
  return { status: 500, message: 'Operation failed' };
};

app.post('/api/register', validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 12); // Increased cost factor
    
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          const errorResponse = handleDatabaseError(err, 'registration');
          return res.status(errorResponse.status).json({ error: errorResponse.message });
        }
        
        const token = jwt.sign(
          { id: this.lastID, username, email }, 
          JWT_SECRET,
          { expiresIn: '24h' } // Add token expiration
        );
        
        res.status(201).json({ 
          message: 'User registered successfully',
          token,
          user: { id: this.lastID, username, email, is_admin: false }
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Database error in login:', err);
        return res.status(500).json({ error: 'Login failed' });
      }
      
      // Always hash the password even if user doesn't exist to prevent timing attacks
      const dummyHash = '$2b$12$dummy.hash.to.prevent.timing.attacks.dummy.hash.value';
      const passwordToCheck = user ? user.password : dummyHash;
      
      const isPasswordValid = await bcrypt.compare(password, passwordToCheck);
      
      if (!user || !isPasswordValid) {
        // Same error message to prevent user enumeration
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          is_admin: user.is_admin 
        }, 
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ 
        message: 'Login successful',
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          is_admin: user.is_admin 
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
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

// Event validation middleware
const validateEvent = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .escape()
    .withMessage('Title must be 1-255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .escape()
    .withMessage('Description must be less than 1000 characters'),
  body('event_date')
    .isISO8601()
    .toDate()
    .withMessage('Valid date required (YYYY-MM-DD format)'),
  body('event_type')
    .optional()
    .isIn(['birthday', 'anniversary', 'holiday', 'meeting', 'reminder', 'general'])
    .withMessage('Invalid event type'),
  body('reminder_days')
    .optional()
    .isInt({ min: 0, max: 365 })
    .toInt()
    .withMessage('Reminder days must be 0-365'),
  body('is_recurring')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('is_recurring must be boolean')
];

app.post('/api/events', authenticateToken, validateEvent, handleValidationErrors, (req, res) => {
  const { title, description, event_date, event_type, reminder_days, is_recurring } = req.body;

  db.run(
    'INSERT INTO events (creator_id, title, description, event_date, event_type, reminder_days, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, title, description, event_date, event_type || 'general', reminder_days || 7, is_recurring || false],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create event' });
      }
      
      const eventId = this.lastID;
      
      // Create notifications for all family members
      createNotificationsForEvent(eventId, req.user.id, title, event_type, (notificationErr) => {
        if (notificationErr) {
          console.error('Error creating notifications:', notificationErr);
          // Don't fail the event creation if notifications fail
        }
        
        // Return the created event
        db.get(
          `SELECT e.*, u.username as creator_name 
           FROM events e 
           JOIN users u ON e.creator_id = u.id 
           WHERE e.id = ?`, 
          [eventId], 
          (err, event) => {
            if (err) {
              return res.status(500).json({ error: 'Event created but failed to retrieve' });
            }
            res.status(201).json(event);
          }
        );
      });
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

// Admin-only route to delete any event
app.delete('/api/admin/events/:id', authenticateToken, requireAdmin, (req, res) => {
  const eventId = req.params.id;

  // First get the event details for logging
  db.get('SELECT title, creator_id FROM events WHERE id = ?', [eventId], (err, event) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch event details' });
    }
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete the event
    db.run('DELETE FROM events WHERE id = ?', [eventId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete event' });
      }
      
      // Also delete related notifications
      db.run('DELETE FROM notifications WHERE event_id = ?', [eventId], (err) => {
        if (err) {
          console.error('Error deleting related notifications:', err);
        }
      });
      
      console.log(`Admin ${req.user.username} deleted event "${event.title}" (ID: ${eventId})`);
      res.json({ message: 'Event deleted successfully by admin' });
    });
  });
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

// Get notifications for the current user
app.get('/api/notifications', authenticateToken, (req, res) => {
  db.all(
    `SELECT n.*, creator.username as creator_name
     FROM notifications n
     JOIN users creator ON n.creator_id = creator.id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [req.user.id],
    (err, notifications) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }
      res.json(notifications);
    }
  );
});

// Get unread notifications count
app.get('/api/notifications/unread-count', authenticateToken, (req, res) => {
  db.get(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [req.user.id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch unread count' });
      }
      res.json({ count: result.count });
    }
  );
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const notificationId = req.params.id;
  
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to mark notification as read' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      res.json({ message: 'Notification marked as read' });
    }
  );
});

// Mark all notifications as read
app.put('/api/notifications/mark-all-read', authenticateToken, (req, res) => {
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
    [req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to mark notifications as read' });
      }
      
      res.json({ message: 'All notifications marked as read', updated: this.changes });
    }
  );
});

// Manual trigger for testing reminder notifications
app.post('/api/trigger-reminders', authenticateToken, (req, res) => {
  console.log('Manual trigger for reminder notifications...');
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
        return res.status(500).json({ error: 'Failed to check reminders' });
      }
      
      if (events.length === 0) {
        return res.json({ message: 'No events found that need reminders today', count: 0 });
      }
      
      let processedCount = 0;
      
      events.forEach(event => {
        console.log(`Reminder: ${event.title} created by ${event.creator_name} is in ${event.reminder_days} days`);
        
        // Create reminder notifications for all family members
        db.all('SELECT id, username FROM users', [], (err, users) => {
          if (err) {
            console.error('Error fetching users for reminder notifications:', err);
            return;
          }
          
          const daysUntil = event.reminder_days;
          const message = `Don't forget: "${event.title}" is ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}! Created by ${event.creator_name}.`;
          
          users.forEach(user => {
            // Check if we already sent this reminder notification to avoid duplicates
            db.get(
              'SELECT id FROM notifications WHERE user_id = ? AND event_id = ? AND type = ? AND DATE(created_at) = ?',
              [user.id, event.id, 'reminder', today],
              (err, existingNotification) => {
                if (err) {
                  console.error('Error checking existing notifications:', err);
                  return;
                }
                
                // Only create notification if it doesn't exist
                if (!existingNotification) {
                  db.run(
                    'INSERT INTO notifications (user_id, event_id, creator_id, title, message, type) VALUES (?, ?, ?, ?, ?, ?)',
                    [user.id, event.id, event.creator_id, `Reminder: ${event.title}`, message, 'reminder'],
                    function(err) {
                      if (err) {
                        console.error('Error creating reminder notification:', err);
                      } else {
                        console.log(`Created reminder notification for user ${user.username} about event "${event.title}"`);
                      }
                    }
                  );
                }
              }
            );
          });
          
          processedCount++;
          if (processedCount === events.length) {
            res.json({ message: 'Reminder notifications processed', eventsProcessed: events.length });
          }
        });
      });
    }
  );
});

// Run daily at 9 AM to check for reminders
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
        
        // Create reminder notifications for all family members
        db.all('SELECT id, username FROM users', [], (err, users) => {
          if (err) {
            console.error('Error fetching users for reminder notifications:', err);
            return;
          }
          
          const daysUntil = event.reminder_days;
          const message = `Don't forget: "${event.title}" is ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}! Created by ${event.creator_name}.`;
          
          users.forEach(user => {
            // Check if we already sent this reminder notification to avoid duplicates
            db.get(
              'SELECT id FROM notifications WHERE user_id = ? AND event_id = ? AND type = ? AND DATE(created_at) = ?',
              [user.id, event.id, 'reminder', today],
              (err, existingNotification) => {
                if (err) {
                  console.error('Error checking existing notifications:', err);
                  return;
                }
                
                // Only create notification if it doesn't exist
                if (!existingNotification) {
                  db.run(
                    'INSERT INTO notifications (user_id, event_id, creator_id, title, message, type) VALUES (?, ?, ?, ?, ?, ?)',
                    [user.id, event.id, event.creator_id, `Reminder: ${event.title}`, message, 'reminder'],
                    function(err) {
                      if (err) {
                        console.error('Error creating reminder notification:', err);
                      } else {
                        console.log(`Created reminder notification for user ${user.username} about event "${event.title}"`);
                      }
                    }
                  );
                }
              }
            );
          });
        });
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});