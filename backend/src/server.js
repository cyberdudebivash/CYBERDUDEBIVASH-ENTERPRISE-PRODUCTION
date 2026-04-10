/**
 * CYBERDUDEBIVASH® SaaS Backend — Main Server
 * src/server.js
 */
'use strict';
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const authRoutes    = require('./routes/auth');
const apiKeyRoutes  = require('./routes/apikeys');
const paymentRoutes = require('./routes/payments');
const leadRoutes    = require('./routes/leads');
const trackRoutes   = require('./routes/track');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── Security headers ── */
app.use(helmet());

/* ── CORS ── */
app.use(cors({
  origin: [
    'https://www.cyberdudebivash.com',
    'https://tools.cyberdudebivash.com',
    'https://api.cyberdudebivash.com',
    'http://localhost:3000',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

/* ── Global rate limiter (1000 req / 15 min per IP) ── */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use(globalLimiter);

/* ── Auth endpoint limiter (prevent brute force) ── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
});

/* ── Routes ── */
app.use('/auth',     authLimiter, authRoutes);
app.use('/api',      apiKeyRoutes);
app.use('/payment',  paymentRoutes);
app.use('/lead',     leadRoutes);
app.use('/track',    trackRoutes);

/* ── Health check ── */
app.get('/health', (req, res) => res.json({
  status: 'ok',
  platform: 'CYBERDUDEBIVASH SaaS API',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

/* ── 404 ── */
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

/* ── Global error handler ── */
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🛡️  CYBERDUDEBIVASH API running on port ${PORT}`);
  console.log(`    ENV: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
