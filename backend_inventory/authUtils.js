// frontend/src/utils/authUtils.js

// API base URL - update this with your backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Login with password only
 * @param {string} password - User password
 * @returns {Promise<Object>} Response with token and user data
 */
export const login = async (password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
};

/**
 * Logout - removes token from localStorage
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Get stored token
 * @returns {string|null} JWT token
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Get stored user data
 * @returns {Object|null} User object
 */
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Verify token with backend
 * @returns {Promise<boolean>}
 */
export const verifyToken = async () => {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
};

/**
 * Create authenticated fetch wrapper
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export const authenticatedFetch = async (url, options = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  // If unauthorized, clear token and redirect to login
  if (response.status === 401) {
    logout();
    window.location.href = '/';
  }

  return response;
};