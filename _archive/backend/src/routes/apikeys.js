/**
 * API Key Management + Usage Routes
 * POST /api/generate-api-key
 * GET  /api/api-usage
 * GET  /api/test            ← authenticated API call demo
 * src/routes/apikeys.js
 */
'use strict';
const express = require('express');
const crypto  = require('crypto');
const { store, PLANS } = require('../store');
const { requireAuth, requireApiKey } = require('../middleware/auth');

const router = express.Router();

function makeApiKey() {
  return 'cbd_' + crypto.randomBytes(24).toString('hex');
}

/**
 * POST /api/generate-api-key
 * Header: Authorization: Bearer <token>
 * Regenerates API key for authenticated user
 */
router.post('/generate-api-key', requireAuth, (req, res) => {
  req.user.apiKey = makeApiKey();
  return res.json({
    apiKey: req.user.apiKey,
    message: 'New API key generated. Keep it secret.',
  });
});

/**
 * GET /api/api-usage
 * Header: Authorization: Bearer <token>
 * Returns current usage stats for authenticated user
 */
router.get('/api-usage', requireAuth, (req, res) => {
  const plan  = PLANS[req.user.plan] || PLANS.free;
  const today = new Date().toDateString();
  if (req.user.usageReset !== today) {
    req.user.usageToday = 0;
    req.user.usageReset = today;
  }
  return res.json({
    plan:        req.user.plan,
    planLabel:   plan.label,
    dailyLimit:  plan.dailyLimit,
    usedToday:   req.user.usageToday,
    remaining:   Math.max(0, plan.dailyLimit - req.user.usageToday),
    resetAt:     'midnight UTC',
    upgradeUrl:  'https://www.cyberdudebivash.com/pricing.html',
  });
});

/**
 * GET /api/test
 * Header: X-API-Key: cbd_xxx
 * Demo authenticated API call — increments usage counter
 */
router.get('/test', requireApiKey, (req, res) => {
  return res.json({
    status: 'authenticated',
    user:   req.user.email,
    plan:   req.user.plan,
    usedToday: req.user.usageToday,
    message: '🛡️ CYBERDUDEBIVASH API — authentication successful',
  });
});

module.exports = router;
