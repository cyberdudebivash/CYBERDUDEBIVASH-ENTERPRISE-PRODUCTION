/**
 * Lead Capture
 * POST /lead
 * src/routes/leads.js
 */
'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');

const router = express.Router();

/**
 * POST /lead
 * Body: { name, email, company?, companySize?, source? }
 */
router.post('/', (req, res) => {
  const { name, email, company, companySize, source } = req.body;
  if (!name || !email)
    return res.status(400).json({ error: 'name and email are required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email' });

  // Deduplicate
  const exists = store.leads.find(l => l.email === email.toLowerCase());
  if (exists) return res.json({ success: true, message: 'Lead already captured' });

  store.leads.push({
    id:          uuidv4(),
    name:        name.trim(),
    email:       email.toLowerCase().trim(),
    company:     company || '',
    companySize: companySize || '',
    source:      source || 'homepage',
    createdAt:   new Date().toISOString(),
  });

  return res.status(201).json({
    success: true,
    message: 'Assessment request received. Our team will contact you within 24 hours.',
  });
});

/**
 * GET /lead/count  (admin stats, no auth for demo — add requireAuth in production)
 */
router.get('/count', (req, res) => {
  return res.json({ total: store.leads.length });
});

module.exports = router;
