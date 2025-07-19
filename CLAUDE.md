# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Family Reminder App - a full-stack web application that helps families remember important birthdays, anniversaries, and events. Users can create accounts, manage events, and receive reminders.

## Development Commands

### Setup
```bash
npm run install-deps    # Install dependencies for both client and server
```

### Development
```bash
npm run dev             # Run both frontend and backend in development
npm run server          # Run backend only (port 5000)
npm run client          # Run frontend only (port 3000)
```

### Production
```bash
npm run build           # Build frontend for production
npm start               # Start production server
```

## Architecture

### Tech Stack
- **Backend**: Node.js + Express.js + SQLite + JWT authentication
- **Frontend**: React 18 + Axios
- **Database**: SQLite (database.db file)
- **Deployment**: Ready for Vercel, Netlify, Railway

### Project Structure
```
├── server/             # Backend Express.js application
│   └── index.js       # Main server file with all API routes
├── client/            # React frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── App.js       # Main App component
│   │   └── index.js     # React entry point
│   └── package.json
├── package.json       # Root package.json with scripts
├── .env              # Environment variables (JWT_SECRET, PORT)
└── vercel.json       # Vercel deployment configuration
```

### Key Features
- User registration/login with JWT authentication
- **Shared family events** - All users can see events created by any family member
- Event CRUD operations (Create, Read, Update, Delete) - only creators can edit/delete their events
- Multiple event types (birthday, anniversary, holiday, etc.)
- Configurable reminder periods (1 day to 1 month before)
- Recurring events support
- Upcoming events dashboard (next 7 days)
- Creator identification on each event
- Scheduled reminder system using node-cron

### Database Schema
- **users**: id, username, email, password, created_at
- **events**: id, creator_id, title, description, event_date, event_type, reminder_days, is_recurring, created_at

### API Routes
- POST /api/register, /api/login - Authentication
- GET/POST/PUT/DELETE /api/events - Event management
- GET /api/upcoming-events - Events in next 7 days

## Environment Variables
Required in .env file:
- JWT_SECRET: Secret key for JWT tokens
- PORT: Server port (default: 5000)

## Deployment
- Configured for Vercel deployment with vercel.json
- Frontend serves from client/build/
- Backend API routes under /api/
- Database file (database.db) created automatically