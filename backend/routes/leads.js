/**
 * routes/leads.js — Lead capture + analytics events
 * CYBERDUDEBIVASH® SaaS Backend
 */
const express = require('express');
const db      = require('../database');
const router  = express.Router();

// POST /lead
router.post('/lead', (req, res) => {
  try {
    const { name='', email='', company='', company_size='', message='', source='homepage' } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

    db.prepare(
      'INSERT INTO leads (name, email, company, company_size, message, source) VALUES (?,?,?,?,?,?)'
    ).run(name.trim(), email.toLowerCase(), company.trim(), company_size, message.trim(), source);

    return res.status(201).json({ success: true, message: 'Lead captured. Team will contact you within 24 hours.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save lead' });
  }
});

// POST /track-event
router.post('/track-event', (req, res) => {
  try {
    const { event_type='', payload={}, user_id=null } = req.body;
    if (!event_type) return res.status(400).json({ error: 'event_type required' });

    const ip = req.headers['x-forwarded-for'] || req.ip || '';
    db.prepare(
      'INSERT INTO events (user_id, event_type, payload, ip) VALUES (?,?,?,?)'
    ).run(user_id || null, event_type, JSON.stringify(payload), String(ip).slice(0, 64));

    return res.status(201).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to track event' });
  }
});

// GET /analytics — admin stats summary
router.get('/analytics', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });

  const users   = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const leads   = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
  const revenue = db.prepare('SELECT SUM(amount) as s FROM payments WHERE status=\'paid\'').get().s || 0;
  const topEvents = db.prepare(
    'SELECT event_type, COUNT(*) as cnt FROM events GROUP BY event_type ORDER BY cnt DESC LIMIT 10'
  ).all();
  const planDist = db.prepare(
    'SELECT plan, COUNT(*) as cnt FROM users GROUP BY plan'
  ).all();
  const recentLeads = db.prepare(
    'SELECT name, email, company, source, created_at FROM leads ORDER BY created_at DESC LIMIT 20'
  ).all();

  return res.json({ users, leads, revenue_inr: revenue, top_events: topEvents, plan_distribution: planDist, recent_leads: recentLeads });
});

module.exports = router;
