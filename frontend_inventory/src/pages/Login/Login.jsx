// frontend/src/pages/Login/Login.jsx
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import './Login.css';
import splash from '../../assets/images/TagEase_logo.png';

const Login = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email) {
        throw new Error('Please enter an email address');
      }

      // Call your API endpoint for login (sends email + password)
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // Some responses (404, empty) may not contain valid JSON. Read as text first
      // and attempt to parse. This prevents `Unexpected end of JSON input`.
      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          // Non-JSON response – capture raw text for debugging
          data = { message: text };
        }
      }

      if (!response.ok) {
        // Surface helpful message for server-side errors (5xx)
        if (response.status >= 500) {
          const serverMsg = (data && data.message) ? `: ${data.message}` : '';
          throw new Error(`Server error${serverMsg} (status ${response.status})`);
        }
        throw new Error((data && data.message) || `Login failed (status ${response.status})`);
      }

      // Store JWT token in localStorage
      // localStorage.setItem('token', data.token);
      
      // Optionally store user info
      // if (data.user) {
      //   localStorage.setItem('user', JSON.stringify(data.user));
      // }

      // Call parent callback if provided
      if (onLogin) {
        onLogin(data);
      }

      // Reset form
      setPassword('');
      setEmail('');
      
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login">
      <div className="login-container">
        <div className="login-content">
          {/* Left Side - Branding */}
          <div className="login-branding">
            <div className="branding-content">
              <div className="brand-logo-container">
                <img 
                  src={splash} 
                  alt="TagEase Logo" 
                  className="brand-logo-image" 
                />
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="login-form-section">
            <div className="login-form-container">
              <div className="login-header">
                <h2 className="login-title">Welcome!</h2>
                <p className="login-subtitle">Input your login credentials</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                {error && (
                  <div className="error-message">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="form-input"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="form-input"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="password-toggle"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-login" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Login'}
                </button>
                
                <a href="#" className="forgot-link">
                  Forgot Password?
                </a>


              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;