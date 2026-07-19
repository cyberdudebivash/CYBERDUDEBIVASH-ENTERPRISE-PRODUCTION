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

    db.leads.insert(name.trim(), email.toLowerCase(), company.trim(), company_size, message.trim(), source);

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
    db.events.insert(user_id || null, event_type, payload, ip);

    return res.status(201).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to track event' });
  }
});

// GET /analytics — admin stats summary
router.get('/analytics', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const users = db.data.users.length;
    const leads = db.data.leads.length;
    const revenue = db.data.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const topEvents = db.events.topTypes();
    
    // Plan distribution aggregation
    const planMap = {};
    db.data.users.forEach(u => { planMap[u.plan] = (planMap[u.plan]||0)+1; });
    const planDist = Object.entries(planMap).map(([p,c]) => ({ plan: p, cnt: c }));

    // Recent leads
    const recentLeads = db.leads.all().slice(0, 20).map(l => ({ name: l.name, email: l.email, company: l.company, source: l.source, created_at: l.created_at }));

    return res.json({ 
      users, 
      leads, 
      revenue_inr: (revenue / 100).toFixed(2), // Convert from paise to rupees
      top_events: topEvents, 
      plan_distribution: planDist, 
      recent_leads: recentLeads 
    });
  } catch (err) {
    console.error('Analytics error:', err.message);
    return res.status(500).json({ error: 'Failed to aggregate analytics data' });
  }
});

// POST /newsletter/subscribe
router.post('/newsletter/subscribe', (req, res) => {
  try {
    const { email='' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

    db.subscribers.insert(email.trim().toLowerCase());
    return res.status(201).json({ success: true, message: 'Successfully subscribed to CTI alerts.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save subscription' });
  }
});

module.exports = router;
