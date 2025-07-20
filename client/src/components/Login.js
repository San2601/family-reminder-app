import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogIn, UserPlus, Mail, Lock, User, Calendar, Eye, EyeOff } from 'lucide-react';

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved credentials on component mount - SECURITY FIX: only email, not password
  useEffect(() => {
    const savedCredentials = localStorage.getItem('savedCredentials');
    if (savedCredentials) {
      try {
        const { email, remember } = JSON.parse(savedCredentials);
        setFormData(prev => ({ ...prev, email })); // Only load email, not password
        setRememberMe(remember || false);
      } catch (error) {
        // Clear invalid saved data
        localStorage.removeItem('savedCredentials');
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const data = isLogin 
        ? { email: formData.email, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password };

      const response = await axios.post(endpoint, data);
      
      // SECURITY FIX: Only save email, never store passwords in localStorage
      if (isLogin && rememberMe) {
        localStorage.setItem('savedCredentials', JSON.stringify({
          email: formData.email,
          remember: true
          // REMOVED: password storage - NEVER store passwords in localStorage!
        }));
      } else if (isLogin && !rememberMe) {
        // Remove saved credentials if Remember Me is unchecked
        localStorage.removeItem('savedCredentials');
      }
      
      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="illustration-container">
          <div className="main-icon">
            <Calendar size={48} />
          </div>
          <div className="floating-element floating-element-1"></div>
          <div className="floating-element floating-element-2"></div>
          <div className="floating-element floating-element-3"></div>
        </div>
        
        <div className="auth-header">
          <div className="auth-greeting">
            {isLogin ? 'Welcome back' : 'Hi'}
          </div>
          <div className="auth-task-count">
            {isLogin ? 'Sign in to continue' : 'Create your account to get started'}
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {!isLogin && (
          <div className="form-group">
            <label htmlFor="username">
              <User size={16} />
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              required={!isLogin}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
            />
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="email">
            <Mail size={16} />
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            inputMode="email"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">
            <Lock size={16} />
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        {isLogin && (
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: 'auto', margin: '0 8px 0 0' }}
              />
              Remember my login credentials
            </label>
          </div>
        )}
        
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
          {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
        </button>
        
        <div className="auth-switch">
          <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;