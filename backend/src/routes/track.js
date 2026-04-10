/**
 * Click / Event Tracking
 * POST /track
 * GET  /track/stats
 * src/routes/track.js
 */
'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');

const router = express.Router();

const VALID_EVENTS = [
  'tool_click', 'api_click', 'threat_intel_click', 'pricing_click',
  'lead_form_view', 'lead_form_submit', 'portal_click', 'cta_click',
  'page_view', 'plan_upgrade_click', 'blog_click', 'ai_hub_click',
];

/**
 * POST /track
 * Body: { event, meta? }
 * Header: X-API-Key (optional — tracks per-user if provided)
 */
router.post('/', (req, res) => {
  const { event, meta } = req.body;
  if (!event) return res.status(400).json({ error: 'event is required' });
  if (!VALID_EVENTS.includes(event))
    return res.status(400).json({ error: 'Unknown event type', valid: VALID_EVENTS });

  const apiKey = req.headers['x-api-key'];
  const user   = apiKey ? store.users.find(u => u.apiKey === apiKey) : null;

  store.events.push({
    id:        uuidv4(),
    userId:    user ? user.id : 'anonymous',
    event,
    meta:      meta || {},
    ip:        req.ip,
    userAgent: req.headers['user-agent'] || '',
    timestamp: new Date().toISOString(),
  });

  return res.json({ tracked: true });
});

/**
 * GET /track/stats
 * Returns aggregated event counts
 */
router.get('/stats', (req, res) => {
  const counts = {};
  store.events.forEach(e => {
    counts[e.event] = (counts[e.event] || 0) + 1;
  });
  return res.json({
    total:  store.events.length,
    events: counts,
    users:  store.users.length,
    leads:  store.leads.length,
  });
});

module.exports = router;
