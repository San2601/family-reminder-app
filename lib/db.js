import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

export async function openDB() {
  if (db) return db;
  
  const dbPath = process.env.NODE_ENV === 'production' 
    ? '/tmp/database.db' 
    : join(__dirname, '..', 'database.db');
  
  db = new Database(dbPath);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
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
    );
  `);

  // Wrap database methods to return promises
  const originalRun = db.prepare.bind(db);
  db.run = (sql, params = []) => {
    const stmt = originalRun(sql);
    return stmt.run(params);
  };
  
  db.get = (sql, params = []) => {
    const stmt = originalRun(sql);
    return stmt.get(params);
  };
  
  db.all = (sql, params = []) => {
    const stmt = originalRun(sql);
    return stmt.all(params);
  };
  
  return db;
}