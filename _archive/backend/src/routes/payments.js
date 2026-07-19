/**
 * Razorpay Payment Routes
 * POST /payment/create-order
 * POST /payment/verify-payment
 * POST /payment/webhook
 * src/routes/payments.js
 */
'use strict';
const express  = require('express');
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const { v4: uuidv4 } = require('uuid');
const { store, PLANS } = require('../store');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

const PLAN_PRICES = {
  starter:      { amountINR: 4067,  label: 'Starter — $49/mo'      },
  professional: { amountINR: 24899, label: 'Professional — $299/mo' },
  enterprise:   { amountINR: 83170, label: 'Enterprise — $999/mo'   },
};

/**
 * POST /payment/create-order
 * Header: Authorization: Bearer <token>
 * Body:   { plan: 'starter' | 'professional' | 'enterprise' }
 * Response: { orderId, amount, currency, keyId }
 */
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLAN_PRICES[plan])
      return res.status(400).json({ error: 'Invalid plan. Choose: starter, professional, enterprise' });

    const planData = PLAN_PRICES[plan];
    const options = {
      amount:   planData.amountINR * 100, // paise
      currency: 'INR',
      receipt:  `cbd_${req.user.id.slice(0,8)}_${Date.now()}`,
      notes: {
        userId: req.user.id,
        email:  req.user.email,
        plan,
      },
    };

    const order = await razorpay.orders.create(options);

    store.orders.push({
      id:        uuidv4(),
      userId:    req.user.id,
      orderId:   order.id,
      plan,
      amount:    planData.amountINR,
      status:    'pending',
      createdAt: new Date().toISOString(),
    });

    return res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
      planLabel: planData.label,
    });
  } catch (err) {
    console.error('[PAYMENT] create-order error:', err.message);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
});

/**
 * POST /payment/verify-payment
 * Header: Authorization: Bearer <token>
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }
 */
router.post('/verify-payment', requireAuth, (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan)
      return res.status(400).json({ error: 'Missing payment verification fields' });

    // Verify HMAC signature
    const body      = razorpay_order_id + '|' + razorpay_payment_id;
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature)
      return res.status(400).json({ error: 'Payment signature verification failed' });

    // Upgrade user plan
    const user = store.users.find(u => u.id === req.user.id);
    if (user) user.plan = plan;

    // Update order status
    const order = store.orders.find(o => o.orderId === razorpay_order_id);
    if (order) { order.status = 'paid'; order.paymentId = razorpay_payment_id; }

    return res.json({
      success: true,
      plan,
      message: `✅ Payment verified. Your plan is now upgraded to ${plan.toUpperCase()}.`,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Payment verification error' });
  }
});

/**
 * POST /payment/webhook
 * Razorpay webhook (set secret in Razorpay dashboard)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const webhookSecret = process.env.RAZORPAY_KEY_SECRET || '';
  const signature     = req.headers['x-razorpay-signature'];
  const body          = req.body.toString();

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  if (expected !== signature)
    return res.status(400).json({ error: 'Invalid webhook signature' });

  const event = JSON.parse(body);
  if (event.event === 'payment.captured') {
    const notes  = event.payload.payment.entity.notes || {};
    const userId = notes.userId;
    const plan   = notes.plan;
    if (userId && plan) {
      const user = store.users.find(u => u.id === userId);
      if (user) user.plan = plan;
    }
  }
  return res.json({ received: true });
});

module.exports = router;
