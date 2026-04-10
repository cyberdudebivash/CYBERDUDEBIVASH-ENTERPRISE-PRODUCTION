/**
 * CYBERDUDEBIVASH® SaaS Backend — server.js
 * Production Express API server
 * © 2026 CYBERDUDEBIVASH Pvt. Ltd.
 *
 * ENDPOINTS:
 *   POST   /auth/register
 *   POST   /auth/login
 *   GET    /auth/me
 *   POST   /generate-api-key
 *   GET    /api-keys
 *   DELETE /api-keys/:id
 *   GET    /api-usage
 *   GET    /api/validate          (API key protected)
 *   POST   /create-order
 *   POST   /verify-payment
 *   GET    /payment-history
 *   POST   /lead
 *   POST   /track-event
 *   GET    /analytics             (admin secret protected)
 *   GET    /health
 */
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const app = express();

// ===== SECURITY MIDDLEWARE =====
app.use(helmet());
app.set('trust proxy', 1);

app.use(cors({
  origin: [
    'https://www.cyberdudebivash.com',
    'https://cyberdudebivash.com',
    'https://tools.cyberdudebivash.com',
    'https://api.cyberdudebivash.com',
    'https://intel.cyberdudebivash.com',
    'https://cyberdudebivash.in',
    'http://localhost:3000',
    'http://localhost:5500'
  ],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Api-Key','X-Admin-Secret'],
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));

// Global rate limiter — 200 req/15min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests from this IP. Please wait.' }
}));

// Strict limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' }
});

// ===== ROUTES =====
app.use('/auth',  authLimiter, require('./routes/auth'));
app.use('/',      require('./routes/apikeys'));
app.use('/',      require('./routes/payments'));
app.use('/',      require('./routes/leads'));

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CYBERDUDEBIVASH API', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ===== 404 =====
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🛡️  CYBERDUDEBIVASH® SaaS Backend running on port ${PORT}`);
  console.log(`    Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;
