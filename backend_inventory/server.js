const jwt = require('jsonwebtoken');
const express = require('express');
const dotenv = require('dotenv');

// Load .env when present
dotenv.config();

const app = express();
const router = express.Router();

const PORT = process.env.PORT || 5174;
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'your-password';

app.use(express.json());

// Login endpoint
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  // Lightweight request logging for debugging login issues (no secrets in long-term logs)
  try {
    console.log('[login] attempt', {
      ip: req.ip,
      // only log lengths to avoid accidental secret leaks
      usernameLength: typeof username === 'string' ? username.length : null,
      passwordLength: typeof password === 'string' ? password.length : null,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
      time: new Date().toISOString(),
    });
  } catch (logErr) {
    // ignore logging errors
  }

  if (!username) {
    return res.status(400).json({ message: 'Missing username in request body' });
  }

  if (!password) {
    return res.status(400).json({ message: 'Missing password in request body' });
  }

    // Accept only 'Admin' username for now
    if (username !== 'Admin') {
      return res.status(401).json({ message: 'Only Admin is allowed to login' });
    }

  if (password === MASTER_PASSWORD) {
    const token = jwt.sign(
      { authenticated: true, timestamp: Date.now() },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { name: username }
    });
  } else {
    res.status(401).json({ message: 'Invalid password' });
  }
});

// Verify token endpoint (optional)
router.get('/auth/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ valid: false });
  }

  try {
    jwt.verify(token, SECRET_KEY);
    res.json({ valid: true });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

// Mount API routes under /api
app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

// Export app for testing if needed
module.exports = app;