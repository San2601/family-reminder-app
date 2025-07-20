import React, { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load components for better performance
const Login = lazy(() => import('./components/Login'));
const Dashboard = lazy(() => import('./components/Dashboard'));

// Configure API URL - use localhost in development, relative in production
const API_URL = process.env.NODE_ENV === 'development' 
  ? process.env.REACT_APP_API_URL || 'http://localhost:5000'
  : '';

if (API_URL) {
  axios.defaults.baseURL = API_URL;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <Loader2 className="loading-icon" size={40} />
          <h2>Loading Family Reminders...</h2>
          <p>Getting everything ready for you</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Suspense fallback={
          <div className="loading-container">
            <div className="loading-content">
              <Loader2 className="loading-icon" size={40} />
              <h2>Loading...</h2>
            </div>
          </div>
        }>
          {user ? (
            <Dashboard user={user} onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} />
          )}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;