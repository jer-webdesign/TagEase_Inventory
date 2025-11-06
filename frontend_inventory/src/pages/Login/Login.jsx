// frontend/src/pages/Login/Login.jsx
import React, { useState } from 'react';
import { Package, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import './Login.css';
import splash from '../../assets/images/TagEase_transparent.png';

const Login = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!username) {
        throw new Error('Please enter a username');
      }

      // Client-side guard: only allow Admin username to proceed
      if (username !== 'Admin') {
        throw new Error('Only Admin can login');
      }

      // Call your API endpoint for login (sends username + password)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      // Some responses (404, empty) may not contain valid JSON. Read as text first
      // and attempt to parse. This prevents `Unexpected end of JSON input`.
      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          // Non-JSON response — capture raw text for debugging
          data = { message: text };
        }
      }

      if (!response.ok) {
        throw new Error((data && data.message) || `Login failed (status ${response.status})`);
      }

      // Store JWT token in localStorage
      localStorage.setItem('token', data.token);
      
      // Optionally store user info
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Call parent callback if provided
      if (onLogin) {
        onLogin(data);
      }

      // Reset form
  setPassword('');
  setUsername('');
      
    } catch (err) {
      setError(err.message || 'Invalid password. Please try again.');
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
              <img src={splash} style={{ paddingLeft: '3rem', width: '25%', align: 'center' }} alt="TagEase splash" className="login-splash" />
              {/* <div className="brand-logo-large">
                <Package size={32} />
              </div> */}
              <h1 className="brand-title">TagEase</h1>
              <p className="brand-subtitle">
                Tag, Thrust, and Track
              </p>
              <div className="brand-features">
                <div className="brand-feature">
                  <div className="feature-check">✓</div>
                  {/* <span>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris</span> */}
                  <span>Simplifying inventory management</span>
                </div>
                <div className="brand-feature">
                  <div className="feature-check">✓</div>
                  {/* <span>Natus error sit voluptatem accusantium doloremque laudantium totam rem ape</span> */}
                  <span>Real-time asset tracking</span>
                </div>
                <div className="brand-feature">
                  <div className="feature-check">✓</div>
                    {/* <span>Mollit anim id est laborum lorem ipsum dolor sit amet</span>  */}
                    <span>Optimize workflow efficiency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="login-form-section">
            <div className="login-form-container">
              <div className="login-header">
                <h2 className="login-title">Welcome to TagEase</h2>
                <p className="login-subtitle">Enter your password to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                {error && (
                  <div className="error-message">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="username" className="form-label">
                    Username
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="form-input"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="input-wrapper">
                    <Lock size={20} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="form-input"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="password-toggle"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-login" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              {/* <div className="login-footer">
                <p className="help-text">
                  Need help accessing your account? Contact support.
                </p>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;