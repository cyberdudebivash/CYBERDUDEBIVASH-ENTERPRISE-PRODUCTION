/**
 * routes/apikeys.js — API Key management + usage stats
 * CYBERDUDEBIVASH® SaaS Backend
 */
const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const db       = require('../database');
const { requireAuth, requireApiKey, PLAN_LIMITS } = require('../middleware');
const router   = express.Router();

// POST /generate-api-key
router.post('/generate-api-key', requireAuth, (req, res) => {
  const active = db.apiKeys.activeForUser(req.user.id);
  if (active.length >= 5) return res.status(400).json({ error: 'Maximum 5 active API keys per account' });
  const apiKey = 'cdb_' + uuidv4().replace(/-/g,'');
  db.apiKeys.insert(req.user.id, apiKey);
  return res.status(201).json({ api_key: apiKey, message: 'Store this key securely.' });
});

// GET /api-keys
router.get('/api-keys', requireAuth, (req, res) => {
  const keys = db.apiKeys.forUser(req.user.id);
  return res.json({ api_keys: keys });
});

// DELETE /api-keys/:id
router.delete('/api-keys/:id', requireAuth, (req, res) => {
  const ok = db.apiKeys.revoke(parseInt(req.params.id), req.user.id);
  if (!ok) return res.status(404).json({ error: 'Key not found or unauthorized' });
  return res.json({ message: 'API key revoked' });
});

// GET /api-usage
router.get('/api-usage', requireAuth, (req, res) => {
  const user  = db.users.findById(req.user.id);
  const plan  = user ? user.plan : 'free';
  const limit = PLAN_LIMITS[plan] || 100;
  const stats = db.apiUsage.statsForUser(req.user.id);
  return res.json({ plan, limit, usage: stats });
});

// GET /api/validate  — API-key protected test endpoint
router.get('/api/validate', requireApiKey, (req, res) => {
  return res.json({
    status:      'valid',
    plan:        req.apiUser.plan,
    usage_today: req.apiUser.used,
    limit_today: req.apiUser.limit,
    remaining:   req.apiUser.limit === Infinity ? 'unlimited' : req.apiUser.limit - req.apiUser.used
  });
});

module.exports = router;
