/**
 * Auth Routes — Register / Login / Me
 * POST /auth/register
 * POST /auth/login
 * GET  /auth/me
 * src/routes/auth.js
 */
'use strict';
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto   = require('crypto');
const { store, PLANS } = require('../store');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET  = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

/* ── Helper: generate API key ── */
function makeApiKey() {
  return 'cbd_' + crypto.randomBytes(24).toString('hex');
}

/* ── Helper: sign token ── */
function signToken(id) {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/* ── Helper: safe user (strip password) ── */
function safeUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

/**
 * POST /auth/register
 * Body: { name, email, password }
 * Response: { token, user }
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email, password are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email format' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (store.users.find(u => u.email === email.toLowerCase()))
      return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id:           uuidv4(),
      name:         name.trim(),
      email:        email.toLowerCase().trim(),
      passwordHash,
      plan:         'free',
      apiKey:       makeApiKey(),
      usageToday:   0,
      usageReset:   new Date().toDateString(),
      createdAt:    new Date().toISOString(),
    };
    store.users.push(user);

    return res.status(201).json({
      token: signToken(user.id),
      user:  safeUser(user),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 * Response: { token, user }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    const user = store.users.find(u => u.email === email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    return res.json({
      token: signToken(user.id),
      user:  safeUser(user),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /auth/me
 * Header: Authorization: Bearer <token>
 * Response: { user, planDetails }
 */
router.get('/me', requireAuth, (req, res) => {
  const user = safeUser(req.user);
  const planDetails = PLANS[user.plan] || PLANS.free;
  return res.json({ user, planDetails });
});

module.exports = router;
