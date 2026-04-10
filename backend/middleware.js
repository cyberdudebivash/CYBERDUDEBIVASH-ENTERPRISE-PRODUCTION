/**
 * middleware.js — JWT auth + API key validation + rate limiting
 * CYBERDUDEBIVASH® SaaS Backend
 */
const jwt = require('jsonwebtoken');
const db  = require('./database');

const PLAN_LIMITS = {
  free:       100,
  starter:    1000,
  pro:        10000,
  enterprise: Infinity
};

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key) return res.status(401).json({ error: 'Missing X-Api-Key header' });

  const record = db.apiKeys.findByKey(key);
  if (!record) return res.status(401).json({ error: 'Invalid or revoked API key' });

  const used  = db.apiUsage.countToday(key);
  const limit = PLAN_LIMITS[record.plan] || 100;

  if (used >= limit) {
    return res.status(429).json({
      error:   'Daily API limit reached',
      plan:    record.plan,
      limit,
      used,
      upgrade: 'https://www.cyberdudebivash.com/pricing.html'
    });
  }

  db.apiUsage.insert(record.user_id, key, req.path);
  req.apiUser = { userId: record.user_id, plan: record.plan, used: used + 1, limit };
  next();
}

module.exports = { requireAuth, requireApiKey, PLAN_LIMITS };
