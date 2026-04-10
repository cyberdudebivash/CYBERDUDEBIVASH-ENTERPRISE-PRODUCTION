/**
 * routes/auth.js — Register, Login, Profile
 * CYBERDUDEBIVASH® SaaS Backend
 */
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db       = require('../database');
const { requireAuth } = require('../middleware');
const router   = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { name='', email='', password='' } = req.body;
    if (!email || !password)       return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8)       return res.status(400).json({ error: 'Password must be 8+ characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
    if (db.users.findByEmail(email)) return res.status(409).json({ error: 'Email already registered' });

    const hash   = await bcrypt.hash(password, 12);
    const user   = db.users.insert(name.trim(), email, hash);
    const token  = signToken(user);
    const apiKey = 'cdb_' + uuidv4().replace(/-/g,'');
    db.apiKeys.insert(user.id, apiKey);

    return res.status(201).json({
      token,
      api_key: apiKey,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan }
    });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email='', password='' } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = db.users.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safeUser } = user;
  const keys  = db.apiKeys.activeForUser(user.id);
  const usage = db.apiUsage.statsForUser(user.id);
  return res.json({ user: safeUser, api_keys: keys, usage });
});

module.exports = router;
