/**
 * CYBERDUDEBIVASH® SaaS Backend
 * In-memory data store (swap with PostgreSQL/MongoDB in production)
 * src/store.js
 */

const store = {
  users: [],       // { id, email, passwordHash, plan, createdAt, apiKey, usageToday, usageReset }
  leads: [],       // { id, name, email, company, companySize, createdAt, source }
  events: [],      // { id, userId, event, meta, timestamp }
  orders: [],      // { id, userId, orderId, plan, amount, status, createdAt }
};

const PLANS = {
  free:         { label: 'Free',         dailyLimit: 100,    priceINR: 0      },
  starter:      { label: 'Starter',      dailyLimit: 1000,   priceINR: 4067   },
  professional: { label: 'Professional', dailyLimit: 10000,  priceINR: 24899  },
  enterprise:   { label: 'Enterprise',   dailyLimit: 999999, priceINR: 83170  },
};

module.exports = { store, PLANS };
