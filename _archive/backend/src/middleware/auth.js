/**
 * JWT Authentication Middleware
 * src/middleware/auth.js
 */
'use strict';
const jwt   = require('jsonwebtoken');
const { store } = require('../store');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const user = store.users.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * API Key Authentication Middleware
 * Validates X-API-Key header and enforces plan rate limits
 */
function requireApiKey(req, res, next) {
  const { PLANS } = require('../store');
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'Missing X-API-Key header' });

  const user = store.users.find(u => u.apiKey === key);
  if (!user) return res.status(401).json({ error: 'Invalid API key' });

  // Reset daily counter if new day
  const today = new Date().toDateString();
  if (user.usageReset !== today) {
    user.usageToday = 0;
    user.usageReset = today;
  }

  const plan  = PLANS[user.plan] || PLANS.free;
  if (user.usageToday >= plan.dailyLimit) {
    return res.status(429).json({
      error: 'Daily API limit reached',
      limit: plan.dailyLimit,
      plan: user.plan,
      upgradeUrl: 'https://www.cyberdudebivash.com/pricing.html',
    });
  }

  user.usageToday += 1;
  req.user = user;
  next();
}

module.exports = { requireAuth, requireApiKey };
