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
  starter:    { amount: 4900 * 100,  currency: 'INR', name: 'Starter',    plan_key: 'starter'    },
  pro:        { amount: 24900 * 100, currency: 'INR', name: 'Professional', plan_key: 'pro'       },
  enterprise: { amount: 82900 * 100, currency: 'INR', name: 'Enterprise',  plan_key: 'enterprise' }
};

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    console.warn("⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured in .env. Falling back to sandbox.");
  }
  return new Razorpay({
    key_id:     key_id || 'rzp_test_mock',
    key_secret: key_secret || 'mock_secret'
  });
}

// POST /create-order
// Body: { plan: 'starter' | 'pro' | 'enterprise' }
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan. Choose: starter, pro, enterprise' });

    const planDef = PLANS[plan];
    const key_id = process.env.RAZORPAY_KEY_ID;

    // Standard fallback response for sandbox mode if key is missing or is sandbox key
    if (!key_id || key_id === 'rzp_test_mock') {
      const mockOrder = {
        id: `order_mock_${Math.floor(Math.random() * 1000000)}`,
        amount: planDef.amount,
        currency: planDef.currency
      };
      
      db.payments.insert(req.user.id, mockOrder.id, plan, planDef.amount, planDef.currency);

      return res.json({
        order_id:   mockOrder.id,
        amount:     planDef.amount,
        currency:   planDef.currency,
        plan:       plan,
        key_id:     'rzp_test_mock',
        prefill: {
          email: req.user.email,
          name:  req.user.name || ''
        }
      });
    }

    const rz = getRazorpay();
    const order = await rz.orders.create({
      amount:   planDef.amount,
      currency: planDef.currency,
      receipt:  `cdb_${req.user.id}_${Date.now()}`,
      notes:    { user_id: String(req.user.id), plan }
    });

    db.payments.insert(req.user.id, order.id, plan, planDef.amount, planDef.currency);

    return res.json({
      order_id:   order.id,
      amount:     planDef.amount,
      currency:   planDef.currency,
      plan:       plan,
      key_id:     key_id,
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id)
      return res.status(400).json({ error: 'Missing payment verification fields' });

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const isMock = razorpay_order_id.startsWith('order_mock_');

    if (!isMock && key_secret) {
      if (!razorpay_signature) return res.status(400).json({ error: 'Missing signature for verification' });
      
      const expected = crypto
        .createHmac('sha256', key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expected !== razorpay_signature)
        return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    const payment = db.payments.findByOrder(razorpay_order_id);
    if (!payment) return res.status(404).json({ error: 'Order not found' });

    // Update payment record in database
    db.payments.verify(razorpay_order_id, razorpay_payment_id);

    // Upgrade user plan
    db.users.updatePlan(payment.user_id, payment.plan);

    return res.json({ success: true, message: 'Payment verified. Plan upgraded!', plan: payment.plan });
  } catch (err) {
    console.error('Verify payment error:', err.message);
    return res.status(500).json({ error: 'Payment verification failed' });
  }
});

// GET /payment-history
router.get('/payment-history', requireAuth, (req, res) => {
  try {
    const payments = db.payments.forUser(req.user.id);
    return res.json({ payments });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve payment history' });
  }
});

module.exports = router;
