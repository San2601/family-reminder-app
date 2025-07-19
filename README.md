# Family Reminder App

A web application to help families remember important birthdays, anniversaries, and events. Users can create accounts, add events, and receive reminders before important dates.

## Features

- **User Authentication**: Secure registration and login system
- **Event Management**: Create, edit, and delete events
- **Multiple Event Types**: Support for birthdays, anniversaries, holidays, appointments, meetings, and general events
- **Smart Reminders**: Configurable reminder periods (1 day to 1 month before)
- **Recurring Events**: Annual recurring for birthdays and anniversaries
- **Upcoming Events Dashboard**: Highlights events happening in the next 7 days
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

**Backend:**
- Node.js with Express.js
- SQLite database
- JWT authentication
- bcryptjs for password hashing
- node-cron for scheduled reminders

**Frontend:**
- React 18
- Axios for API communication
- CSS3 with modern styling

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm run install-deps
```

3. Create a `.env` file in the root directory:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
```

### Development

Run both backend and frontend in development mode:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend development server on http://localhost:3000

### Individual Services

Run backend only:
```bash
npm run server
```

Run frontend only:
```bash
npm run client
```

### Production Build

Build the frontend for production:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Events
- `GET /api/events` - Get all user events
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/upcoming-events` - Get events in next 7 days

## Database Schema

### Users Table
- id (PRIMARY KEY)
- username (UNIQUE)
- email (UNIQUE)
- password (hashed)
- created_at

### Events Table
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- title
- description
- event_date
- event_type
- reminder_days
- is_recurring
- created_at

## Deployment

This application is ready for deployment on platforms like:

- **Vercel**: For full-stack deployment
- **Netlify**: For frontend with serverless functions
- **Railway**: For full-stack with database
- **Heroku**: For full-stack deployment

### Environment Variables for Production

Make sure to set these environment variables in your deployment platform:
- `JWT_SECRET`: A secure random string for JWT signing
- `PORT`: Port number (usually set automatically by hosting platform)
- `NODE_ENV`: Set to "production"

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License