/**
 * routes/payments.js — Razorpay order creation + verification
 * CYBERDUDEBIVASH® SaaS Backend
 */
const express  = require('express');
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const db       = require('../database');
const { requireAuth } = require('../middleware');
const router   = express.Router();

const PLANS = {
  starter:    { amount: 4900,  currency: 'INR', name: 'Starter',    plan_key: 'starter'    },
  pro:        { amount: 24900, currency: 'INR', name: 'Professional', plan_key: 'pro'       },
  enterprise: { amount: 82900, currency: 'INR', name: 'Enterprise',  plan_key: 'enterprise' }
};

function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// POST /create-order
// Body: { plan: 'starter' | 'pro' | 'enterprise' }
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan. Choose: starter, pro, enterprise' });

    const rz = getRazorpay();
    const planDef = PLANS[plan];

    const order = await rz.orders.create({
      amount:   planDef.amount,
      currency: planDef.currency,
      receipt:  `cdb_${req.user.id}_${Date.now()}`,
      notes:    { user_id: String(req.user.id), plan }
    });

    db.prepare(
      'INSERT INTO payments (user_id, razorpay_order, plan, amount, currency, status) VALUES (?,?,?,?,?,?)'
    ).run(req.user.id, order.id, plan, planDef.amount, planDef.currency, 'created');

    return res.json({
      order_id:   order.id,
      amount:     planDef.amount,
      currency:   planDef.currency,
      plan:       plan,
      key_id:     process.env.RAZORPAY_KEY_ID,
      prefill: {
        email: req.user.email,
        name:  req.user.name || ''
      }
    });
  } catch (err) {
    console.error('Create order error:', err.message);
    return res.status(500).json({ error: 'Payment initiation failed', detail: err.message });
  }
});

// POST /verify-payment
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
router.post('/verify-payment', requireAuth, (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ error: 'Missing payment verification fields' });

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature)
      return res.status(400).json({ error: 'Payment signature verification failed' });

    const payment = db.prepare('SELECT * FROM payments WHERE razorpay_order=?').get(razorpay_order_id);
    if (!payment) return res.status(404).json({ error: 'Order not found' });

    // Update payment record
    db.prepare(
      'UPDATE payments SET razorpay_pay_id=?, status=? WHERE razorpay_order=?'
    ).run(razorpay_payment_id, 'paid', razorpay_order_id);

    // Upgrade user plan
    db.prepare('UPDATE users SET plan=?, updated_at=strftime(\'%s\',\'now\') WHERE id=?')
      .run(payment.plan, payment.user_id);

    return res.json({ success: true, message: 'Payment verified. Plan upgraded!', plan: payment.plan });
  } catch (err) {
    console.error('Verify payment error:', err.message);
    return res.status(500).json({ error: 'Payment verification failed' });
  }
});

// GET /payment-history
router.get('/payment-history', requireAuth, (req, res) => {
  const payments = db.prepare(
    'SELECT razorpay_order, plan, amount, currency, status, created_at FROM payments WHERE user_id=? ORDER BY created_at DESC'
  ).all(req.user.id);
  return res.json({ payments });
});

module.exports = router;
